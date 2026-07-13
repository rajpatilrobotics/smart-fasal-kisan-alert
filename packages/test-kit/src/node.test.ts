import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { loadSyntheticScenario } from './node';

describe('loadSyntheticScenario', () => {
  it('loads the committed versioned foundation manifest', async () => {
    const path = resolve(
      import.meta.dirname,
      '../../../tests/fixtures/scenarios/foundation-v1.json',
    );

    await expect(loadSyntheticScenario(path)).resolves.toMatchObject({
      dataMode: 'simulated',
      environment: 'local',
      scenarioId: 'foundation-v1',
    });
  });
});
