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
import mdxEditorHtmlPlugin from './html/mdxEditorHtmlPlugin';
import { canParseMarkdownBlock } from '../../lib/markdownBlockParser';
import {
  exportMarkdownFromWysiwyg,
} from '../../lib/normalizeMarkdownWikiImages';
import { prepareMarkdownForWysiwyg } from '../../lib/prepareMarkdownForWysiwyg';
import { recoverMarkdownForWysiwyg } from '../../lib/recoverMarkdownForWysiwyg';
import type { WikiLinkPickerState } from '../../lib/openWysiwygLink';
import { useWysiwygLinkNavigation } from '../../hooks/useWysiwygLinkNavigation';
import {
  clearWikiImagePreviewCache,
  resolveWikiImagePreview,
} from '../../lib/resolveWikiImagePreview';
import { pushStatusToast } from '../../lib/statusToast';
import { useWysiwygTheme } from '../../hooks/useAppTheme';
import mdxEditorInlineMathPlugin from './inlineMath/mdxEditorInlineMathPlugin';
import mdxEditorWikiImagePlugin from './mdxEditorWikiImagePlugin';
import WikiLinkPickerMenu from './WikiLinkPickerMenu';
import MULED_CODE_BLOCK_DESCRIPTORS from './codeBlocks/muledCodeBlockDescriptors';
import MarkdownEditorErrorBoundary from './MarkdownEditorErrorBoundary';
import { getWysiwygContentRoot } from '../../lib/wysiwygContentRoot';
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
  onOpenFile?: (relativePath: string) => void;
}

export type MarkdownEditorHandle = MDXEditorMethods & {
  /** 未手动编辑时返回磁盘原文，避免 WYSIWYG 被动序列化改写文件 */
  getPersistedMarkdown: () => string;
  markUserEdited: () => void;
  hasUserEdited: () => boolean;
  selectSentenceAtPoint: (
    clientX: number,
    clientY: number,
  ) => WysiwygSentenceSelection | null;
  getSelectionRect: () => DOMRect | null;
  revealOutlineTarget: (target: { line: number; title: string }) => boolean;
};

