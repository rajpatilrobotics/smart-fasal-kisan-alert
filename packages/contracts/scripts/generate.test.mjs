import { resolve } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { assertCanonicalSource, createOutputs, generateContracts, runCli } from './generate.mjs';

const packageRoot = '/contracts';
const sourcePath = resolve(packageRoot, 'source/platform.json');
const generatedRoot = resolve(packageRoot, 'generated');
const source = {
  contractVersion: '0.1.0',
  serviceHealth: {
    livePath: '/health/live',
    readyPath: '/health/ready',
    statuses: ['ok', 'not_ready'],
  },
  events: [],
};

function createMemoryIo(initialFiles = new Map()) {
  const files = new Map(initialFiles);
  return {
    files,
    io: {
      mkdir: vi.fn(async () => undefined),
      readFile: vi.fn(async (path) => {
        if (files.has(path)) return files.get(path);
        throw Object.assign(new Error(`Missing ${path}`), { code: 'ENOENT' });
      }),
      writeFile: vi.fn(async (path, contents) => {
        files.set(path, contents);
      }),
    },
  };
}

describe('contract generator', () => {
  it('keeps the checked-in contracts synchronized with the canonical source', async () => {
    await expect(generateContracts({ checkOnly: true })).resolves.toBe(false);
  });

  it('builds every platform contract format from one canonical source', () => {
    const outputs = createOutputs(source, generatedRoot);

    expect(outputs).toHaveLength(8);
    expect(
      JSON.parse(outputs.get(resolve(generatedRoot, 'json-schema/health.schema.json'))),
    ).toMatchObject({
      additionalProperties: false,
      properties: { status: { enum: ['ok', 'not_ready'] } },
    });
    expect(outputs.get(resolve(generatedRoot, 'typescript/index.ts'))).toContain(
      'serviceHealth.statuses as readonly string[]',
    );
    expect(
      outputs.get(resolve(generatedRoot, 'pydantic/smart_fasal_contracts/health.py')),
    ).toContain('HealthStatus = Literal["ok", "not_ready"]');
  });

  it('writes missing generated files', async () => {
    const { files, io } = createMemoryIo(new Map([[sourcePath, JSON.stringify(source)]]));

    await expect(generateContracts({ io, packageRoot })).resolves.toBe(true);
    expect(io.mkdir).toHaveBeenCalledTimes(8);
    expect(io.writeFile).toHaveBeenCalledTimes(8);
    expect(files.get(resolve(generatedRoot, 'events/event-catalog.json'))).toContain(
      '"contractVersion": "0.1.0"',
    );
  });

  it('accepts generated files that already match', async () => {
    const outputs = createOutputs(source, generatedRoot);
    const { io } = createMemoryIo(
      new Map([[sourcePath, JSON.stringify(source)], ...outputs.entries()]),
    );

    await expect(generateContracts({ checkOnly: true, io, packageRoot })).resolves.toBe(false);
    expect(io.writeFile).not.toHaveBeenCalled();
  });

  it('returns a failing CLI status for stale contracts without rewriting them', async () => {
    const { io } = createMemoryIo(new Map([[sourcePath, JSON.stringify(source)]]));
    const logger = { error: vi.fn() };

    await expect(
      runCli({ argv: ['node', 'generate.mjs', '--check'], io, logger, packageRoot }),
    ).resolves.toBe(1);
    expect(logger.error).toHaveBeenCalledWith(
      'Generated contracts are out of date. Run pnpm contracts:generate.',
    );
    expect(io.writeFile).not.toHaveBeenCalled();
  });

  it('returns a successful CLI status after generation', async () => {
    const { io } = createMemoryIo(new Map([[sourcePath, JSON.stringify(source)]]));

    await expect(runCli({ argv: ['node', 'generate.mjs'], io, packageRoot })).resolves.toBe(0);
  });

  it('propagates unexpected file-system failures', async () => {
    const denied = Object.assign(new Error('Denied'), { code: 'EACCES' });
    const io = {
      mkdir: vi.fn(),
      readFile: vi.fn().mockResolvedValueOnce(JSON.stringify(source)).mockRejectedValueOnce(denied),
      writeFile: vi.fn(),
    };

    await expect(generateContracts({ io, packageRoot })).rejects.toBe(denied);
  });
});

describe('canonical source validation', () => {
  it.each([
    ['an array root', []],
    ['an empty contract version', { ...source, contractVersion: '' }],
    ['a non-array event catalog', { ...source, events: {} }],
    ['a missing service health object', { ...source, serviceHealth: null }],
    [
      'a relative health path',
      { ...source, serviceHealth: { ...source.serviceHealth, livePath: 'health/live' } },
    ],
    [
      'a non-string health path',
      { ...source, serviceHealth: { ...source.serviceHealth, readyPath: 1 } },
    ],
    [
      'an empty status list',
      { ...source, serviceHealth: { ...source.serviceHealth, statuses: [] } },
    ],
    [
      'a non-string status',
      { ...source, serviceHealth: { ...source.serviceHealth, statuses: ['ok', 1] } },
    ],
    [
      'duplicate statuses',
      { ...source, serviceHealth: { ...source.serviceHealth, statuses: ['ok', 'ok'] } },
    ],
  ])('rejects %s', (_name, candidate) => {
    expect(() => assertCanonicalSource(candidate)).toThrow(TypeError);
  });
});
