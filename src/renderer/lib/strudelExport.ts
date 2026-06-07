import type { StrudelEditorElement, StrudelMirrorInstance } from './strudelRepl';
import { getStrudelMirror, getStrudelRuntime } from './strudelRepl';

export interface StrudelExportOptions {
  fileName: string;
  startCycle: number;
  endCycle: number;
  sampleRate: number;
  maxPolyphony: number;
  multiChannelOrbits: boolean;
}

export const STRUDEL_EXPORT_DEFAULTS: Omit<StrudelExportOptions, 'fileName'> = {
  startCycle: 0,
  endCycle: 1,
  sampleRate: 48000,
  maxPolyphony: 1024,
  multiChannelOrbits: true,
};

function assertExportRange(options: StrudelExportOptions): void {
  if (!Number.isFinite(options.startCycle) || !Number.isFinite(options.endCycle)) {
    throw new Error('起止 cycle 必须是有效数字');
  }
  if (options.endCycle <= options.startCycle) {
    throw new Error('End cycle 必须大于 Start cycle');
  }
  if (options.sampleRate <= 0 || options.maxPolyphony <= 0) {
    throw new Error('采样率与 polyphony 必须大于 0');
  }
}

/** 导出当前 Strudel 代码为 WAV（使用与 strudel.cc 相同的 offline 渲染） */
export async function exportStrudelToWav(
  editorElement: StrudelEditorElement | null,
  code: string,
  options: StrudelExportOptions,
): Promise<void> {
  assertExportRange(options);

  const runtime = getStrudelRuntime();
  const mirror = getStrudelMirror(editorElement);
  if (!mirror?.repl) {
    throw new Error('Strudel 编辑器未就绪');
  }

  const trimmed = code.trim();
  if (!trimmed) {
    throw new Error('没有可导出的代码');
  }

  await mirror.stop();
  await mirror.repl.evaluate(trimmed, false, true);

  const pattern = mirror.repl.state?.pattern;
  if (!pattern) {
    throw new Error('无法解析 pattern，请检查代码语法');
  }

  const cps = mirror.repl.scheduler.cps;
  const downloadName = options.fileName.trim() || undefined;

  try {
    await runtime.renderPatternAudio(
      pattern,
      cps,
      options.startCycle,
      options.endCycle,
      options.sampleRate,
      options.maxPolyphony,
      options.multiChannelOrbits,
      downloadName,
    );
  } finally {
    await runtime.initAudio({
      maxPolyphony: options.maxPolyphony,
      multiChannelOrbits: options.multiChannelOrbits,
    });
    await mirror.repl.evaluate(trimmed, false, true);
  }
}

export function defaultStrudelExportFileName(relativePath: string | null): string {
  if (!relativePath) {
    return '';
  }
  const base = relativePath.replace(/\\/g, '/').split('/').pop() ?? '';
  return base.replace(/\.strudel$/i, '');
}
