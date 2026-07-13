import { readFile } from 'node:fs/promises';

import { parseSyntheticScenario, type SyntheticScenario } from './index';

export async function loadSyntheticScenario(path: string | URL): Promise<SyntheticScenario> {
  const source = await readFile(path, 'utf8');
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch (error) {
    throw new TypeError('Scenario manifest must contain valid JSON', { cause: error });
  }
  return parseSyntheticScenario(value);
}
