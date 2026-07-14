import { describe, expect, it } from 'vitest';

import { recommendCrops, validateModelExplanation, type RecommendationInput } from './index.js';

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
