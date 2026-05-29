import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
} from 'react';
import type { AiApplyMode } from '../../../shared/buildAiPrompt';
import type {
  EditorFontSettings,
  EditorMode,
  EditorViewMode,
} from '../../../shared/types/config';
import EditorContextMenu, {
  type EditorContextMenuAction,
} from '../ai/EditorContextMenu';
import EditorViewSwitch from '../editor/EditorViewSwitch';
import KeybindingModeSwitch from '../editor/KeybindingModeSwitch';
import ImagePreview from '../editor/ImagePreview';
import MarkdownEditor, {
  type MarkdownEditorHandle,
} from '../editor/MarkdownEditor';
import SourceCodeEditor, {
  type SourceCodeEditorHandle,
} from '../editor/SourceCodeEditor';
import { DEFAULT_BUFFER_BYTES } from '../../../shared/constants';
import { formatBytes } from '../../../shared/formatBytes';
import { applyAiInEditor } from '../../lib/applyAiInEditor';
import { exportMarkdownFromWysiwyg } from '../../lib/normalizeMarkdownWikiImages';
import {
  registerEditorAiHandlers,
  type EditorAiSnapshot,
} from '../../lib/editorAiBridge';
import { editorPaneFontVars } from '../../lib/editorFontStyle';
import { registerEditorViewHandlers } from '../../lib/editorViewBridge';
import type { EditorTab } from '../../types/tab';
import { isEditableTextTab, tabLabel } from '../../types/tab';

interface TabContentProps {
  tab: EditorTab | null;
  sourceFont: EditorFontSettings;
  wysiwygFont: EditorFontSettings;
  hasApiKey: boolean;
  onContentChange: (content: string) => void;
  onViewModeChange: (
    tabId: string,
    viewMode: EditorViewMode,
    content: string,
  ) => void;
  onKeybindingModeChange: (tabId: string, mode: EditorMode) => void;
  onSave: (tabId: string) => void;
  onAiOpen: (mode: AiApplyMode, snapshot: EditorAiSnapshot) => void;
}

