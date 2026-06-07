import fs from 'fs';
import path from 'path';
import type webpack from 'webpack';
import webpackPaths from './webpack.paths';

const SOURCE_DIR = path.join(
  webpackPaths.rootPath,
  'node_modules/@strudel/repl/dist',
);

const SOURCE_INDEX = path.join(SOURCE_DIR, 'index.js');

const PATCHED_MARKER = 'exports.renderPatternAudio=renderPatternAudio';

const INDEX_EXPORT_PATCHES = [
  {
    from: 'return exports.prebake=prebake,Object.defineProperty(exports,Symbol.toStringTag,{value:"Module"}),exports',
    to: 'exports.prebake=prebake;exports.renderPatternAudio=renderPatternAudio;exports.initAudio=initAudio;Object.defineProperty(exports,Symbol.toStringTag,{value:"Module"});return exports',
  },
  {
    from: 'return exports.prebake=prebake',
    to: 'exports.prebake=prebake;exports.renderPatternAudio=renderPatternAudio;exports.initAudio=initAudio;return exports',
  },
];

function patchStrudelReplIndex(indexJs: string): string {
  if (indexJs.includes(PATCHED_MARKER)) {
    return indexJs;
  }
  for (const { from, to } of INDEX_EXPORT_PATCHES) {
    if (indexJs.includes(from)) {
      return indexJs.replace(from, to);
    }
  }
  throw new Error('无法 patch @strudel/repl index.js：导出标记未找到');
}

export function copyStrudelReplDist(targetDir: string): void {
  if (!fs.existsSync(SOURCE_DIR)) {
    throw new Error('@strudel/repl 未安装，请运行 npm install');
  }
  fs.cpSync(SOURCE_DIR, targetDir, { recursive: true });
  const indexPath = path.join(targetDir, 'index.js');
  const indexJs = fs.readFileSync(SOURCE_INDEX, 'utf8');
  fs.writeFileSync(indexPath, patchStrudelReplIndex(indexJs));
}

/** 确保 renderer 输出目录存在已 patch 的 @strudel/repl 产物 */
export function ensureStrudelReplDist(rendererOutputPath: string): void {
  copyStrudelReplDist(path.join(rendererOutputPath, 'strudel-repl'));
}

function runCopy(compiler: webpack.Compiler): void {
  const outputPath = compiler.outputPath ?? compiler.options.output?.path;
  if (!outputPath) {
    return;
  }
  copyStrudelReplDist(path.join(outputPath, 'strudel-repl'));
}

/** 将 @strudel/repl 预构建产物复制到 renderer 输出目录 */
export default class CopyStrudelReplPlugin {
  apply(compiler: webpack.Compiler): void {
    const copy = () => runCopy(compiler);
    compiler.hooks.beforeRun.tap('CopyStrudelReplPlugin', copy);
    compiler.hooks.watchRun.tap('CopyStrudelReplPlugin', copy);
    compiler.hooks.afterEmit.tap('CopyStrudelReplPlugin', copy);
  }
}
