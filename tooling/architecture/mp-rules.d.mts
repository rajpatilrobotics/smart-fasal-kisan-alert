export const FORBIDDEN_MP_WORKSPACE_PACKAGES: ReadonlySet<string>;
export const FORBIDDEN_MP_EXTERNAL_PACKAGES: ReadonlySet<string>;

export function packageNameFromSpecifier(specifier: string): string;
export function isForbiddenMpExternalSpecifier(specifier: string): boolean;
export function reachableInternalDependencyPaths(
  start: string,
  graph: ReadonlyMap<string, readonly string[]>,
): Map<string, string[]>;
export function findForbiddenOperationalRoutes(source: string, fileName?: string): string[];