/** 仅 WYSIWYG；Source 由 {@link SourceCodeEditor} 按后缀高亮 */
const MarkdownEditor = forwardRef<MarkdownEditorHandle, MarkdownEditorProps>(
  function MarkdownEditor(
    { tabKey, markdown, relativePath, readOnly, onChange, onOpenFile },
    ref,
  ) {
    const innerRef = useRef<MDXEditorMethods>(null);
    const scrollHostRef = useRef<HTMLDivElement>(null);
    const documentRelativePathRef = useRef(relativePath);
    documentRelativePathRef.current = relativePath;
    const recoveryAttemptRef = useRef(0);
    const pendingRecoveryMarkdownRef = useRef<string | null>(null);
    const pendingRecoveryNotifyRef = useRef<(() => void) | null>(null);
    const [editorEpoch, setEditorEpoch] = useState(0);
    const wysiwygTheme = useWysiwygTheme();
    const hydratingRef = useRef(false);
    const hydrationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const originalMarkdownRef = useRef(markdown);
    const userEditedRef = useRef(false);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    const onOpenFileRef = useRef(onOpenFile);
    onOpenFileRef.current = onOpenFile;
    const onWikiMenuRef = useRef<(state: WikiLinkPickerState) => void>(() => {});
    const [wikiLinkMenu, setWikiLinkMenu] = useState<WikiLinkPickerState | null>(
      null,
    );
    onWikiMenuRef.current = setWikiLinkMenu;

    useWysiwygLinkNavigation(scrollHostRef, {
      onOpenFileRef,
      onWikiMenuRef,
      remountKey: `${tabKey}:${editorEpoch}`,
    });

    useImperativeHandle(ref, () => {
      const editor = innerRef.current as MDXEditorMethods;
      return {
        ...editor,
        getPersistedMarkdown() {
          if (!userEditedRef.current) {
            return originalMarkdownRef.current;
          }
          return exportMarkdownFromWysiwyg(
            editor.getMarkdown?.() ?? originalMarkdownRef.current,
            originalMarkdownRef.current,
          );
        },
        markUserEdited() {
          userEditedRef.current = true;
        },
        hasUserEdited() {
          return userEditedRef.current;
        },
        selectSentenceAtPoint(clientX: number, clientY: number) {
          const host = scrollHostRef.current;
          if (!host) return null;
          const root = getWysiwygContentRoot(host);
          if (!root) return null;
          return selectSentenceAtPointInRoot(root, clientX, clientY);
        },
        getSelectionRect() {
          return getSelectionBoundingRect();
        },
        revealOutlineTarget(target: { line: number; title: string }) {
          const host = scrollHostRef.current;
          if (!host) return false;
          const root = getWysiwygContentRoot(host);
          if (!root) return false;

          const normalize = (text: string) => text.replace(/\s+/g, ' ').trim();
          const targetTitle = normalize(target.title);
          if (!targetTitle) return false;

          const headingNodes = Array.from(
            root.querySelectorAll('h1, h2, h3, h4, h5, h6'),
          ).filter((node): node is HTMLElement => node instanceof HTMLElement);
          const matched = headingNodes.find(
            (node) => normalize(node.textContent ?? '') === targetTitle,
          );
          if (matched) {
            matched.scrollIntoView({ block: 'center', behavior: 'smooth' });
            return true;
          }

          const paragraphs = Array.from(root.querySelectorAll('p'));
          const approxNode = paragraphs[Math.max(0, target.line - 1)];
          if (approxNode) {
            approxNode.scrollIntoView({ block: 'center', behavior: 'smooth' });
            return true;
          }
          return false;
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
        mdxEditorHtmlPlugin(),
        mdxEditorFaultTolerancePlugin(),
        mdxEditorInlineMathPlugin(),
      ],
      [wikiImagePlugin, imagePreviewHandler],
    );

    const prepareForEditor = useCallback(
      (raw: string): string => prepareMarkdownForWysiwyg(raw),
      [],
    );

    const finishHydration = useCallback(() => {
      hydratingRef.current = false;
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
        if (hydratingRef.current) {
          scheduleHydrationFinish();
          return;
        }
        if (!userEditedRef.current) {
          return;
        }
        onChangeRef.current(
          exportMarkdownFromWysiwyg(nextMarkdown, originalMarkdownRef.current),
        );
      },
      [scheduleHydrationFinish],
    );

    const loadMarkdown = useCallback(
      (raw: string, options?: { prepare?: boolean; notifyRecovery?: boolean }) => {
        const prepared =
          options?.prepare === false ? raw : prepareForEditor(raw);

        const notify =
          options?.notifyRecovery === true && prepared !== raw
            ? () => {
                pushStatusToast(
                  '部分 Markdown 语法无法解析，已降级为代码块保留内容。',
                  'info',
                );
              }
            : null;

        const apply = () => {
          if (!innerRef.current) {
            return false;
          }
          innerRef.current.setMarkdown(prepared);
          notify?.();
          return true;
        };

        if (apply()) {
          return;
        }

        queueMicrotask(() => {
          if (apply()) {
            return;
          }
          pendingRecoveryMarkdownRef.current = prepared;
          if (notify) {
            pendingRecoveryNotifyRef.current = notify;
          }
        });
      },
      [prepareForEditor],
    );

    const preparedInitialMarkdown = useMemo(
      () => prepareForEditor(markdown),
      [markdown, prepareForEditor, tabKey, editorEpoch],
    );

    useEffect(() => {
      clearWikiImagePreviewCache();
    }, [tabKey]);

    useEffect(() => {
      const pending = pendingRecoveryMarkdownRef.current;
      if (!pending || !innerRef.current) {
        return;
      }
      pendingRecoveryMarkdownRef.current = null;
      innerRef.current.setMarkdown(pending);
      pendingRecoveryNotifyRef.current?.();
      pendingRecoveryNotifyRef.current = null;
    }, [tabKey, editorEpoch]);

    useEffect(() => {
      recoveryAttemptRef.current = 0;
      originalMarkdownRef.current = markdown;
      userEditedRef.current = false;
      hydratingRef.current = true;
      scheduleHydrationFinish();
      // tabKey / editorEpoch：MDXEditor 经 key 重挂载，内容由 preparedInitialMarkdown 注入，不再 setMarkdown 二次解析
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tabKey, editorEpoch, scheduleHydrationFinish]);

    useEffect(() => {
      const host = scrollHostRef.current;
      if (!host || readOnly) return undefined;

      const markUserEdited = () => {
        userEditedRef.current = true;
      };

      const onBeforeInput = (event: Event) => {
        const inputEvent = event as InputEvent;
        // IME 组合输入过程中不标记；最终提交由 compositionend 处理
        if (inputEvent.inputType === 'insertCompositionText') {
          return;
        }
        markUserEdited();
      };

      host.addEventListener('beforeinput', onBeforeInput);
      host.addEventListener('compositionend', markUserEdited);
      host.addEventListener('paste', markUserEdited);
      host.addEventListener('cut', markUserEdited);
      return () => {
        host.removeEventListener('beforeinput', onBeforeInput);
        host.removeEventListener('compositionend', markUserEdited);
        host.removeEventListener('paste', markUserEdited);
        host.removeEventListener('cut', markUserEdited);
      };
    }, [readOnly, tabKey, editorEpoch]);

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
    }, []);

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
            className={
              wysiwygTheme === 'dark'
                ? 'MuledMDXEditor dark-theme'
                : 'MuledMDXEditor'
            }
          />
        </MarkdownEditorErrorBoundary>
        {wikiLinkMenu ? (
          <WikiLinkPickerMenu
            x={wikiLinkMenu.x}
            y={wikiLinkMenu.y}
            title={wikiLinkMenu.title}
            matches={wikiLinkMenu.matches}
            onSelect={(match) => {
              onOpenFileRef.current?.(match.path);
              setWikiLinkMenu(null);
            }}
            onClose={() => setWikiLinkMenu(null)}
          />
        ) : null}
      </div>
    );
  },
);

export default MarkdownEditor;
