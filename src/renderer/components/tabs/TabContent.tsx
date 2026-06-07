import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
} from 'react';
import {
  findSelectionSpan,
  type AiApplyMode,
} from '../../../shared/buildAiPrompt';
import type {
  EditorFontSettings,
  EditorViewMode,
} from '../../../shared/types/config';
import EditorContextMenu, {
  type EditorContextMenuAction,
} from '../ai/EditorContextMenu';
import TranslationPopup from '../ai/TranslationPopup';
import { useTabTranslation } from '../../hooks/useTabTranslation';
import EditorViewSwitch from '../editor/EditorViewSwitch';
import DocxEditorView from '../editor/DocxEditorView';
import DocxViewSwitch from '../editor/DocxViewSwitch';
import CsvSpreadsheetView from '../editor/CsvSpreadsheetView';
import XlsxSpreadsheetView from '../editor/XlsxSpreadsheetView';
import CsvTabView from '../editor/CsvTabView';
import CsvViewSwitch from '../editor/CsvViewSwitch';
import IpynbPreview from '../editor/IpynbPreview';
import IpynbViewSwitch from '../editor/IpynbViewSwitch';
import HtmlPreview from '../editor/HtmlPreview';
import HtmlViewSwitch from '../editor/HtmlViewSwitch';
import MarkdownTabNavigation from './MarkdownTabNavigation';
import AudioPreview from '../editor/AudioPreview';
import VideoPreview from '../editor/VideoPreview';
import ImagePreview from '../editor/ImagePreview';
import DirectoryGridView from '../editor/DirectoryGridView';
import PdfViewer from '../editor/pdf/PdfViewer';
import PptxViewerView from '../editor/PptxViewerView';
import MarkdownEditor, {
  type MarkdownEditorHandle,
} from '../editor/MarkdownEditor';
import SourceCodeEditor, {
  type SourceCodeEditorHandle,
} from '../editor/SourceCodeEditor';
import { DEFAULT_BUFFER_BYTES } from '../../../shared/constants';
import { formatBytes } from '../../../shared/formatBytes';
import { applyAiInEditor } from '../../lib/applyAiInEditor';
import { prepareMarkdownForWysiwyg } from '../../lib/prepareMarkdownForWysiwyg';
import {
  registerEditorAiHandlers,
  type EditorAiSnapshot,
} from '../../lib/editorAiBridge';
import { editorPaneFontVars } from '../../lib/editorFontStyle';
import { appendTextAtDocumentEnd } from '../../lib/appendTextAtDocumentEnd';
import { registerEditorViewHandlers } from '../../lib/editorViewBridge';
import { registerEditorOutlineHandlers } from '../../lib/editorOutlineBridge';
import type { EditorTab } from '../../types/tab';
import { isEditableTextTab, isSavableTab, tabLabel } from '../../types/tab';

interface TabContentProps {
  tab: EditorTab | null;
  workspaceRoot: string;
  /** 分隔视图中的单分区 */
  layout?: 'full' | 'pane';
  focused?: boolean;
  sourceFont: EditorFontSettings;
  wysiwygFont: EditorFontSettings;
  hasApiKey: boolean;
  onContentChange: (content: string) => void;
  onDocxDirty?: (tabId: string) => void;
  onXlsxDirty?: (tabId: string) => void;
  onFocusPane?: () => void;
  onClosePane?: () => void;
  onViewModeChange: (
    tabId: string,
    viewMode: EditorViewMode,
    content: string,
  ) => void;
  onSave: (tabId: string) => void;
  onOpenFile: (relativePath: string) => void;
  onOpenFileFromEditor: (relativePath: string) => void;
  onOpenDirectoryGrid: (relativePath: string) => void;
  onAiOpen: (mode: AiApplyMode, snapshot: EditorAiSnapshot) => void;
  tabNavigation?: { canGoBack: boolean; canGoForward: boolean };
  onTabNavigateBack?: () => void;
  onTabNavigateForward?: () => void;
  /** 分屏时：将 PDF 选区复制到另一侧编辑器末尾 */
  onCopyPdfSelectionToOtherPane?: (text: string) => void;
}

