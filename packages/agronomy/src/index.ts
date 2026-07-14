import { createHash, randomUUID } from 'node:crypto';

import type {
  RecommendationCandidate,
  RecommendationResultResponse,
} from '@smart-fasal/contracts/schemas';

export type DataMode = 'LIVE' | 'RECORDED' | 'SIMULATED';
export type GateOutcome = 'PASS' | 'FAIL' | 'UNKNOWN_BLOCKING' | 'NOT_APPLICABLE';
export type EvidenceState =
  'KNOWN' | 'UNKNOWN' | 'MISSING' | 'PROXY' | 'CONFLICTING' | 'DO_NOT_USE';

export interface AgronomyEvidence {
  evidenceId: string;
  metricKey: string;
  state: EvidenceState;
  score?: number;
  dataMode: DataMode;
  quality: 'TRUSTED' | 'USE_WITH_CAUTION' | 'TREND_ONLY' | 'DO_NOT_USE';
  freshness: 'CURRENT' | 'DATA_IS_OLD' | 'NO_RECENT_DATA' | 'UNAVAILABLE';
  sourceName: string;
  decisionEligible: boolean;
  rights: 'MODEL_INPUT_ALLOWED' | 'DISPLAY_ONLY' | 'EXPIRED';
}

export interface CropProfile {
  cropProfileId: string;
  cropName: string;
  supportedSeasonKeys: readonly string[];
  supportedMethods: readonly string[];
  durationDays: number;
  waterNeed: 'LOW' | 'MEDIUM' | 'HIGH';
  regionalValidationScore: number;
  componentScores: {
    soil: number;
    water: number;
    weather: number;
    season: number;
    satellite: number;
    local: number;
  };
  reasons: readonly string[];
  risks: readonly string[];
}

export interface RecommendationInput {
  recommendationId?: string;
  plotId: string;
  planningSeasonKey: string;
  cultivationMethod: string;
  generatedAt: string;
  expiresAt: string;
  ruleSetVersion: string;
  profileSetVersion: string;
  templateSetVersion: string;
  evidence: readonly AgronomyEvidence[];
  cropProfiles: readonly CropProfile[];
}

const SCALE = 1_000_000n;
const COMPONENT_WEIGHTS = {
  soil: 30n,
  water: 25n,
  weather: 20n,
  season: 10n,
  satellite: 10n,
  local: 5n,
} as const;
const CONFIDENCE_WEIGHTS = {
  completeness: 30n,
  quality: 25n,
  freshness: 20n,
  agreement: 15n,
  regional: 10n,
} as const;

function fixedScore(value: number): bigint {
  if (!Number.isFinite(value)) throw new TypeError('Score must be finite.');
  const bounded = Math.max(0, Math.min(100, value));
  return BigInt(Math.round(bounded * Number(SCALE)));
}

function displayScore(score: bigint): number {
  return Number(score / 10_000n) / 100;
}

function weightedScore(parts: Readonly<Record<keyof typeof COMPONENT_WEIGHTS, number>>): bigint {
  return (
    (fixedScore(parts.soil) * COMPONENT_WEIGHTS.soil +
      fixedScore(parts.water) * COMPONENT_WEIGHTS.water +
      fixedScore(parts.weather) * COMPONENT_WEIGHTS.weather +
      fixedScore(parts.season) * COMPONENT_WEIGHTS.season +
      fixedScore(parts.satellite) * COMPONENT_WEIGHTS.satellite +
      fixedScore(parts.local) * COMPONENT_WEIGHTS.local) /
    100n
  );
}

function checksum(input: unknown): `sha256:${string}` {
  return `sha256:${createHash('sha256').update(JSON.stringify(input)).digest('hex')}`;
}

function deriveMode(evidence: readonly AgronomyEvidence[]): DataMode {
  if (evidence.some((record) => record.dataMode === 'SIMULATED')) return 'SIMULATED';
  if (evidence.some((record) => record.dataMode === 'RECORDED')) return 'RECORDED';
  return 'LIVE';
}

function confidence(profile: CropProfile, evidence: readonly AgronomyEvidence[]): bigint {
  const usable = evidence.filter(
    (record) => record.decisionEligible && record.rights === 'MODEL_INPUT_ALLOWED',
  );
  const completeness = usable.length === 0 ? 0 : Math.min(100, (usable.length / 6) * 100);
  const quality =
    usable.length === 0
      ? 0
      : (usable.filter((record) => record.quality === 'TRUSTED').length / usable.length) * 100;
  const freshness =
    usable.length === 0
      ? 0
      : (usable.filter((record) => record.freshness === 'CURRENT').length / usable.length) * 100;
  const agreement = usable.some((record) => record.state === 'CONFLICTING') ? 35 : 90;
  return (
    (fixedScore(completeness) * CONFIDENCE_WEIGHTS.completeness +
      fixedScore(quality) * CONFIDENCE_WEIGHTS.quality +
      fixedScore(freshness) * CONFIDENCE_WEIGHTS.freshness +
      fixedScore(agreement) * CONFIDENCE_WEIGHTS.agreement +
      fixedScore(profile.regionalValidationScore) * CONFIDENCE_WEIGHTS.regional) /
    100n
  );
}

