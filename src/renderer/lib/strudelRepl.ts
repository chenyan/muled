const STRUDEL_REPL_PUBLIC_PATH = 'strudel-repl/index.js';

let loadPromise: Promise<void> | null = null;

function strudelReplScriptUrl(): string {
  return new URL(STRUDEL_REPL_PUBLIC_PATH, window.location.href).href;
}

/** 加载本地 @strudel/repl，注册 <strudel-editor> 自定义元素 */
export function loadStrudelRepl(): Promise<void> {
  if (
    typeof customElements !== 'undefined' &&
    customElements.get('strudel-editor')
  ) {
    return Promise.resolve();
  }
  if (!loadPromise) {
    loadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = strudelReplScriptUrl();
      script.async = true;
      script.onload = () => {
        if (!customElements.get('strudel-editor')) {
          loadPromise = null;
          reject(new Error('无法加载 @strudel/repl'));
          return;
        }
        resolve();
      };
      script.onerror = () => {
        loadPromise = null;
        reject(new Error('无法加载 @strudel/repl'));
      };
      document.head.appendChild(script);
    });
  }
  return loadPromise;
}

export interface StrudelPattern {
  queryArc: (
    begin: number,
    end: number,
    controls?: { _cps?: number },
  ) => unknown[];
}

export interface StrudelReplInstance {
  evaluate: (
    code: string,
    play?: boolean,
    reset?: boolean,
  ) => Promise<unknown>;
  stop?: () => void;
  state: {
    pattern?: StrudelPattern;
  };
  scheduler: {
    cps: number;
    stop?: () => void;
  };
}

export interface StrudelMirrorInstance {
  setCode: (code: string) => void;
  getCode?: () => string;
  code?: string;
  evaluate: (play?: boolean) => Promise<void>;
  stop: () => Promise<void>;
  toggle: () => Promise<void>;
  clear?: () => void;
  repl?: StrudelReplInstance;
  editor?: {
    state: {
      doc: {
        toString: () => string;
      };
    };
  };
}

export interface StrudelEditorElement extends HTMLElement {
  editor?: StrudelMirrorInstance | null;
  code?: string;
  solo?: boolean;
}

/** 统一换行，避免 CRLF 干扰 Strudel 解析 */
export function normalizeStrudelSource(code: string): string {
  return code.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

export function waitForStrudelMirror(
  element: StrudelEditorElement,
): Promise<StrudelEditorElement> {
  return new Promise((resolve) => {
    const check = () => {
      if (element.editor) {
        resolve(element);
        return;
      }
      requestAnimationFrame(check);
    };
    check();
  });
}

/** 挂载 <strudel-editor>；通过 .code 属性初始化，避免 setAttribute 编码/竞态问题 */
export function mountStrudelEditor(
  host: HTMLElement,
  code: string,
  options?: { solo?: boolean },
): StrudelEditorElement {
  host.replaceChildren();
  const editor = document.createElement('strudel-editor') as StrudelEditorElement;
  const normalized = normalizeStrudelSource(code);
  editor.solo = options?.solo ?? false;
  editor.code = normalized;
  host.appendChild(editor);
  return editor;
}

export interface StrudelRuntimeApi {
  renderPatternAudio: (
    pattern: StrudelPattern,
    cps: number,
    begin: number,
    end: number,
    sampleRate: number,
    maxPolyphony: number,
    multiChannelOrbits: boolean,
    downloadName?: string,
  ) => Promise<void>;
  initAudio: (options?: {
    maxPolyphony?: number;
    multiChannelOrbits?: boolean;
  }) => Promise<void>;
}

declare global {
  interface Window {
    strudel?: StrudelRuntimeApi & {
      prebake?: unknown;
    };
  }
}

function getStrudelRuntimeOptional(): StrudelRuntimeApi | null {
  const api = window.strudel;
  if (!api?.renderPatternAudio || !api.initAudio) {
    return null;
  }
  return api;
}

export function getStrudelRuntime(): StrudelRuntimeApi {
  const api = getStrudelRuntimeOptional();
  if (!api) {
    throw new Error(
      'Strudel 导出运行时未就绪（缺少 renderPatternAudio），请重启开发服务器后重试',
    );
  }
  return api;
}

/** 从已挂载的 strudel-editor 读取当前代码（优先 CodeMirror 文档，避免 mirror.code 滞后） */
export function readStrudelEditorCode(element: StrudelEditorElement): string | null {
  const mirror = element.editor;
  if (!mirror) {
    return null;
  }
  const fromDoc = mirror.editor?.state.doc.toString();
  if (typeof fromDoc === 'string') {
    return fromDoc;
  }
  if (typeof mirror.getCode === 'function') {
    return mirror.getCode();
  }
  if (typeof mirror.code === 'string') {
    return mirror.code;
  }
  return null;
}

export function getStrudelMirror(
  element: StrudelEditorElement | null | undefined,
): StrudelMirrorInstance | null {
  return element?.editor ?? null;
}

/** 将代码写入 strudel-editor（优先走 mirror.setCode，避免 setAttribute 同值不触发更新） */
export function writeStrudelEditorCode(
  element: StrudelEditorElement | null | undefined,
  code: string,
): void {
  if (!element) {
    return;
  }
  const normalized = normalizeStrudelSource(code);
  const mirror = getStrudelMirror(element);
  if (mirror) {
    mirror.setCode(normalized);
    return;
  }
  element.code = normalized;
}

/** 将 CodeMirror 中的最新代码同步到 mirror，供 evaluate 使用 */
export function syncStrudelMirrorFromEditor(
  element: StrudelEditorElement | null | undefined,
): string | null {
  const live = element ? readStrudelEditorCode(element) : null;
  if (live === null || !element) {
    return live;
  }
  writeStrudelEditorCode(element, live);
  return live;
}

/** 播放前先同步编辑器内容，避免 mirror.code 滞后导致语法错误 */
export async function evaluateStrudelEditor(
  element: StrudelEditorElement | null | undefined,
  play = true,
): Promise<void> {
  const mirror = getStrudelMirror(element);
  if (!mirror || !element) {
    return;
  }
  syncStrudelMirrorFromEditor(element);
  await mirror.evaluate(play);
}

export async function stopStrudelEditor(
  element: StrudelEditorElement | null | undefined,
): Promise<void> {
  const mirror = getStrudelMirror(element);
  if (!mirror) {
    return;
  }
  await mirror.stop();
}

export async function toggleStrudelEditor(
  element: StrudelEditorElement | null | undefined,
): Promise<void> {
  const mirror = getStrudelMirror(element);
  if (!mirror || !element) {
    return;
  }
  syncStrudelMirrorFromEditor(element);
  await mirror.toggle();
}

/** 停止调度并释放 StrudelMirror 注册的 document 监听器 */
export function disposeStrudelEditor(
  element: StrudelEditorElement | null | undefined,
): void {
  const mirror = getStrudelMirror(element);
  if (mirror) {
    try {
      void mirror.stop();
    } catch {
      // ignore stop errors during teardown
    }
    try {
      mirror.repl?.stop?.();
      mirror.repl?.scheduler?.stop?.();
    } catch {
      // ignore
    }
    try {
      mirror.clear?.();
    } catch {
      // ignore
    }
  }

  if (!element) {
    return;
  }

  // <strudel-editor> 会在 host 内插入 sibling 容器承载 CodeMirror
  element.nextElementSibling?.remove();
  element.remove();
}