export default function TabContent({
  tab,
  workspaceRoot,
  layout = 'full',
  focused = true,
  sourceFont,
  wysiwygFont,
  hasApiKey,
  onContentChange,
  onDocxDirty,
  onXlsxDirty,
  onViewModeChange,
  onSave,
  onOpenFile,
  onOpenFileFromEditor,
  onOpenDirectoryGrid,
  onAiOpen,
  onFocusPane,
  onClosePane,
  tabNavigation,
  onTabNavigateBack,
  onTabNavigateForward,
  onCopyPdfSelectionToOtherPane,
}: TabContentProps) {
  const isPane = layout === 'pane';
  const mdxRef = useRef<MarkdownEditorHandle>(null);
  const sourceRef = useRef<SourceCodeEditorHandle>(null);
  const editorPaneRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    snapshot: EditorAiSnapshot;
    anchorRect: DOMRect | null;
    showTranslate: boolean;
    showAiEdit: boolean;
  } | null>(null);
  const { translationPopup, setTranslationPopup, runTranslate } =
    useTabTranslation();

  const getWysiwygContent = useCallback((): string => {
    return mdxRef.current?.getPersistedMarkdown() ?? tab?.content ?? '';
  }, [tab?.content]);

  const getEditableContent = useCallback((): string => {
    if (!tab || !isEditableTextTab(tab)) return '';
    if (tab.kind === 'markdown') {
      if (tab.viewMode === 'rich-text') {
        return getWysiwygContent();
      }
      if (tab.viewMode === 'source') {
        return sourceRef.current?.getValue() ?? tab.content;
      }
      return tab.content;
    }
    if (tab.kind === 'html' && tab.viewMode === 'source') {
      return sourceRef.current?.getValue() ?? tab.content;
    }
    if (tab.kind === 'csv' && tab.viewMode === 'source') {
      return sourceRef.current?.getValue() ?? tab.content;
    }
    if (tab.kind === 'ipynb' && tab.viewMode === 'source') {
      return sourceRef.current?.getValue() ?? tab.content;
    }
    return tab.content;
  }, [getWysiwygContent, tab]);

  const captureSnapshot = useCallback((): EditorAiSnapshot | null => {
    if (!tab || !isEditableTextTab(tab)) return null;

    const showWysiwyg = tab.kind === 'markdown' && tab.viewMode === 'rich-text';
    if (showWysiwyg) {
      const selection = mdxRef.current?.getSelectionMarkdown() ?? '';
      if (!selection.trim()) return null;
      const current = getWysiwygContent();
      return {
        selection,
        sourceRange: findSelectionSpan(current, selection),
      };
    }

    const range = sourceRef.current?.getSelectionRange() ?? null;
    const selection = sourceRef.current?.getSelectionText() ?? '';
    if (!selection.trim() || !range) return null;
    return { selection, sourceRange: range };
  }, [getWysiwygContent, tab]);

  const applyAiResult = useCallback(
    (
      snapshot: EditorAiSnapshot,
      mode: AiApplyMode,
      aiText: string,
    ): string | null => {
      if (!tab || !isEditableTextTab(tab)) return null;

      const current =
        tab.viewMode === 'rich-text' && tab.kind === 'markdown'
          ? getWysiwygContent()
          : (sourceRef.current?.getValue() ?? tab.content);

      const next = applyAiInEditor(current, snapshot, mode, aiText);
      if (next === null) return null;

      if (tab.viewMode === 'rich-text' && tab.kind === 'markdown') {
        mdxRef.current?.markUserEdited();
        mdxRef.current?.setMarkdown(prepareMarkdownForWysiwyg(next));
      } else {
        sourceRef.current?.setDocument(next);
      }
      onContentChange(next);
      return next;
    },
    [getWysiwygContent, onContentChange, tab],
  );

  const getEditorContent = useCallback((): string => {
    if (!tab || !isEditableTextTab(tab)) return '';
    if (tab.kind === 'markdown') {
      return getEditableContent();
    }
    return sourceRef.current?.getValue() ?? tab.content;
  }, [getEditableContent, tab]);

  const appendToEditorEnd = useCallback(
    (text: string) => {
      if (!tab || !isEditableTextTab(tab) || tab.truncated) return;

      const trimmed = text.trim();
      if (!trimmed) return;

      const current = getEditorContent();
      const next = appendTextAtDocumentEnd(current, trimmed);

      if (
        tab.kind === 'markdown' &&
        (tab.viewMode === 'rich-text' || tab.viewMode === 'preview')
      ) {
        mdxRef.current?.markUserEdited();
        mdxRef.current?.setMarkdown(prepareMarkdownForWysiwyg(next));
      } else {
        sourceRef.current?.setDocument(next);
      }
      onContentChange(next);
    },
    [getEditorContent, onContentChange, tab],
  );

  useEffect(() => {
    if (!tab || !isEditableTextTab(tab) || tab.truncated) {
      if (tab) {
        registerEditorAiHandlers(tab.id, null);
        registerEditorViewHandlers(tab.id, null);
        registerEditorOutlineHandlers(tab.id, null);
      }
      return undefined;
    }

    registerEditorAiHandlers(tab.id, {
      captureSnapshot,
      applyAiResult,
    });
    registerEditorViewHandlers(tab.id, {
      getEditorContent,
      appendToEnd: appendToEditorEnd,
    });
    registerEditorOutlineHandlers(tab.id, {
      revealOutlineTarget: ({ line, title }) => {
        if (
          tab.kind !== 'markdown' ||
          tab.viewMode === 'source'
        ) {
          return false;
        }
        return (
          mdxRef.current?.revealOutlineTarget({
            line,
            title,
          }) ?? false
        );
      },
    });
    return () => {
      registerEditorAiHandlers(tab.id, null);
      registerEditorViewHandlers(tab.id, null);
      registerEditorOutlineHandlers(tab.id, null);
    };
  }, [appendToEditorEnd, applyAiResult, captureSnapshot, getEditorContent, tab]);

  const handleViewModeChange = useCallback(
    (next: EditorViewMode) => {
      if (!tab || next === tab.viewMode) return;
      if (tab.kind === 'markdown') {
        onViewModeChange(tab.id, next, getEditableContent());
        return;
      }
      if (tab.kind === 'html' || tab.kind === 'csv' || tab.kind === 'ipynb') {
        const content =
          tab.viewMode === 'source'
            ? (sourceRef.current?.getValue() ?? tab.content)
            : tab.content;
        onViewModeChange(tab.id, next, content);
        return;
      }
      if (tab.kind === 'docx') {
        onViewModeChange(tab.id, next);
      }
    },
    [getEditableContent, tab, onViewModeChange],
  );

  const handleEditorContextMenu = useCallback(
    (e: MouseEvent) => {
      if (!tab || !isEditableTextTab(tab) || tab.truncated) return;

      const showRenderedMarkdown =
        tab.kind === 'markdown' &&
        (tab.viewMode === 'rich-text' || tab.viewMode === 'preview');

      if (showRenderedMarkdown) {
        const picked = mdxRef.current?.selectSentenceAtPoint(
          e.clientX,
          e.clientY,
        );
        if (!picked?.text.trim()) return;

        e.preventDefault();

        const current =
          tab.viewMode === 'preview' ? tab.content : getWysiwygContent();
        const snapshot: EditorAiSnapshot = {
          selection: picked.text,
          sourceRange: findSelectionSpan(current, picked.text),
        };

        setContextMenu({
          x: e.clientX,
          y: e.clientY,
          snapshot,
          anchorRect: picked.rect,
          showTranslate:
            tab.viewMode === 'rich-text' || tab.viewMode === 'preview',
          showAiEdit: tab.viewMode === 'rich-text',
        });
        return;
      }

      const snapshot = captureSnapshot();
      if (!snapshot?.selection) return;

      e.preventDefault();
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        snapshot,
        anchorRect: null,
        showTranslate: false,
        showAiEdit: true,
      });
    },
    [captureSnapshot, getWysiwygContent, tab],
  );

  useEffect(() => {
    const pane = editorPaneRef.current;
    if (!pane) return undefined;

    const handler = (event: MouseEvent) => {
      handleEditorContextMenu(event);
    };

    pane.addEventListener('contextmenu', handler, { capture: true });
    return () => pane.removeEventListener('contextmenu', handler, { capture: true });
  }, [handleEditorContextMenu]);

  const handleContextMenuSelect = useCallback(
    async (action: EditorContextMenuAction) => {
      const menu = contextMenu;
      setContextMenu(null);
      if (!menu?.snapshot?.selection) return;

      if (action === 'translate') {
        const rect = menu.anchorRect;
        if (!rect) return;
        await runTranslate(menu.snapshot.selection, rect);
        return;
      }

      onAiOpen(action, menu.snapshot);
    },
    [contextMenu, onAiOpen, runTranslate],
  );

  const handlePdfTranslate = useCallback(
    (request: { sentence: string; anchorRect: DOMRect }) => {
      void runTranslate(request.sentence, request.anchorRect);
    },
    [runTranslate],
  );

  if (!tab) {
    return <div className="TabContent TabContent--empty">无打开的标签页</div>;
  }

  const showWysiwyg = tab.kind === 'markdown' && tab.viewMode === 'rich-text';
  const showMarkdownPreview =
    tab.kind === 'markdown' && tab.viewMode === 'preview';
  const showHtmlPreview = tab.kind === 'html' && tab.viewMode === 'preview';
  const showCsvSpreadsheet = tab.kind === 'csv' && tab.viewMode === 'preview';
  const showIpynbPreview = tab.kind === 'ipynb' && tab.viewMode === 'preview';
  const showSource =
    tab.kind === 'text' ||
    (tab.kind === 'html' && tab.viewMode === 'source') ||
    (tab.kind === 'csv' && tab.viewMode === 'source') ||
    (tab.kind === 'ipynb' && tab.viewMode === 'source') ||
    (tab.kind === 'markdown' && tab.viewMode === 'source');

  const canSave =
    isSavableTab(tab) && tab.relativePath && !tab.truncated && tab.dirty;

  const paneClass = isPane
    ? ` TabContent--pane${focused ? ' TabContent--pane-focused' : ''}`
    : '';

  return (
    <div
      className={`TabContent${paneClass}`}
      onPointerDown={
        isPane && onFocusPane
          ? () => {
              onFocusPane();
            }
          : undefined
      }
    >
      <EditorContextMenu
        open={contextMenu !== null}
        x={contextMenu?.x ?? 0}
        y={contextMenu?.y ?? 0}
        hasSelection={Boolean(contextMenu?.snapshot.selection)}
        hasApiKey={hasApiKey}
        showTranslate={contextMenu?.showTranslate ?? false}
        showAiEdit={contextMenu?.showAiEdit ?? true}
        onClose={() => setContextMenu(null)}
        onSelect={handleContextMenuSelect}
      />
      <TranslationPopup
        popup={translationPopup}
        onClose={() => setTranslationPopup(null)}
      />
      <header className="TabContent__header">
        <div className="TabContent__headerLeft">
          {!isPane &&
          tab.kind === 'markdown' &&
          tabNavigation &&
          onTabNavigateBack &&
          onTabNavigateForward ? (
            <MarkdownTabNavigation
              canGoBack={tabNavigation.canGoBack}
              canGoForward={tabNavigation.canGoForward}
              onBack={onTabNavigateBack}
              onForward={onTabNavigateForward}
            />
          ) : null}
          <span className="TabContent__title">{tabLabel(tab)}</span>
          {tab.truncated && (
            <span className="TabContent__truncated">只读（已截断）</span>
          )}
        </div>
        <div className="TabContent__headerRight">
          {tab.kind === 'markdown' && (
            <EditorViewSwitch
              viewMode={tab.viewMode}
              disabled={tab.truncated}
              onChange={handleViewModeChange}
            />
          )}
          {tab.kind === 'html' && (
            <HtmlViewSwitch
              viewMode={tab.viewMode}
              disabled={tab.truncated}
              onChange={handleViewModeChange}
            />
          )}
          {tab.kind === 'csv' && (
            <CsvViewSwitch
              viewMode={tab.viewMode}
              disabled={tab.truncated}
              onChange={handleViewModeChange}
            />
          )}
          {tab.kind === 'ipynb' && (
            <IpynbViewSwitch
              viewMode={tab.viewMode}
              disabled={tab.truncated}
              onChange={handleViewModeChange}
            />
          )}
          {tab.kind === 'docx' && (
            <DocxViewSwitch
              viewMode={tab.viewMode}
              disabled={tab.truncated}
              onChange={handleViewModeChange}
            />
          )}
          {!isPane && isSavableTab(tab) && (
            <button
              type="button"
              className="TabContent__save"
              disabled={!canSave}
              title={(() => {
                if (tab.truncated) return '截断文件不可保存';
                if (!tab.relativePath) return '请先打开文件';
                return '保存 (⌘S)';
              })()}
              onClick={() => onSave(tab.id)}
            >
              保存
            </button>
          )}
          {isPane && onClosePane ? (
            <button
              type="button"
              className="TabContent__paneClose"
              title="关闭此分区"
              aria-label="关闭此分区"
              onClick={(e) => {
                e.stopPropagation();
                onClosePane();
              }}
            >
              ×
            </button>
          ) : null}
        </div>
      </header>
      <div className="TabContent__body">
        {tab.truncated && isEditableTextTab(tab) && (
          <div className="TabContent__truncatedBanner" role="alert">
            文件已截断至前 {formatBytes(DEFAULT_BUFFER_BYTES)}（共{' '}
            {formatBytes(tab.fileSize)}）。仅可查看，保存已禁用。
          </div>
        )}
        {tab.kind === 'image' ? (
          <ImagePreview tab={tab} />
        ) : tab.kind === 'pdf' ? (
          <PdfViewer
            tab={tab}
            hasApiKey={hasApiKey}
            onTranslate={handlePdfTranslate}
            onCopySelectionToOtherPane={onCopyPdfSelectionToOtherPane}
          />
        ) : tab.kind === 'pptx' ? (
          <PptxViewerView tab={tab} />
        ) : tab.kind === 'audio' ? (
          <AudioPreview tab={tab} />
        ) : tab.kind === 'video' ? (
          <VideoPreview tab={tab} />
        ) : tab.kind === 'directory-grid' ? (
          <DirectoryGridView
            tab={tab}
            onOpenFile={onOpenFile}
            onOpenDirectory={onOpenDirectoryGrid}
          />
        ) : tab.kind === 'html' && showHtmlPreview ? (
          <HtmlPreview tab={tab} workspaceRoot={workspaceRoot} />
        ) : showCsvSpreadsheet ? (
          <CsvTabView tab={tab}>
            <CsvSpreadsheetView tab={tab} onChange={onContentChange} />
          </CsvTabView>
        ) : tab.kind === 'csv' && showSource ? (
          <CsvTabView tab={tab}>
            <div
              ref={editorPaneRef}
              className="TabContent__editorPane"
              style={editorPaneFontVars(sourceFont, wysiwygFont)}
            >
              <SourceCodeEditor
                ref={sourceRef}
                tabId={tab.id}
                tabKey={`${tab.id}:${tab.relativePath ?? 'untitled'}:source`}
                value={tab.content}
                relativePath={tab.relativePath}
                keybindingMode={tab.keybindingMode}
                readOnly={tab.truncated}
                reveal={tab.reveal ?? null}
                onChange={onContentChange}
              />
            </div>
          </CsvTabView>
        ) : showIpynbPreview ? (
          <IpynbPreview tab={tab} sourceFont={sourceFont} />
        ) : tab.kind === 'xlsx' ? (
          <XlsxSpreadsheetView
            tab={tab}
            onDirty={() => onXlsxDirty?.(tab.id)}
          />
        ) : tab.kind === 'docx' ? (
          <DocxEditorView
            tab={tab}
            viewMode={tab.viewMode}
            onDirty={() => onDocxDirty?.(tab.id)}
          />
        ) : (
          <div
            ref={editorPaneRef}
            className={`TabContent__editorPane${showMarkdownPreview ? ' TabContent__editorPane--preview' : ''}`}
            style={editorPaneFontVars(sourceFont, wysiwygFont)}
          >
            {showWysiwyg && (
              <MarkdownEditor
                ref={mdxRef}
                tabKey={`${tab.id}:${tab.relativePath ?? 'untitled'}:wysiwyg`}
                markdown={tab.content}
                relativePath={tab.relativePath}
                readOnly={tab.truncated}
                onChange={onContentChange}
                onOpenFile={onOpenFileFromEditor}
              />
            )}
            {showMarkdownPreview && (
              <MarkdownEditor
                ref={mdxRef}
                tabKey={`${tab.id}:${tab.relativePath ?? 'untitled'}:preview`}
                markdown={tab.content}
                relativePath={tab.relativePath}
                readOnly
                onChange={() => {}}
                onOpenFile={onOpenFileFromEditor}
              />
            )}
            {showSource && tab.kind !== 'csv' && (
              <SourceCodeEditor
                ref={sourceRef}
                tabId={tab.id}
                tabKey={`${tab.id}:${tab.relativePath ?? 'untitled'}:source`}
                value={tab.content}
                relativePath={tab.relativePath}
                keybindingMode={tab.keybindingMode}
                readOnly={tab.truncated}
                reveal={tab.reveal ?? null}
                onChange={onContentChange}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
