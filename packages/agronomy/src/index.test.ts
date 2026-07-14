import { describe, expect, it } from 'vitest';

import {
  evaluateAdvisory,
  recommendCrops,
  validateModelExplanation,
  type AdvisoryInput,
  type RecommendationInput,
} from './index.js';

const baseInput: RecommendationInput = {
  recommendationId: '11111111-1111-4111-8111-111111111111',
  plotId: '22222222-2222-4222-8222-222222222222',
  planningSeasonKey: 'kharif-raigad',
  cultivationMethod: 'TRADITIONAL',
  generatedAt: '2026-07-14T00:00:00.000+05:30',
  expiresAt: '2026-07-21T00:00:00.000+05:30',
  ruleSetVersion: 'raigad-rules-v1',
  profileSetVersion: 'raigad-profiles-v1',
  templateSetVersion: 'raigad-calendar-v1',
  evidence: [
    {
      evidenceId: '33333333-3333-4333-8333-333333333333',
      metricKey: 'soil.ph',
      state: 'KNOWN',
      dataMode: 'SIMULATED',
      quality: 'TRUSTED',
      freshness: 'CURRENT',
      sourceName: 'Raigad demo soil pack',
      decisionEligible: true,
      rights: 'MODEL_INPUT_ALLOWED',
    },
    {
      evidenceId: '44444444-4444-4444-8444-444444444444',
      metricKey: 'water.availability',
      state: 'KNOWN',
      dataMode: 'SIMULATED',
      quality: 'TRUSTED',
      freshness: 'CURRENT',
      sourceName: 'Raigad demo water pack',
      decisionEligible: true,
      rights: 'MODEL_INPUT_ALLOWED',
    },
  ],
  cropProfiles: [
    {
      cropProfileId: 'crop-rice-raigad-v1',
      cropName: 'Rice',
      supportedSeasonKeys: ['kharif-raigad'],
      supportedMethods: ['TRADITIONAL'],
      durationDays: 120,
      waterNeed: 'HIGH',
      regionalValidationScore: 80,
      componentScores: { soil: 82, water: 86, weather: 90, season: 92, satellite: 75, local: 80 },
      reasons: [
        'Strong kharif fit for this Plot.',
        'Water context supports paddy.',
        'Local profile has Raigad validation.',
      ],
      risks: ['Watch water continuity if monsoon breaks.'],
    },
    {
      cropProfileId: 'crop-groundnut-raigad-v1',
      cropName: 'Groundnut',
      supportedSeasonKeys: ['kharif-raigad'],
      supportedMethods: ['TRADITIONAL'],
      durationDays: 105,
      waterNeed: 'MEDIUM',
      regionalValidationScore: 72,
      componentScores: { soil: 78, water: 70, weather: 76, season: 80, satellite: 78, local: 74 },
      reasons: ['Moderate water demand.', 'Fits the planning window.'],
      risks: ['Needs review if heavy rainfall persists.'],
    },
    {
      cropProfileId: 'crop-sugarcane-raigad-v1',
      cropName: 'Sugarcane',
      supportedSeasonKeys: ['kharif-raigad'],
      supportedMethods: ['TRADITIONAL'],
      durationDays: 360,
      waterNeed: 'HIGH',
      regionalValidationScore: 50,
      componentScores: { soil: 65, water: 40, weather: 60, season: 50, satellite: 60, local: 40 },
      reasons: ['Long duration crop.'],
      risks: ['Too water intensive for this context.'],
    },
  ],
};

describe('recommendCrops', () => {
  it('ranks eligible crops deterministically and keeps confidence separate', () => {
    const result = recommendCrops(baseInput);

    expect(result.state).toBe('READY');
    expect(result.dataMode).toBe('SIMULATED');
    expect(result.candidates.map((candidate) => candidate.cropProfileId)).toEqual([
      'crop-rice-raigad-v1',
      'crop-groundnut-raigad-v1',
    ]);
    expect(result.candidates[0]?.suitabilityScore).toBeGreaterThan(
      result.candidates[1]?.suitabilityScore ?? 0,
    );
    expect(result.candidates[0]?.confidenceScore).toBeLessThanOrEqual(100);
    expect(result.excluded.some((gate) => gate.gateKey === 'WATER_COMPATIBILITY')).toBe(true);
  });

  it('blocks display-only evidence from recommendation use', () => {
    const [soilEvidence] = baseInput.evidence;
    if (soilEvidence === undefined) throw new Error('Expected demo soil evidence.');
    const result = recommendCrops({
      ...baseInput,
      evidence: [{ ...soilEvidence, rights: 'DISPLAY_ONLY' }],
    });

    expect(result.state).toBe('NO_SAFE_RESULT');
    expect(
      result.excluded.some((gate) => gate.gateKey === 'SOURCE_RIGHTS_OR_VERSION_INVALID'),
    ).toBe(true);
  });

  it('rejects model explanation changes to stored crop order or scores', () => {
    const stored = recommendCrops(baseInput);
    expect(
      validateModelExplanation({
        stored,
        proposed: {
          ...stored,
          candidates: [...stored.candidates].reverse(),
        },
      }),
    ).toBe(false);
  });
});

