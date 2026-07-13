import ts from 'typescript';

export const FORBIDDEN_MP_WORKSPACE_PACKAGES = new Set([
  '@smart-fasal/application',
  '@smart-fasal/database',
  '@smart-fasal/domain',
  '@smart-fasal/persistence',
]);

export const FORBIDDEN_MP_EXTERNAL_PACKAGES = new Set([
  '@prisma/client',
  'better-sqlite3',
  'drizzle-orm',
  'ioredis',
  'knex',
  'kysely',
  'mongodb',
  'mongoose',
  'mysql',
  'mysql2',
  'pg',
  'postgres',
  'prisma',
  'redis',
  'sequelize',
  'slonik',
  'sqlite3',
  'typeorm',
]);

export function packageNameFromSpecifier(specifier) {
  if (specifier.startsWith('@')) return specifier.split('/').slice(0, 2).join('/');
  return specifier.split('/')[0];
}

export function isForbiddenMpExternalSpecifier(specifier) {
  return FORBIDDEN_MP_EXTERNAL_PACKAGES.has(packageNameFromSpecifier(specifier));
}

export function reachableInternalDependencyPaths(start, graph) {
  const paths = new Map([[start, [start]]]);
  const queue = [start];
  while (queue.length > 0) {
    const current = queue.shift();
    const currentPath = paths.get(current);
    if (currentPath === undefined) continue;
    for (const dependency of graph.get(current) ?? []) {
      if (paths.has(dependency)) continue;
      paths.set(dependency, [...currentPath, dependency]);
      queue.push(dependency);
    }
  }
  return paths;
}

function staticString(node) {
  if (ts.isStringLiteralLike(node)) return node.text;
  if (ts.isParenthesizedExpression(node)) return staticString(node.expression);
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const left = staticString(node.left);
    const right = staticString(node.right);
    return left === undefined || right === undefined ? undefined : `${left}${right}`;
  }
  if (ts.isTemplateExpression(node)) {
    let value = node.head.text;
    for (const span of node.templateSpans) {
      const expression = staticString(span.expression);
      if (expression === undefined) return undefined;
      value += expression + span.literal.text;
    }
    return value;
  }
  return undefined;
}

export function findForbiddenOperationalRoutes(source, fileName = 'source.ts') {
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const matches = new Set();
  function visit(node) {
    const value = staticString(node);
    for (const route of ['/v1/farmer/', '/v1/rsk/']) {
      if (value?.includes(route)) matches.add(route);
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return [...matches].sort();
}
