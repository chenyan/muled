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

/** 从已挂载的 strudel-editor 读取当前代码 */
export function readStrudelEditorCode(element: StrudelEditorElement): string | null {
  const mirror = element.editor;
  if (!mirror) {
    return null;
  }
  if (typeof mirror.getCode === 'function') {
    return mirror.getCode();
  }
  if (typeof mirror.code === 'string') {
    return mirror.code;
  }
  return mirror.editor?.state.doc.toString() ?? null;
}

export function getStrudelMirror(
  element: StrudelEditorElement | null | undefined,
): StrudelMirrorInstance | null {
  return element?.editor ?? null;
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
