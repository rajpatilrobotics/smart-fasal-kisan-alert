import { createHash, randomUUID } from 'node:crypto';

import type {
  AdvisoryResultResponse,
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

export interface AdvisoryEvidence extends AgronomyEvidence {
  numericValue?: number;
  observedAt?: string;
  limitation?: string;
}

export interface AdvisoryCropContext {
  cropName: string;
  cropStage: 'GERMINATION' | 'VEGETATIVE' | 'FLOWERING' | 'FRUITING' | 'HARVEST' | 'UNKNOWN';
  sowingDate: string;
  irrigationAvailable: boolean;
  recentIrrigationAt?: string;
}

export interface AdvisoryInput {
  advisoryId: string;
  alertId: string;
  taskId?: string;
  plotId: string;
  generatedAt: string;
  activeFrom: string;
  expiresAt: string;
  ruleSetVersion: string;
  evidence: readonly AdvisoryEvidence[];
  crop: AdvisoryCropContext;
  previousActiveAdvisory?: Pick<AdvisoryResultResponse, 'advisoryId' | 'deduplicationKey'>;
  shadowRiskScore?: { modelVersion: string; score: number };
}

type AdvisorySignalKey =
  | 'rainfallForecast48hMm'
  | 'rainfallHistory7dMm'
  | 'drySpellDays'
  | 'soilMoisturePct'
  | 'npkDeficitScore'
  | 'phStressScore'
  | 'heatIndexC'
  | 'humidityPct'
  | 'windKmph'
  | 'waterloggingIndex'
  | 'sensorAgeHours'
  | 'vegetationStressIndex';

function signal(input: AdvisoryInput, key: AdvisorySignalKey): AdvisoryEvidence | undefined {
  return input.evidence.find(
    (record) =>
      record.metricKey === key &&
      record.decisionEligible &&
      record.rights === 'MODEL_INPUT_ALLOWED' &&
      record.quality !== 'DO_NOT_USE' &&
      record.state !== 'DO_NOT_USE' &&
      record.numericValue !== undefined,
  );
}

function signalValue(input: AdvisoryInput, key: AdvisorySignalKey): number | undefined {
  return signal(input, key)?.numericValue;
}

function deriveAdvisoryMode(evidence: readonly AdvisoryEvidence[]): DataMode {
  if (evidence.some((record) => record.dataMode === 'SIMULATED')) return 'SIMULATED';
  if (evidence.some((record) => record.dataMode === 'RECORDED')) return 'RECORDED';
  return 'LIVE';
}

function clampScore(value: number): number {
  return Math.round(Math.max(0, Math.min(100, value)) * 100) / 100;
}

function advisoryChecksum(input: AdvisoryInput): `sha256:${string}` {
  return `sha256:${createHash('sha256').update(JSON.stringify(input)).digest('hex')}`;
}

function advisoryEvidenceRefs(input: AdvisoryInput): AdvisoryResultResponse['evidenceRefs'] {
  return input.evidence
    .filter((record) => record.decisionEligible)
    .slice(0, 16)
    .map((record) => ({
      evidenceId: record.evidenceId,
      metricKey: record.metricKey,
      sourceName: record.sourceName,
      freshness: record.freshness,
      quality: record.quality,
      dataMode: record.dataMode,
      ...(record.observedAt === undefined ? {} : { observedAt: record.observedAt }),
      ...(record.limitation === undefined ? {} : { limitation: record.limitation }),
    }));
}

function evidenceConfidence(evidence: readonly AdvisoryEvidence[]): number {
  const usable = evidence.filter((record) => record.decisionEligible);
  if (usable.length === 0) return 0;
  const freshness =
    usable.filter((record) => record.freshness === 'CURRENT').length / usable.length;
  const trusted = usable.filter((record) => record.quality === 'TRUSTED').length / usable.length;
  const modePenalty = usable.some((record) => record.dataMode === 'SIMULATED')
    ? 10
    : usable.some((record) => record.dataMode === 'RECORDED')
      ? 4
      : 0;
  return clampScore(freshness * 45 + trusted * 45 + Math.min(usable.length, 6) * 4 - modePenalty);
}

function limitations(input: AdvisoryInput): string[] {
  const output = input.evidence
    .filter(
      (record) =>
        record.freshness !== 'CURRENT' ||
        record.quality !== 'TRUSTED' ||
        record.state === 'MISSING' ||
        record.state === 'UNKNOWN',
    )
    .map((record) => record.limitation ?? `${record.sourceName} is ${record.freshness}.`);
  if (input.shadowRiskScore !== undefined) {
    output.push(
      `Shadow ML score ${input.shadowRiskScore.modelVersion} was logged for review and did not drive the decision.`,
    );
  }
  return [...new Set(output)].slice(0, 8);
}

function baseAdvisory(
  input: AdvisoryInput,
  selected: Omit<
    AdvisoryResultResponse,
    | 'advisoryId'
    | 'plotId'
    | 'lifecycleState'
    | 'generatedAt'
    | 'activeFrom'
    | 'expiresAt'
    | 'dataMode'
    | 'resultVersion'
    | 'etagRevision'
    | 'snapshotChecksum'
    | 'ruleSetVersion'
    | 'evidenceRefs'
    | 'limitations'
    | 'deduplicationKey'
    | 'alert'
    | 'taskId'
  >,
): AdvisoryResultResponse {
  const deduplicationKey = `${input.plotId}:${selected.kind}:${selected.severity}:${selected.recommendedAction.actionKind}`;
  const lifecycleState =
    input.previousActiveAdvisory?.deduplicationKey === deduplicationKey ? 'DEDUPLICATED' : 'ACTIVE';
  return {
    advisoryId: input.advisoryId,
    plotId: input.plotId,
    lifecycleState,
    generatedAt: input.generatedAt,
    activeFrom: input.activeFrom,
    expiresAt: input.expiresAt,
    dataMode: deriveAdvisoryMode(input.evidence),
    resultVersion: 1,
    etagRevision: 1,
    snapshotChecksum: advisoryChecksum(input),
    ruleSetVersion: input.ruleSetVersion,
    evidenceRefs: advisoryEvidenceRefs(input),
    limitations: limitations(input),
    deduplicationKey,
    ...(input.previousActiveAdvisory?.deduplicationKey === deduplicationKey
      ? { supersedesAdvisoryId: input.previousActiveAdvisory.advisoryId }
      : {}),
    ...(input.taskId === undefined ? {} : { taskId: input.taskId }),
    alert: {
      alertId: input.alertId,
      lifecycleState: lifecycleState === 'DEDUPLICATED' ? 'RESOLVED' : 'ACTIVE',
      channel: 'IN_APP',
    },
    ...selected,
  };
}

export function evaluateAdvisory(input: AdvisoryInput): AdvisoryResultResponse {
  const rain48 = signalValue(input, 'rainfallForecast48hMm');
  const rain7 = signalValue(input, 'rainfallHistory7dMm');
  const dryDays = signalValue(input, 'drySpellDays');
  const moisture = signalValue(input, 'soilMoisturePct');
  const heat = signalValue(input, 'heatIndexC');
  const humidity = signalValue(input, 'humidityPct');
  const wind = signalValue(input, 'windKmph');
  const waterlogging = signalValue(input, 'waterloggingIndex');
  const npk = signalValue(input, 'npkDeficitScore');
  const ph = signalValue(input, 'phStressScore');
  const sensorAge = signalValue(input, 'sensorAgeHours');
  const vegetationStress = signalValue(input, 'vegetationStressIndex');
  const confidenceScore = evidenceConfidence(input.evidence);

  if (sensorAge !== undefined && sensorAge >= 24) {
    return baseAdvisory(input, {
      kind: 'SENSOR_EVIDENCE_PROBLEM',
      severity: sensorAge >= 72 ? 'ACTION' : 'WATCH',
      urgency: 'TODAY',
      riskScore: clampScore(Math.min(100, 45 + sensorAge / 2)),
      confidenceScore,
      title: 'Live sensor evidence is unavailable',
      summary: 'Recent live sensor readings are stale, so irrigation advice should be checked.',
      recommendedAction: {
        actionKind: 'CHECK_SENSOR',
        label: 'Check the sensor or use recorded/manual evidence',
        timingLabel: 'Today',
        cannotDoAlternative: 'Use the weather and soil record labels with caution.',
      },
      why: [
        {
          code: 'SENSOR_STALE',
          label: `Latest sensor signal is ${String(sensorAge)} hours old.`,
          contribution: 0.7,
        },
        {
          code: 'LIVE_UNAVAILABLE',
          label: 'LIVE evidence is not decision-current.',
          contribution: 0.3,
        },
      ],
    });
  }

  if (rain48 !== undefined && rain48 >= 18 && moisture !== undefined && moisture >= 22) {
    return baseAdvisory(input, {
      kind: 'IRRIGATION_DELAY_RAIN_EXPECTED',
      severity: 'WATCH',
      urgency: 'NEXT_24_HOURS',
      riskScore: clampScore(55 + rain48),
      confidenceScore,
      title: 'Rain is expected, delay irrigation',
      summary: 'The plot has enough moisture now and rain is expected soon.',
      recommendedAction: {
        actionKind: 'DELAY_IRRIGATION',
        label: 'Delay irrigation and review after rainfall',
        timingLabel: 'Wait for the next 24 to 48 hours',
      },
      why: [
        {
          code: 'RAIN_EXPECTED',
          label: `${String(rain48)} mm rain forecast in 48 hours.`,
          contribution: 0.55,
        },
        {
          code: 'MOISTURE_NOT_LOW',
          label: `Soil moisture is ${String(moisture)}%.`,
          contribution: 0.45,
        },
      ],
    });
  }

  const dryRisk =
    ((dryDays ?? 0) >= 5 ? 30 : 0) +
    ((rain7 ?? 0) <= 8 ? 18 : 0) +
    ((rain48 ?? 0) <= 5 ? 20 : 0) +
    ((moisture ?? 100) < 18 ? 24 : 0) +
    ((heat ?? 0) >= 38 ? 8 : 0);
  if (dryRisk >= 50 && moisture !== undefined) {
    return baseAdvisory(input, {
      kind: moisture < 18 ? 'IRRIGATION_NEEDED' : 'DRY_SPELL_RISK',
      severity: dryRisk >= 75 ? 'ACTION' : 'WATCH',
      urgency: dryRisk >= 75 ? 'TODAY' : 'NEXT_24_HOURS',
      riskScore: clampScore(dryRisk),
      confidenceScore,
      title: moisture < 18 ? 'Irrigation is needed' : 'Dry spell risk is rising',
      summary:
        moisture < 18
          ? 'Low soil moisture and a dry forecast point to irrigation need.'
          : 'Rainfall signals show a developing dry spell.',
      recommendedAction: {
        actionKind: 'IRRIGATE',
        label: input.crop.irrigationAvailable
          ? 'Irrigate the plot carefully'
          : 'Arrange water or ask RSK for local options',
        timingLabel: dryRisk >= 75 ? 'Today, preferably morning or evening' : 'Within 24 hours',
        cannotDoAlternative: 'If water is not available, mulch and monitor crop stress.',
      },
      why: [
        {
          code: 'DRY_SPELL_DAYS',
          label: `${String(dryDays ?? 0)} dry-spell days detected.`,
          contribution: 0.3,
        },
        {
          code: 'LOW_FORECAST_RAIN',
          label: `${String(rain48 ?? 0)} mm rain forecast in 48 hours.`,
          contribution: 0.25,
        },
        {
          code: 'LOW_SOIL_MOISTURE',
          label: `Soil moisture is ${String(moisture)}%.`,
          contribution: 0.35,
        },
        {
          code: 'CROP_STAGE',
          label: `${input.crop.cropName} is at ${input.crop.cropStage} stage.`,
          contribution: 0.1,
        },
      ],
    });
  }

  if ((waterlogging ?? 0) >= 60 || (rain48 !== undefined && rain48 >= 65)) {
    return baseAdvisory(input, {
      kind: 'HEAVY_RAIN_WATERLOGGING_RISK',
      severity: 'URGENT',
      urgency: 'TODAY',
      riskScore: clampScore(Math.max(waterlogging ?? 0, rain48 ?? 0)),
      confidenceScore,
      title: 'Heavy rain and waterlogging risk',
      summary: 'Forecast or Earth observation signals show waterlogging risk for this plot.',
      recommendedAction: {
        actionKind: 'PROTECT_CROP',
        label: 'Clear drainage and avoid irrigation',
        timingLabel: 'Before the next heavy shower',
      },
      why: [
        {
          code: 'HEAVY_RAIN',
          label: `${String(rain48 ?? 0)} mm rain forecast in 48 hours.`,
          contribution: 0.55,
        },
        {
          code: 'WATERLOGGING_SIGNAL',
          label: `Waterlogging index is ${String(waterlogging ?? 0)}.`,
          contribution: 0.45,
        },
      ],
    });
  }

  if ((heat ?? 0) >= 40 || (humidity !== undefined && humidity >= 88) || (wind ?? 0) >= 45) {
    return baseAdvisory(input, {
      kind: 'HEAT_HUMIDITY_WEATHER_RISK',
      severity: (heat ?? 0) >= 42 || (wind ?? 0) >= 55 ? 'URGENT' : 'WATCH',
      urgency: 'TODAY',
      riskScore: clampScore(Math.max((heat ?? 0) * 1.7, humidity ?? 0, wind ?? 0)),
      confidenceScore,
      title: 'Weather stress risk',
      summary: 'Heat, humidity or strong weather can stress the crop and field work.',
      recommendedAction: {
        actionKind: 'MONITOR',
        label: 'Avoid field work in peak heat and monitor crop stress',
        timingLabel: 'Today',
      },
      why: [
        {
          code: 'HEAT_INDEX',
          label: `Heat index is ${String(heat ?? 0)}°C.`,
          contribution: 0.45,
        },
        { code: 'HUMIDITY', label: `Humidity is ${String(humidity ?? 0)}%.`, contribution: 0.3 },
        { code: 'WIND', label: `Wind signal is ${String(wind ?? 0)} km/h.`, contribution: 0.25 },
      ],
    });
  }

  if ((npk ?? 0) >= 55 || (ph ?? 0) >= 55) {
    return baseAdvisory(input, {
      kind: 'NUTRIENT_PH_GUIDANCE',
      severity: 'WATCH',
      urgency: 'NEXT_2_TO_3_DAYS',
      riskScore: clampScore(Math.max(npk ?? 0, ph ?? 0, vegetationStress ?? 0)),
      confidenceScore,
      title: 'Cautious nutrient guidance',
      summary: 'Soil and crop-stage signals suggest checking nutrient or pH correction timing.',
      recommendedAction: {
        actionKind: 'APPLY_NUTRIENT_WITH_CAUTION',
        label: 'Use only locally reviewed nutrient guidance',
        timingLabel: 'After checking soil record and crop stage',
        cannotDoAlternative: 'Ask RSK before applying any exact quantity.',
      },
      why: [
        {
          code: 'NPK_TREND',
          label: `NPK deficit trend score is ${String(npk ?? 0)}.`,
          contribution: 0.45,
        },
        { code: 'PH_STRESS', label: `pH stress score is ${String(ph ?? 0)}.`, contribution: 0.35 },
        {
          code: 'STAGE_SAFE',
          label: `${input.crop.cropStage} stage allows cautious review.`,
          contribution: 0.2,
        },
      ],
    });
  }

  return baseAdvisory(input, {
    kind: 'DRY_SPELL_RISK',
    severity: 'INFO',
    urgency: 'WHEN_POSSIBLE',
    riskScore: clampScore(Math.max(dryRisk, vegetationStress ?? 0)),
    confidenceScore,
    title: 'No urgent advisory',
    summary: 'Current evidence does not cross an action threshold.',
    recommendedAction: {
      actionKind: 'MONITOR',
      label: 'Continue monitoring plot conditions',
      timingLabel: 'Review tomorrow',
    },
    why: [
      { code: 'BELOW_THRESHOLD', label: 'Signals are below action threshold.', contribution: 1 },
    ],
  });
}