function evaluateGates(input: RecommendationInput, profile: CropProfile) {
  const gateResults: { gateKey: string; outcome: GateOutcome; reason: string }[] = [];
  const push = (gateKey: string, outcome: GateOutcome, reason: string) =>
    gateResults.push({ gateKey, outcome, reason });

  push(
    'PROFILE_SEASON_SUPPORTED',
    profile.supportedSeasonKeys.includes(input.planningSeasonKey) ? 'PASS' : 'FAIL',
    profile.supportedSeasonKeys.includes(input.planningSeasonKey)
      ? 'Crop profile supports this planning season.'
      : 'Crop profile does not support this planning season.',
  );
  push(
    'PROFILE_METHOD_SUPPORTED',
    profile.supportedMethods.includes(input.cultivationMethod) ? 'PASS' : 'FAIL',
    profile.supportedMethods.includes(input.cultivationMethod)
      ? 'Crop profile supports this cultivation method.'
      : 'Crop profile does not support this cultivation method.',
  );
  const invalidSource = input.evidence.find(
    (record) => record.decisionEligible && record.rights !== 'MODEL_INPUT_ALLOWED',
  );
  push(
    'SOURCE_RIGHTS_OR_VERSION_INVALID',
    invalidSource === undefined ? 'PASS' : 'UNKNOWN_BLOCKING',
    invalidSource === undefined
      ? 'All decision evidence has model-input rights.'
      : `${invalidSource.sourceName} cannot be used for a crop decision.`,
  );
  const unusable = input.evidence.find(
    (record) =>
      record.decisionEligible &&
      (record.quality === 'DO_NOT_USE' ||
        record.state === 'DO_NOT_USE' ||
        record.state === 'CONFLICTING'),
  );
  push(
    'CRITICAL_EVIDENCE_USABLE',
    unusable === undefined ? 'PASS' : 'UNKNOWN_BLOCKING',
    unusable === undefined
      ? 'No critical evidence is marked unusable.'
      : `${unusable.metricKey} needs review before recommendation.`,
  );
  const waterScore = profile.componentScores.water;
  push(
    'WATER_COMPATIBILITY',
    profile.waterNeed === 'HIGH' && waterScore < 60 ? 'FAIL' : 'PASS',
    profile.waterNeed === 'HIGH' && waterScore < 60
      ? 'High-water crop is not safe for the available water context.'
      : 'Water context is compatible with this crop.',
  );

  return gateResults;
}

