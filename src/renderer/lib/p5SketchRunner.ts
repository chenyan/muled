import type p5 from 'p5';

export const P5_LIFECYCLE_HOOKS = [
  'setup',
  'draw',
  'preload',
  'mousePressed',
  'mouseReleased',
  'mouseClicked',
  'mouseMoved',
  'mouseDragged',
  'mouseWheel',
  'keyPressed',
  'keyReleased',
  'keyTyped',
  'doubleClicked',
  'windowResized',
  'touchStarted',
  'touchMoved',
  'touchEnded',
] as const;

type P5LifecycleHook = (typeof P5_LIFECYCLE_HOOKS)[number];
type P5HookMap = Partial<Record<P5LifecycleHook, (...args: unknown[]) => unknown>>;

function buildCompileBody(code: string): string {
  const returns = P5_LIFECYCLE_HOOKS.map(
    (hook) =>
      `${hook}: typeof ${hook} !== 'undefined' ? ${hook} : undefined`,
  ).join(',\n    ');
  return `
    with (p) {
      ${code}
    }
    return {
    ${returns}
    };
  `;
}

function compileGlobalSketchCode(code: string): (p: p5) => P5HookMap {
  const compile = new Function('p', buildCompileBody(code.trim())) as (
    p: p5,
  ) => P5HookMap;
  return compile;
}

function bindLifecycleHooks(
  p: p5,
  hooks: P5HookMap,
  onError?: (message: string) => void,
): void {
  for (const hook of P5_LIFECYCLE_HOOKS) {
    const fn = hooks[hook];
    if (typeof fn !== 'function') continue;
    (p as unknown as Record<string, unknown>)[hook] = (...args: unknown[]) => {
      try {
        return fn(...args);
      } catch (err) {
        const message =
          err instanceof Error ? err.stack ?? err.message : String(err);
        onError?.(message);
        throw err;
      }
    };
  }
}

/** 将 global mode p5 sketch 编译为 instance mode 回调 */
export function compileP5Sketch(
  code: string,
  onError?: (message: string) => void,
): (p: p5) => void {
  const compiled = compileGlobalSketchCode(code);
  return (p) => {
    const hooks = compiled(p);
    bindLifecycleHooks(p, hooks, onError);
  };
}
