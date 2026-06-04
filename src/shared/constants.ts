export const DEFAULT_BUFFER_BYTES = 16 * 1024 * 1024;
export const DEFAULT_TREE_INITIAL_EXPANSION_DEPTH = 1;
export const WORKSPACE_MAX_DEPTH = 8;

/** 左侧边栏宽度（px），与设置页、拖拽限位一致 */
export const SIDEBAR_WIDTH_MIN = 120;
export const SIDEBAR_WIDTH_MAX = 800;
export const SIDEBAR_WIDTH_DEFAULT = 260;

export const IGNORED_DIR_NAMES = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.erb',
  'release',
]);
