import {
  MDXEditor,
  type MDXEditorMethods,
  codeBlockPlugin,
  headingsPlugin,
  imagePlugin,
  linkPlugin,
  listsPlugin,
  markdownShortcutPlugin,
  quotePlugin,
  tablePlugin,
  thematicBreakPlugin,
} from '@mdxeditor/editor';
import 'katex/dist/katex.min.css';
import '@mdxeditor/editor/style.css';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import mdxEditorFaultTolerancePlugin from '../../lib/mdxEditorFaultTolerancePlugin';
import { canParseMarkdownBlock } from '../../lib/markdownBlockParser';
import normalizeMarkdownMath from '../../lib/normalizeMarkdownMath';
import {
  exportMarkdownFromWysiwyg,
  normalizeMarkdownWikiImages,
} from '../../lib/normalizeMarkdownWikiImages';
import {
  prepareMarkdownForWysiwyg,
  recoverMarkdownForWysiwyg,
} from '../../lib/recoverMarkdownForWysiwyg';
import {
  clearWikiImagePreviewCache,
  resolveWikiImagePreview,
} from '../../lib/resolveWikiImagePreview';
import { pushStatusToast } from '../../lib/statusToast';
import mdxEditorInlineMathPlugin from './inlineMath/mdxEditorInlineMathPlugin';
import mdxEditorWikiImagePlugin from './mdxEditorWikiImagePlugin';
import MULED_CODE_BLOCK_DESCRIPTORS from './codeBlocks/muledCodeBlockDescriptors';
import MarkdownEditorErrorBoundary from './MarkdownEditorErrorBoundary';
import {
  getSelectionBoundingRect,
  selectSentenceAtPointInRoot,
  type WysiwygSentenceSelection,
} from '../../lib/wysiwygSentenceSelection';

export interface MarkdownEditorProps {
  tabKey: string;
  markdown: string;
  relativePath?: string | null;
  readOnly: boolean;
  onChange: (markdown: string) => void;
  /** 载入期编辑器被动改写（如 AutoLink）后同步 baseline，不触发 dirty */
  onBaselineSync?: (markdown: string) => void;
}

export type MarkdownEditorHandle = MDXEditorMethods & {
  selectSentenceAtPoint: (
    clientX: number,
    clientY: number,
  ) => WysiwygSentenceSelection | null;
  getSelectionRect: () => DOMRect | null;
};

