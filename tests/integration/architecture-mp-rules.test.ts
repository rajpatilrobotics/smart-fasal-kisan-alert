import { describe, expect, it } from 'vitest';

import {
  findForbiddenOperationalRoutes,
  isForbiddenMpExternalSpecifier,
  reachableInternalDependencyPaths,
} from '../../tooling/architecture/mp-rules.mjs';

describe('MP architecture rules', () => {
  it.each(['pg', 'pg/native', 'postgres', 'drizzle-orm/pg-core', '@prisma/client'])(
    'rejects the external database dependency %s',
    (specifier) => {
      expect(isForbiddenMpExternalSpecifier(specifier)).toBe(true);
    },
  );

  it('finds forbidden operational routes even when literals are constructed', () => {
    expect(
      findForbiddenOperationalRoutes(`
        const farmer = '/v1/' + 'farmer/plots';
        const rsk = \`/v1/\${'rsk'}/work\`;
      `),
    ).toEqual(['/v1/farmer/', '/v1/rsk/']);
  });

  it('exposes transitive paths so allowed facades cannot hide persistence', () => {
    const graph = new Map([
      ['@smart-fasal/mp-query-api', ['@smart-fasal/observability']],
      ['@smart-fasal/observability', ['@smart-fasal/persistence']],
      ['@smart-fasal/persistence', []],
    ]);

    expect(reachableInternalDependencyPaths('@smart-fasal/mp-query-api', graph)).toEqual(
      new Map([
        ['@smart-fasal/mp-query-api', ['@smart-fasal/mp-query-api']],
        ['@smart-fasal/observability', ['@smart-fasal/mp-query-api', '@smart-fasal/observability']],
        [
          '@smart-fasal/persistence',
          ['@smart-fasal/mp-query-api', '@smart-fasal/observability', '@smart-fasal/persistence'],
        ],
      ]),
    );
  });
});
