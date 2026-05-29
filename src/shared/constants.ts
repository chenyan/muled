export const DEFAULT_BUFFER_BYTES = 16 * 1024 * 1024;
export const DEFAULT_TREE_INITIAL_EXPANSION_DEPTH = 1;
export const WORKSPACE_MAX_DEPTH = 8;

export const IGNORED_DIR_NAMES = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.erb',
  'release',
]);
