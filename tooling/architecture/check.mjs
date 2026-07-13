import { readdir, readFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';

const roots = ['apps', 'packages'];
const workspaces = [];

const requiredDeployables = [
  '@smart-fasal/device-ingest',
  '@smart-fasal/domain-api',
  '@smart-fasal/domain-worker',
  '@smart-fasal/farmer-web',
  '@smart-fasal/intelligence-service',
  '@smart-fasal/media-scanner',
  '@smart-fasal/mp-query-api',
  '@smart-fasal/mp-web',
  '@smart-fasal/privacy-pipeline',
  '@smart-fasal/provider-callback-ingest',
  '@smart-fasal/rsk-web',
  '@smart-fasal/voice-gateway',
];

const requiredFoundationPackages = [
  '@smart-fasal/application',
  '@smart-fasal/authz',
  '@smart-fasal/config',
  '@smart-fasal/contracts',
  '@smart-fasal/database',
  '@smart-fasal/design-tokens',
  '@smart-fasal/domain',
  '@smart-fasal/events',
  '@smart-fasal/health',
  '@smart-fasal/i18n',
  '@smart-fasal/maps',
  '@smart-fasal/observability',
  '@smart-fasal/offline',
  '@smart-fasal/persistence',
  '@smart-fasal/provider-sinks',
  '@smart-fasal/service-runtime',
  '@smart-fasal/test-kit',
  '@smart-fasal/ui',
  '@smart-fasal/voice',
];

const mpDependencyAllowlists = new Map([
  [
    '@smart-fasal/mp-web',
    new Set([
      '@smart-fasal/design-tokens',
      '@smart-fasal/health',
      '@smart-fasal/i18n',
      '@smart-fasal/ui',
    ]),
  ],
  [
    '@smart-fasal/mp-query-api',
    new Set([
      '@smart-fasal/config',
      '@smart-fasal/contracts',
      '@smart-fasal/health',
      '@smart-fasal/observability',
      '@smart-fasal/service-runtime',
    ]),
  ],
]);

const ignoredSourceDirectories = new Set([
  '.next',
  '.turbo',
  'build',
  'coverage',
  'dist',
  'node_modules',
]);
const sourceFilePattern = /\.(?:[cm]?[jt]sx?)$/;
const staticImportPattern =
  /(?:\bfrom\s+|\bimport\s*(?:\(\s*)?|\brequire\s*\(\s*)['"]([^'"]+)['"]/g;

async function listSourceFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredSourceDirectories.has(entry.name)) {
        files.push(...(await listSourceFiles(resolve(directory, entry.name))));
      }
    } else if (entry.isFile() && sourceFilePattern.test(entry.name)) {
      files.push(resolve(directory, entry.name));
    }
  }
  return files;
}

for (const root of roots) {
  let entries = [];
  try {
    entries = await readdir(resolve(root), { withFileTypes: true });
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const manifestPath = resolve(root, entry.name, 'package.json');
    try {
      const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
      workspaces.push({ kind: root, manifest, path: `${root}/${entry.name}` });
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
}

const failures = [];
const workspaceByName = new Map();

for (const workspace of workspaces) {
  if (!workspace.manifest.name) {
    failures.push(`${workspace.path} has no package name`);
    continue;
  }
  if (workspaceByName.has(workspace.manifest.name)) {
    failures.push(`duplicate package name: ${workspace.manifest.name}`);
  }
  workspaceByName.set(workspace.manifest.name, workspace);
}

const graph = new Map();
for (const [name, workspace] of workspaceByName) {
  const declared = {
    ...workspace.manifest.dependencies,
    ...workspace.manifest.devDependencies,
    ...workspace.manifest.peerDependencies,
  };
  const internal = Object.keys(declared).filter((dependency) => workspaceByName.has(dependency));
  graph.set(name, internal);

  const mpAllowlist = mpDependencyAllowlists.get(name);
  if (mpAllowlist) {
    for (const dependency of internal) {
      if (!mpAllowlist.has(dependency)) {
        failures.push(
          `${workspace.path} must not depend on ${dependency}; MP surfaces use an explicit aggregate-only allowlist`,
        );
      }
    }
  }

  for (const dependency of internal) {
    const target = workspaceByName.get(dependency);
    if (workspace.kind === 'apps' && target.kind === 'apps') {
      failures.push(`${workspace.path} must not depend on deployable ${target.path}`);
    }
  }
}

const workspaceEntries = [...workspaceByName.entries()].map(([name, workspace]) => ({
  name,
  root: resolve(workspace.path),
  workspace,
}));

function workspaceForPath(candidate) {
  return workspaceEntries.find(({ root }) => {
    const pathFromRoot = relative(root, candidate);
    return (
      pathFromRoot === '' ||
      (!isAbsolute(pathFromRoot) && pathFromRoot !== '..' && !pathFromRoot.startsWith(`..${sep}`))
    );
  });
}

function workspaceForSpecifier(sourceFile, specifier) {
  if (specifier.startsWith('.')) {
    return workspaceForPath(resolve(dirname(sourceFile), specifier));
  }
  return workspaceEntries.find(
    ({ name }) => specifier === name || specifier.startsWith(`${name}/`),
  );
}

for (const [name, workspace] of workspaceByName) {
  if (workspace.kind !== 'apps') continue;

  const declared = new Set([
    ...Object.keys(workspace.manifest.dependencies ?? {}),
    ...Object.keys(workspace.manifest.devDependencies ?? {}),
    ...Object.keys(workspace.manifest.peerDependencies ?? {}),
  ]);
  const mpAllowlist = mpDependencyAllowlists.get(name);

  for (const sourceFile of await listSourceFiles(resolve(workspace.path))) {
    const source = await readFile(sourceFile, 'utf8');
    for (const match of source.matchAll(staticImportPattern)) {
      const specifier = match[1];
      const target = workspaceForSpecifier(sourceFile, specifier);
      if (!target || target.name === name) continue;

      if (target.workspace.kind === 'apps') {
        failures.push(
          `${relative(resolve('.'), sourceFile)} imports deployable ${target.workspace.path}`,
        );
        continue;
      }

      if (mpAllowlist && !mpAllowlist.has(target.name)) {
        failures.push(
          `${relative(resolve('.'), sourceFile)} imports ${target.name}; MP surfaces use an explicit aggregate-only allowlist`,
        );
      }

      if (!specifier.startsWith('.') && !declared.has(target.name)) {
        failures.push(
          `${relative(resolve('.'), sourceFile)} imports undeclared workspace package ${target.name}`,
        );
      }
    }
  }
}

const visiting = new Set();
const visited = new Set();

function visit(name, path = []) {
  if (visiting.has(name)) {
    failures.push(`workspace dependency cycle: ${[...path, name].join(' -> ')}`);
    return;
  }
  if (visited.has(name)) return;

  visiting.add(name);
  for (const dependency of graph.get(name) ?? []) visit(dependency, [...path, name]);
  visiting.delete(name);
  visited.add(name);
}

for (const name of graph.keys()) visit(name);

for (const name of requiredDeployables) {
  if (!workspaceByName.has(name)) failures.push(`required deployable is missing: ${name}`);
}

for (const name of requiredFoundationPackages) {
  if (!workspaceByName.has(name)) failures.push(`required foundation package is missing: ${name}`);
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`architecture: ${failure}`);
  process.exitCode = 1;
} else {
  console.log(
    `architecture: checked ${workspaces.length} workspaces with no boundary or cycle errors`,
  );
}