/** 仅 WYSIWYG；Source 由 {@link SourceCodeEditor} 按后缀高亮 */
const MarkdownEditor = forwardRef<MarkdownEditorHandle, MarkdownEditorProps>(
  function MarkdownEditor(
    { tabKey, markdown, relativePath, readOnly, onChange, onBaselineSync },
    ref,
  ) {
    const innerRef = useRef<MDXEditorMethods>(null);
    const scrollHostRef = useRef<HTMLDivElement>(null);
    const documentRelativePathRef = useRef(relativePath);
    documentRelativePathRef.current = relativePath;
    const recoveryAttemptRef = useRef(0);
    const [editorEpoch, setEditorEpoch] = useState(0);
    const hydratingRef = useRef(false);
    const hydrationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingBaselineRef = useRef<string | null>(null);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    const onBaselineSyncRef = useRef(onBaselineSync);
    onBaselineSyncRef.current = onBaselineSync;

    useImperativeHandle(ref, () => {
      const editor = innerRef.current as MDXEditorMethods;
      return {
        ...editor,
        selectSentenceAtPoint(clientX: number, clientY: number) {
          const root = scrollHostRef.current?.querySelector(
            '.mdxeditor-root-contenteditable [contenteditable="true"]',
          );
          if (!(root instanceof HTMLElement)) return null;
          return selectSentenceAtPointInRoot(root, clientX, clientY);
        },
        getSelectionRect() {
          return getSelectionBoundingRect();
        },
      };
    });

    const imagePreviewHandler = useCallback(
      (src: string) =>
        resolveWikiImagePreview(src, documentRelativePathRef.current),
      [],
    );

    const wikiImagePlugin = useMemo(
      () => mdxEditorWikiImagePlugin(documentRelativePathRef),
      [],
    );

    const plugins = useMemo(
      () => [
        headingsPlugin(),
        listsPlugin(),
        quotePlugin(),
        linkPlugin(),
        wikiImagePlugin,
        imagePlugin({ imagePreviewHandler }),
        tablePlugin(),
        thematicBreakPlugin(),
        markdownShortcutPlugin(),
        codeBlockPlugin({
          defaultCodeBlockLanguage: 'txt',
          codeBlockEditorDescriptors: MULED_CODE_BLOCK_DESCRIPTORS,
        }),
        mdxEditorFaultTolerancePlugin(),
        mdxEditorInlineMathPlugin(),
      ],
      [wikiImagePlugin, imagePreviewHandler],
    );

    const prepareForEditor = useCallback((raw: string): string => {
      return prepareMarkdownForWysiwyg(
        normalizeMarkdownWikiImages(normalizeMarkdownMath(raw)),
        canParseMarkdownBlock,
      );
    }, []);

    const finishHydration = useCallback(() => {
      hydratingRef.current = false;
      const pending = pendingBaselineRef.current;
      pendingBaselineRef.current = null;
      if (pending !== null) {
        onBaselineSyncRef.current?.(pending);
      }
    }, []);

    const scheduleHydrationFinish = useCallback(() => {
      if (hydrationTimerRef.current) {
        clearTimeout(hydrationTimerRef.current);
      }
      hydrationTimerRef.current = setTimeout(() => {
        hydrationTimerRef.current = null;
        finishHydration();
      }, 100);
    }, [finishHydration]);

    const handleChange = useCallback(
      (nextMarkdown: string, isInitialNormalize?: boolean) => {
        if (isInitialNormalize) {
          return;
        }
        const exported = exportMarkdownFromWysiwyg(nextMarkdown);
        if (hydratingRef.current) {
          pendingBaselineRef.current = exported;
          scheduleHydrationFinish();
          return;
        }
        onChangeRef.current(exported);
      },
      [scheduleHydrationFinish],
    );

    const loadMarkdown = useCallback(
      (raw: string, options?: { prepare?: boolean; notifyRecovery?: boolean }) => {
        const prepared =
          options?.prepare === false ? raw : prepareForEditor(raw);
        innerRef.current?.setMarkdown(prepared);
        if (options?.notifyRecovery && prepared !== raw) {
          pushStatusToast(
            '部分 Markdown 语法无法解析，已降级为代码块保留内容。',
            'info',
          );
        }
      },
      [prepareForEditor],
    );

    const preparedInitialMarkdown = useMemo(
      () => prepareForEditor(markdown),
      [markdown, prepareForEditor, tabKey, editorEpoch],
    );

    useEffect(() => {
      recoveryAttemptRef.current = 0;
      clearWikiImagePreviewCache();
      hydratingRef.current = true;
      pendingBaselineRef.current = null;
      loadMarkdown(markdown, { prepare: true, notifyRecovery: true });
      scheduleHydrationFinish();
      // tabKey / editorEpoch：切换 Tab 或重置；组件 remount 时也会执行
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tabKey, editorEpoch, loadMarkdown, scheduleHydrationFinish]);

    useEffect(
      () => () => {
        if (hydrationTimerRef.current) {
          clearTimeout(hydrationTimerRef.current);
          hydrationTimerRef.current = null;
        }
      },
      [tabKey, editorEpoch],
    );

    const handleParseError = useCallback(
      ({ error, source }: { error: string; source: string }) => {
        recoveryAttemptRef.current += 1;
        if (recoveryAttemptRef.current > 2) {
          pushStatusToast(
            `Markdown 解析失败：${error}。请切换到 Source 模式修复。`,
            'error',
          );
          return;
        }

        const recovered = recoverMarkdownForWysiwyg(
          source,
          recoveryAttemptRef.current,
          canParseMarkdownBlock,
        );
        loadMarkdown(recovered, {
          prepare: false,
          notifyRecovery: true,
        });
      },
      [loadMarkdown],
    );

    const handleEditorReset = useCallback(() => {
      recoveryAttemptRef.current = 0;
      setEditorEpoch((value) => value + 1);
      loadMarkdown(markdown, { prepare: true, notifyRecovery: false });
    }, [loadMarkdown, markdown]);

    useEffect(() => {
      const host = scrollHostRef.current;
      if (!host) return undefined;

      const onWheel = (event: WheelEvent) => {
        const { deltaY, target } = event;
        if (target instanceof HTMLElement) {
          const textarea = target.closest('textarea');
          if (textarea instanceof HTMLTextAreaElement) {
            const canScrollDown =
              textarea.scrollTop + textarea.clientHeight <
              textarea.scrollHeight - 1;
            const canScrollUp = textarea.scrollTop > 0;
            if ((deltaY > 0 && canScrollDown) || (deltaY < 0 && canScrollUp)) {
              return;
            }
          }
        }

        const maxScroll = host.scrollHeight - host.clientHeight;
        if (maxScroll <= 0) return;

        const nextTop = host.scrollTop + deltaY;
        const clamped = Math.max(0, Math.min(maxScroll, nextTop));
        if (clamped === host.scrollTop) return;

        host.scrollTop = clamped;
        event.preventDefault();
      };

      host.addEventListener('wheel', onWheel, { passive: false });
      return () => host.removeEventListener('wheel', onWheel);
    }, [tabKey, editorEpoch]);

    const editorKey = `${tabKey}:${editorEpoch}`;

    return (
      <div ref={scrollHostRef} className="MuledMDXEditorHost">
        <MarkdownEditorErrorBoundary onReset={handleEditorReset}>
          <MDXEditor
            key={editorKey}
            ref={innerRef}
            markdown={preparedInitialMarkdown}
            plugins={plugins}
            readOnly={readOnly}
            trim={false}
            onChange={handleChange}
            onError={handleParseError}
            className="MuledMDXEditor"
          />
        </MarkdownEditorErrorBoundary>
      </div>
    );
  },
);

export default MarkdownEditor;