const advisoryBase: AdvisoryInput = {
  advisoryId: '55555555-5555-4555-8555-555555555555',
  alertId: '66666666-6666-4666-8666-666666666666',
  taskId: '77777777-7777-4777-8777-777777777777',
  plotId: baseInput.plotId,
  generatedAt: '2026-07-14T09:00:00.000+05:30',
  activeFrom: '2026-07-14T09:00:00.000+05:30',
  expiresAt: '2026-07-15T09:00:00.000+05:30',
  ruleSetVersion: 'raigad-advisory-rules-v1',
  crop: {
    cropName: 'Rice',
    cropStage: 'VEGETATIVE',
    sowingDate: '2026-06-20',
    irrigationAvailable: true,
  },
  evidence: [],
};

function advisoryEvidence(metricKey: string, numericValue: number, overrides = {}) {
  return {
    evidenceId: `88888888-8888-4888-8888-${String(Math.round(numericValue)).padStart(12, '0')}`,
    metricKey,
    numericValue,
    state: 'KNOWN' as const,
    dataMode: 'RECORDED' as const,
    quality: 'TRUSTED' as const,
    freshness: 'CURRENT' as const,
    sourceName: 'Raigad recorded advisory fixture',
    decisionEligible: true,
    rights: 'MODEL_INPUT_ALLOWED' as const,
    ...overrides,
  };
}

describe('evaluateAdvisory', () => {
  it('creates an irrigation advisory for low moisture plus dry forecast', () => {
    const result = evaluateAdvisory({
      ...advisoryBase,
      evidence: [
        advisoryEvidence('drySpellDays', 6),
        advisoryEvidence('rainfallHistory7dMm', 2),
        advisoryEvidence('rainfallForecast48hMm', 1),
        advisoryEvidence('soilMoisturePct', 12),
      ],
    });

    expect(result.kind).toBe('IRRIGATION_NEEDED');
    expect(result.lifecycleState).toBe('ACTIVE');
    expect(result.recommendedAction.actionKind).toBe('IRRIGATE');
    expect(result.why.map((reason) => reason.code)).toContain('LOW_SOIL_MOISTURE');
    expect(result.dataMode).toBe('RECORDED');
  });

  it('delays irrigation when rain is expected soon', () => {
    const result = evaluateAdvisory({
      ...advisoryBase,
      evidence: [
        advisoryEvidence('rainfallForecast48hMm', 28),
        advisoryEvidence('soilMoisturePct', 30),
      ],
    });

    expect(result.kind).toBe('IRRIGATION_DELAY_RAIN_EXPECTED');
    expect(result.recommendedAction.actionKind).toBe('DELAY_IRRIGATION');
  });

  it('keeps nutrient advice cautious and never emits an exact fertilizer amount', () => {
    const result = evaluateAdvisory({
      ...advisoryBase,
      evidence: [advisoryEvidence('npkDeficitScore', 70), advisoryEvidence('phStressScore', 45)],
    });

    expect(result.kind).toBe('NUTRIENT_PH_GUIDANCE');
    expect(result.recommendedAction.actionKind).toBe('APPLY_NUTRIENT_WITH_CAUTION');
    expect(JSON.stringify(result)).not.toMatch(/\b\d+\s?(kg|g|ml|litre|liter)\b/i);
  });

  it('warns clearly when live sensor evidence is stale', () => {
    const result = evaluateAdvisory({
      ...advisoryBase,
      evidence: [
        advisoryEvidence('sensorAgeHours', 80, {
          dataMode: 'LIVE',
          freshness: 'DATA_IS_OLD',
          limitation: 'Sensor last checked in 2026-07-11 packet.',
        }),
      ],
    });

    expect(result.kind).toBe('SENSOR_EVIDENCE_PROBLEM');
    expect(result.title).toContain('Live sensor evidence');
    expect(result.limitations).toContain('Sensor last checked in 2026-07-11 packet.');
  });

  it('deduplicates a matching active advisory and ignores shadow ML for production decision', () => {
    const first = evaluateAdvisory({
      ...advisoryBase,
      evidence: [
        advisoryEvidence('drySpellDays', 6),
        advisoryEvidence('rainfallHistory7dMm', 2),
        advisoryEvidence('rainfallForecast48hMm', 1),
        advisoryEvidence('soilMoisturePct', 12),
      ],
      shadowRiskScore: { modelVersion: 'shadow-risk-v0', score: 2 },
    });
    const second = evaluateAdvisory({
      ...advisoryBase,
      advisoryId: '99999999-9999-4999-8999-999999999999',
      evidence: [
        advisoryEvidence('drySpellDays', 6),
        advisoryEvidence('rainfallHistory7dMm', 2),
        advisoryEvidence('rainfallForecast48hMm', 1),
        advisoryEvidence('soilMoisturePct', 12),
      ],
      previousActiveAdvisory: first,
      shadowRiskScore: { modelVersion: 'shadow-risk-v0', score: 99 },
    });

    expect(first.kind).toBe(second.kind);
    expect(second.lifecycleState).toBe('DEDUPLICATED');
    expect(second.limitations.some((item) => item.includes('did not drive'))).toBe(true);
  });
});
