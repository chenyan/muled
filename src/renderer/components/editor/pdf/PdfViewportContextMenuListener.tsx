import { useContext, useEffect } from 'react';
import { useViewportElement } from '@embedpdf/plugin-viewport/react';
import { PdfContextMenuContext } from './PdfContextMenuHost';

function isContextMenuPointer(event: PointerEvent | MouseEvent): boolean {
  return event.button === 2 || (event.button === 0 && event.ctrlKey);
}

/** 在 Viewport 根节点上以 capture 监听 contextmenu，避免被子层拦截。 */
export default function PdfViewportContextMenuListener() {
  const viewportRef = useViewportElement();
  const { onContextMenu } = useContext(PdfContextMenuContext);

  useEffect(() => {
    const el = viewportRef?.current;
    if (!el || !onContextMenu) return undefined;

    const handler = (event: Event) => {
      onContextMenu(event as MouseEvent);
    };
    el.addEventListener('contextmenu', handler, { capture: true });
    return () => el.removeEventListener('contextmenu', handler, { capture: true });
  }, [onContextMenu, viewportRef]);

  // embedpdf 在 pointerdown 时会 onClear 清选区；右键/Ctrl+单击的 pointerdown
  // 先于 contextmenu，需在 capture 阶段拦截，避免打开菜单前丢失选区。
  useEffect(() => {
    const el = viewportRef?.current;
    if (!el) return undefined;

    const blockContextMenuPointer = (event: Event) => {
      if (!isContextMenuPointer(event as PointerEvent)) return;
      event.stopPropagation();
    };

    el.addEventListener('pointerdown', blockContextMenuPointer, { capture: true });
    el.addEventListener('pointerup', blockContextMenuPointer, { capture: true });
    return () => {
      el.removeEventListener('pointerdown', blockContextMenuPointer, {
        capture: true,
      });
      el.removeEventListener('pointerup', blockContextMenuPointer, { capture: true });
    };
  }, [viewportRef]);

  return null;
}
