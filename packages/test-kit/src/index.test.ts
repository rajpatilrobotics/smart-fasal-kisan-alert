import { describe, expect, it } from 'vitest';

import { isHealthContract, parseSyntheticScenario } from './index';

const validScenario = {
  adapters: { hardware: 'unavailable', provider: 'sink' },
  allowedDestinations: [],
  dataMode: 'simulated',
  description: 'No-personal-data environment check',
  environment: 'local',
  expectedEvents: [],
  fixtures: {},
  frozenTime: '2026-07-13T00:00:00.000Z',
  locale: 'mr-IN',
  scenarioId: 'foundation',
  schemaVersion: '1.0',
};

describe('isHealthContract', () => {
  it('accepts the platform health shape', () => {
    expect(
      isHealthContract({
        service: 'domain-api',
        status: 'ok',
        timestamp: '2026-07-13T00:00:00.000Z',
      }),
    ).toBe(true);
  });

  it('rejects incomplete or invalid payloads', () => {
    expect(isHealthContract(null)).toBe(false);
    expect(isHealthContract({ service: 'domain-api', status: 'unknown', timestamp: 'never' })).toBe(
      false,
    );
    expect(
      isHealthContract({
        extra: 'not allowed by the canonical schema',
        service: 'domain-api',
        status: 'ok',
        timestamp: '2026-07-13T00:00:00.000Z',
      }),
    ).toBe(false);
  });
});

describe('parseSyntheticScenario', () => {
  it('accepts explicitly synthetic fixture maps', () => {
    expect(parseSyntheticScenario(validScenario)).toMatchObject({ scenarioId: 'foundation' });
  });

  it('rejects an unlabelled fixture object', () => {
    expect(() => parseSyntheticScenario({ fixtures: {} })).toThrow();
  });

  it.each([
    ['a null root', null],
    ['an array root', []],
    ['an unknown field', { ...validScenario, unexpected: true }],
    ['an incorrect schema version', { ...validScenario, schemaVersion: '2.0' }],
    ['a non-string scenario id', { ...validScenario, scenarioId: 42 }],
    ['an empty scenario id', { ...validScenario, scenarioId: ' ' }],
    ['a non-string description', { ...validScenario, description: 42 }],
    ['an empty description', { ...validScenario, description: ' ' }],
    ['a non-string frozen time', { ...validScenario, frozenTime: 42 }],
    ['a non-UTC frozen time', { ...validScenario, frozenTime: '2026-07-13' }],
    ['an invalid UTC frozen time', { ...validScenario, frozenTime: 'not-a-dateZ' }],
    ['an unsupported locale', { ...validScenario, locale: 'fr-FR' }],
    ['an unsupported environment', { ...validScenario, environment: 'production' }],
    ['an unsupported data mode', { ...validScenario, dataMode: 'live' }],
    ['missing adapter modes', { ...validScenario, adapters: null }],
    [
      'an unsupported hardware adapter',
      { ...validScenario, adapters: { hardware: 'live', provider: 'sink' } },
    ],
    [
      'an unsupported provider adapter',
      { ...validScenario, adapters: { hardware: 'simulated', provider: 'live' } },
    ],
    ['non-string destinations', { ...validScenario, allowedDestinations: [42] }],
    ['non-array expected events', { ...validScenario, expectedEvents: null }],
    ['non-object fixtures', { ...validScenario, fixtures: [] }],
  ])('rejects %s', (_name, scenario) => {
    expect(() => parseSyntheticScenario(scenario)).toThrow();
  });
});