export function recommendCrops(input: RecommendationInput): RecommendationResultResponse {
  const eligibleEvidence = input.evidence.filter(
    (record) =>
      record.decisionEligible &&
      record.freshness !== 'UNAVAILABLE' &&
      record.state !== 'UNKNOWN' &&
      record.state !== 'MISSING',
  );
  if (eligibleEvidence.length === 0) {
    return {
      recommendationId: input.recommendationId ?? randomUUID(),
      plotId: input.plotId,
      state: 'NEEDS_INPUT',
      generatedAt: input.generatedAt,
      expiresAt: input.expiresAt,
      dataMode: deriveMode(input.evidence),
      resultVersion: 1,
      etagRevision: 1,
      snapshotChecksum: checksum(input),
      ruleSetVersion: input.ruleSetVersion,
      profileSetVersion: input.profileSetVersion,
      templateSetVersion: input.templateSetVersion,
      candidates: [],
      blockers: ['Decision-ready soil, water or weather evidence is missing.'],
      excluded: [],
      modeExplanation: 'No decision was made because required evidence is missing.',
      comparisonRows: [],
    };
  }

  const evaluated = input.cropProfiles.map((profile) => {
    const gates = evaluateGates(input, profile);
    const blocked = gates.some(
      (gate) => gate.outcome === 'FAIL' || gate.outcome === 'UNKNOWN_BLOCKING',
    );
    return {
      profile,
      gates,
      blocked,
      suitability: weightedScore(profile.componentScores),
      confidence: confidence(profile, eligibleEvidence),
    };
  });
  const winners = evaluated
    .filter((candidate) => !candidate.blocked)
    .sort((left, right) => {
      if (left.suitability !== right.suitability)
        return left.suitability > right.suitability ? -1 : 1;
      if (left.profile.componentScores.water !== right.profile.componentScores.water) {
        return right.profile.componentScores.water - left.profile.componentScores.water;
      }
      if (left.profile.componentScores.season !== right.profile.componentScores.season) {
        return right.profile.componentScores.season - left.profile.componentScores.season;
      }
      return left.profile.cropProfileId.localeCompare(right.profile.cropProfileId);
    })
    .slice(0, 3);

  if (winners.length === 0) {
    return {
      recommendationId: input.recommendationId ?? randomUUID(),
      plotId: input.plotId,
      state: 'NO_SAFE_RESULT',
      generatedAt: input.generatedAt,
      expiresAt: input.expiresAt,
      dataMode: deriveMode(eligibleEvidence),
      resultVersion: 1,
      etagRevision: 1,
      snapshotChecksum: checksum(input),
      ruleSetVersion: input.ruleSetVersion,
      profileSetVersion: input.profileSetVersion,
      templateSetVersion: input.templateSetVersion,
      candidates: [],
      blockers: ['All candidate crops failed at least one hard safety gate.'],
      excluded: evaluated.flatMap((item) =>
        item.gates.map((gate) => ({ cropProfileId: item.profile.cropProfileId, ...gate })),
      ),
      modeExplanation: 'No crop is shown because the complete evaluation found no safe result.',
      comparisonRows: [],
    };
  }

  const candidates: RecommendationCandidate[] = winners.map((winner, index) => ({
    candidateId: randomUUID(),
    cropProfileId: winner.profile.cropProfileId,
    cropName: winner.profile.cropName,
    rank: index + 1,
    suitabilityScore: displayScore(winner.suitability),
    confidenceScore: displayScore(winner.confidence),
    waterSafetyScore: winner.profile.componentScores.water,
    seasonFitScore: winner.profile.componentScores.season,
    durationDays: winner.profile.durationDays,
    reasons: winner.profile.reasons.slice(0, 3),
    risks: winner.profile.risks.slice(0, 3),
    warnings:
      winner.profile.waterNeed === 'HIGH' ? ['Needs reliable water through the season.'] : [],
    evidenceRefs: eligibleEvidence.slice(0, 12).map((record) => ({
      evidenceId: record.evidenceId,
      metricKey: record.metricKey,
      sourceName: record.sourceName,
      freshness: record.freshness,
      quality: record.quality,
      dataMode: record.dataMode,
    })),
  }));

  return {
    recommendationId: input.recommendationId ?? randomUUID(),
    plotId: input.plotId,
    state: 'READY',
    generatedAt: input.generatedAt,
    expiresAt: input.expiresAt,
    dataMode: deriveMode(eligibleEvidence),
    resultVersion: 1,
    etagRevision: 1,
    snapshotChecksum: checksum(input),
    ruleSetVersion: input.ruleSetVersion,
    profileSetVersion: input.profileSetVersion,
    templateSetVersion: input.templateSetVersion,
    candidates,
    blockers: [],
    excluded: evaluated
      .filter((item) => item.blocked)
      .flatMap((item) =>
        item.gates.map((gate) => ({ cropProfileId: item.profile.cropProfileId, ...gate })),
      ),
    modeExplanation: `Decision mode is ${deriveMode(eligibleEvidence)} from server-derived evidence.`,
    comparisonRows: ['soil', 'water', 'weather', 'season', 'satellite', 'local'].map((key) => ({
      key,
      label: key.charAt(0).toUpperCase() + key.slice(1),
      values: Object.fromEntries(
        candidates.map((candidate) => [
          candidate.cropProfileId,
          String(
            input.cropProfiles.find((profile) => profile.cropProfileId === candidate.cropProfileId)
              ?.componentScores[key as keyof CropProfile['componentScores']] ?? 0,
          ),
        ]),
      ),
    })),
  };
}

export interface ExplanationValidationInput {
  stored: RecommendationResultResponse;
  proposed: Pick<RecommendationResultResponse, 'candidates' | 'dataMode' | 'blockers'>;
}

export function validateModelExplanation(input: ExplanationValidationInput): boolean {
  return (
    input.stored.dataMode === input.proposed.dataMode &&
    JSON.stringify(input.stored.blockers) === JSON.stringify(input.proposed.blockers) &&
    JSON.stringify(
      input.stored.candidates.map((candidate) => ({
        cropProfileId: candidate.cropProfileId,
        rank: candidate.rank,
        suitabilityScore: candidate.suitabilityScore,
        confidenceScore: candidate.confidenceScore,
        warnings: candidate.warnings,
      })),
    ) ===
      JSON.stringify(
        input.proposed.candidates.map((candidate) => ({
          cropProfileId: candidate.cropProfileId,
          rank: candidate.rank,
          suitabilityScore: candidate.suitabilityScore,
          confidenceScore: candidate.confidenceScore,
          warnings: candidate.warnings,
        })),
      )
  );
}
