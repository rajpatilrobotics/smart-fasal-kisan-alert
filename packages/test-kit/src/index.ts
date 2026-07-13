export { isHealthPayload as isHealthContract } from '@smart-fasal/contracts/typescript';
export type { HealthPayload as HealthContract } from '@smart-fasal/contracts/typescript';

export type ScenarioDataMode = 'recorded' | 'simulated';
export type ScenarioEnvironment = 'demo' | 'local' | 'preview';

export interface SyntheticScenario {
  schemaVersion: '1.0';
  scenarioId: string;
  description: string;
  frozenTime: string;
  locale: 'en-IN' | 'hi-IN' | 'mr-IN';
  environment: ScenarioEnvironment;
  dataMode: ScenarioDataMode;
  adapters: {
    hardware: 'recorded' | 'simulated' | 'unavailable';
    provider: 'sandbox' | 'sink' | 'unavailable';
  };
  allowedDestinations: string[];
  expectedEvents: string[];
  fixtures: Record<string, unknown>;
}

export function parseSyntheticScenario(value: unknown): SyntheticScenario {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('Scenario must be an object');
  }

  const candidate = value as Record<string, unknown>;
  const allowedKeys = new Set([
    'adapters',
    'allowedDestinations',
    'dataMode',
    'description',
    'environment',
    'expectedEvents',
    'fixtures',
    'frozenTime',
    'locale',
    'scenarioId',
    'schemaVersion',
  ]);
  if (Object.keys(candidate).some((key) => !allowedKeys.has(key))) {
    throw new TypeError('Scenario contains an unknown field');
  }
  if (candidate['schemaVersion'] !== '1.0') {
    throw new TypeError('Scenario schemaVersion must be 1.0');
  }
  if (typeof candidate['scenarioId'] !== 'string' || candidate['scenarioId'].trim() === '') {
    throw new TypeError('Scenario requires a scenarioId');
  }
  if (typeof candidate['description'] !== 'string' || candidate['description'].trim() === '') {
    throw new TypeError('Scenario requires a description');
  }
  if (
    typeof candidate['frozenTime'] !== 'string' ||
    !candidate['frozenTime'].endsWith('Z') ||
    Number.isNaN(Date.parse(candidate['frozenTime']))
  ) {
    throw new TypeError('Scenario requires an ISO-8601 UTC frozenTime');
  }
  if (!['en-IN', 'hi-IN', 'mr-IN'].includes(String(candidate['locale']))) {
    throw new TypeError('Scenario locale is unsupported');
  }
  if (!['demo', 'local', 'preview'].includes(String(candidate['environment']))) {
    throw new TypeError('Scenario environment is unsupported');
  }
  if (!['recorded', 'simulated'].includes(String(candidate['dataMode']))) {
    throw new TypeError('Scenario dataMode must be recorded or simulated');
  }
  if (
    typeof candidate['adapters'] !== 'object' ||
    candidate['adapters'] === null ||
    Array.isArray(candidate['adapters'])
  ) {
    throw new TypeError('Scenario requires adapter modes');
  }
  const adapters = candidate['adapters'] as Record<string, unknown>;
  if (
    Object.keys(adapters).length !== 2 ||
    !['recorded', 'simulated', 'unavailable'].includes(String(adapters['hardware'])) ||
    !['sandbox', 'sink', 'unavailable'].includes(String(adapters['provider']))
  ) {
    throw new TypeError('Scenario adapter modes are invalid');
  }
  for (const key of ['allowedDestinations', 'expectedEvents'] as const) {
    const entries = candidate[key];
    if (!Array.isArray(entries) || entries.some((entry) => typeof entry !== 'string')) {
      throw new TypeError(`Scenario ${key} must be a string array`);
    }
  }
  if (
    typeof candidate['fixtures'] !== 'object' ||
    candidate['fixtures'] === null ||
    Array.isArray(candidate['fixtures'])
  ) {
    throw new TypeError('Scenario fixtures must be an object');
  }

  return {
    schemaVersion: '1.0',
    scenarioId: candidate['scenarioId'],
    description: candidate['description'],
    frozenTime: candidate['frozenTime'],
    locale: candidate['locale'] as SyntheticScenario['locale'],
    environment: candidate['environment'] as ScenarioEnvironment,
    dataMode: candidate['dataMode'] as ScenarioDataMode,
    adapters: adapters as SyntheticScenario['adapters'],
    allowedDestinations: candidate['allowedDestinations'] as string[],
    expectedEvents: candidate['expectedEvents'] as string[],
    fixtures: candidate['fixtures'] as Record<string, unknown>,
  };
}
