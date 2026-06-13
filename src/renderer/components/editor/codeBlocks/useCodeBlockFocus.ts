import { useEffect, type RefObject } from 'react';
import type { EditorView } from '@codemirror/view';
import type { CodeBlockEditorProps } from '@mdxeditor/editor';

type FocusTargetRef =
  | RefObject<EditorView | null>
  | RefObject<HTMLElement | null>;

function focusTarget(ref: FocusTargetRef): void {
  const target = ref.current;
  if (!target) return;
  if (target instanceof HTMLElement) {
    target.focus();
    return;
  }
  target.focus();
}

/** 订阅 MDXEditor code block 的 focus 请求 */
export default function useCodeBlockFocus(
  focusEmitter: CodeBlockEditorProps['focusEmitter'],
  targetRef: FocusTargetRef,
  shouldSkipFocusRef?: RefObject<boolean>,
  alternateFocusRef?: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    const unsub = focusEmitter.subscribe(() => {
      if (shouldSkipFocusRef?.current) {
        return;
      }
      const alternate = alternateFocusRef?.current;
      if (alternate && document.activeElement === alternate) {
        return;
      }
      focusTarget(targetRef);
    });
    return unsub;
  }, [alternateFocusRef, focusEmitter, shouldSkipFocusRef, targetRef]);
}

/** textarea 随内容增高，避免出现内部滚动条 */
export function useTextareaAutoHeight(
  ref: RefObject<HTMLTextAreaElement | null>,
  value: string,
): void {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [ref, value]);
}
