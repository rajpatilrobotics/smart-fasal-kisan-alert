import { describe, expect, it } from 'vitest';

import { isHealthContract, parseSyntheticScenario } from './index';

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
    expect(
      parseSyntheticScenario({
        schemaVersion: '1.0',
        scenarioId: 'foundation',
        description: 'No-personal-data environment check',
        frozenTime: '2026-07-13T00:00:00.000Z',
        locale: 'mr-IN',
        environment: 'local',
        dataMode: 'simulated',
        adapters: { hardware: 'unavailable', provider: 'sink' },
        allowedDestinations: [],
        expectedEvents: [],
        fixtures: {},
      }),
    ).toMatchObject({ scenarioId: 'foundation' });
  });

  it('rejects an unlabelled fixture object', () => {
    expect(() => parseSyntheticScenario({ fixtures: {} })).toThrow();
  });

  it.each([
    null,
    { fixtures: {} },
    {
      adapters: { hardware: 'live', provider: 'sink' },
      allowedDestinations: [],
      dataMode: 'simulated',
      description: 'description',
      environment: 'local',
      expectedEvents: [],
      fixtures: {},
      frozenTime: '2026-07-13T00:00:00.000Z',
      locale: 'mr-IN',
      scenarioId: 'scenario',
      schemaVersion: '1.0',
    },
  ])('rejects malformed scenarios %#', (scenario) => {
    expect(() => parseSyntheticScenario(scenario)).toThrow();
  });
});