export default function TabContent({
  tab,
  sourceFont,
  wysiwygFont,
  hasApiKey,
  onContentChange,
  onViewModeChange,
  onKeybindingModeChange,
  onSave,
  onAiOpen,
}: TabContentProps) {
  const mdxRef = useRef<MarkdownEditorHandle>(null);
  const sourceRef = useRef<SourceCodeEditorHandle>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    snapshot: EditorAiSnapshot;
  } | null>(null);

  const captureSnapshot = useCallback((): EditorAiSnapshot | null => {
    if (!tab || !isEditableTextTab(tab)) return null;

    const showWysiwyg = tab.kind === 'markdown' && tab.viewMode === 'rich-text';
    if (showWysiwyg) {
      const selection = mdxRef.current?.getSelectionMarkdown()?.trim() ?? '';
      if (!selection) return null;
      return { selection, sourceRange: null };
    }

    const range = sourceRef.current?.getSelectionRange() ?? null;
    const selection = sourceRef.current?.getSelectionText()?.trim() ?? '';
    if (!selection || !range) return null;
    return { selection, sourceRange: range };
  }, [tab]);

  const applyAiResult = useCallback(
    (
      snapshot: EditorAiSnapshot,
      mode: AiApplyMode,
      aiText: string,
    ): string | null => {
      if (!tab || !isEditableTextTab(tab)) return null;

      const current =
        tab.viewMode === 'rich-text' && tab.kind === 'markdown'
          ? exportMarkdownFromWysiwyg(
              mdxRef.current?.getMarkdown() ?? tab.content,
            )
          : (sourceRef.current?.getValue() ?? tab.content);

      const next = applyAiInEditor(current, snapshot, mode, aiText);
      if (next === null) return null;

      if (tab.viewMode === 'rich-text' && tab.kind === 'markdown') {
        mdxRef.current?.setMarkdown(next);
      } else {
        sourceRef.current?.setDocument(next);
      }
      onContentChange(next);
      return next;
    },
    [onContentChange, tab],
  );

  const getEditorContent = useCallback((): string => {
    if (!tab || !isEditableTextTab(tab)) return '';
    const showWysiwyg = tab.kind === 'markdown' && tab.viewMode === 'rich-text';
    if (showWysiwyg) {
      return exportMarkdownFromWysiwyg(
        mdxRef.current?.getMarkdown() ?? tab.content,
      );
    }
    return sourceRef.current?.getValue() ?? tab.content;
  }, [tab]);

  useEffect(() => {
    if (!tab || !isEditableTextTab(tab) || tab.truncated) {
      if (tab) {
        registerEditorAiHandlers(tab.id, null);
        registerEditorViewHandlers(tab.id, null);
      }
      return undefined;
    }

    registerEditorAiHandlers(tab.id, {
      captureSnapshot,
      applyAiResult,
    });
    registerEditorViewHandlers(tab.id, { getEditorContent });
    return () => {
      registerEditorAiHandlers(tab.id, null);
      registerEditorViewHandlers(tab.id, null);
    };
  }, [applyAiResult, captureSnapshot, getEditorContent, tab]);

  const handleViewModeChange = useCallback(
    (next: EditorViewMode) => {
      if (!tab || tab.kind !== 'markdown') return;
      const content =
        next === 'source'
          ? exportMarkdownFromWysiwyg(
              mdxRef.current?.getMarkdown() ?? tab.content,
            )
          : (sourceRef.current?.getValue() ?? tab.content);
      onViewModeChange(tab.id, next, content);
    },
    [tab, onViewModeChange],
  );

  const handleEditorContextMenu = useCallback(
    (e: MouseEvent) => {
      if (!tab || !isEditableTextTab(tab) || tab.truncated) return;
      const snap = captureSnapshot();
      if (!snap?.selection) return;

      e.preventDefault();
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        snapshot: snap,
      });
    },
    [captureSnapshot, tab],
  );

  const handleContextMenuSelect = useCallback(
    (action: EditorContextMenuAction) => {
      const { snapshot } = contextMenu ?? {};
      setContextMenu(null);
      if (!snapshot?.selection) return;
      onAiOpen(action, snapshot);
    },
    [contextMenu, onAiOpen],
  );

  if (!tab) {
    return <div className="TabContent TabContent--empty">无打开的标签页</div>;
  }

  const showWysiwyg = tab.kind === 'markdown' && tab.viewMode === 'rich-text';
  const showSource =
    tab.kind === 'text' ||
    (tab.kind === 'markdown' && tab.viewMode === 'source');

  const canSave =
    isEditableTextTab(tab) && tab.relativePath && !tab.truncated && tab.dirty;

  return (
    <div className="TabContent">
      <EditorContextMenu
        open={contextMenu !== null}
        x={contextMenu?.x ?? 0}
        y={contextMenu?.y ?? 0}
        hasSelection={Boolean(contextMenu?.snapshot.selection)}
        hasApiKey={hasApiKey}
        onClose={() => setContextMenu(null)}
        onSelect={handleContextMenuSelect}
      />
      <header className="TabContent__header">
        <div className="TabContent__headerLeft">
          <span className="TabContent__title">{tabLabel(tab)}</span>
          {tab.truncated && (
            <span className="TabContent__truncated">只读（已截断）</span>
          )}
        </div>
        <div className="TabContent__headerRight">
          {isEditableTextTab(tab) && (
            <KeybindingModeSwitch
              mode={tab.keybindingMode}
              disabled={tab.truncated}
              onChange={(mode) => onKeybindingModeChange(tab.id, mode)}
            />
          )}
          {tab.kind === 'markdown' && (
            <EditorViewSwitch
              viewMode={tab.viewMode}
              disabled={tab.truncated}
              onChange={handleViewModeChange}
            />
          )}
          {isEditableTextTab(tab) && (
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
        ) : (
          <div
            className="TabContent__editorPane"
            style={editorPaneFontVars(sourceFont, wysiwygFont)}
            onContextMenu={handleEditorContextMenu}
          >
            {showWysiwyg && (
              <MarkdownEditor
                ref={mdxRef}
                tabKey={`${tab.id}:${tab.relativePath ?? 'untitled'}:wysiwyg`}
                markdown={tab.content}
                relativePath={tab.relativePath}
                readOnly={tab.truncated}
                onChange={onContentChange}
              />
            )}
            {showSource && (
              <SourceCodeEditor
                ref={sourceRef}
                tabId={tab.id}
                tabKey={`${tab.id}:${tab.relativePath ?? 'untitled'}:source`}
                value={tab.content}
                relativePath={tab.relativePath}
                keybindingMode={tab.keybindingMode}
                readOnly={tab.truncated}
                onChange={onContentChange}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
