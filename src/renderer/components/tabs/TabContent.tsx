import {
  useCallback,
  useEffect,
  useRef,
  useState,
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
import WysiwygContextMenu, {
  type WysiwygContextMenuSelect,
} from '../editor/WysiwygContextMenu';
import { runWysiwygEditorAction } from '../../lib/wysiwygEditorActions';
import TranslationPopup from '../ai/TranslationPopup';
import NoteRecordingOverlay from '../mnote/NoteRecordingOverlay';
import type { MnoteEntry } from '../../lib/mnoteFormat';
import { useTabTranslation } from '../../hooks/useTabTranslation';
import { buildMarkdownMnoteLoc } from '../../lib/buildMarkdownMnoteLoc';
import type { AppendMnoteEntryInput } from '../../lib/mnoteService';
import {
  companionMnotePath,
  isMnoteSourcePath,
} from '../../lib/mnotePath';
import EditorViewSwitch from '../editor/EditorViewSwitch';
import DocxEditorView from '../editor/DocxEditorView';
import DocxViewSwitch from '../editor/DocxViewSwitch';
import CsvSpreadsheetView from '../editor/CsvSpreadsheetView';
import XlsxSpreadsheetView from '../editor/XlsxSpreadsheetView';
import CsvTabView from '../editor/CsvTabView';
import CsvViewSwitch from '../editor/CsvViewSwitch';
import DatabaseView from '../editor/DatabaseView';
import IpynbPreview from '../editor/IpynbPreview';
import IpynbNotebookView, {
  type IpynbNotebookViewHandle,
} from '../editor/ipynb/IpynbNotebookView';
import IpynbViewSwitch from '../editor/IpynbViewSwitch';
import HtmlPreview from '../editor/HtmlPreview';
import HtmlViewSwitch from '../editor/HtmlViewSwitch';
import OrgPreview from '../editor/OrgPreview';
import OrgAgenda from '../editor/OrgAgenda';
import OrgViewSwitch from '../editor/OrgViewSwitch';
import StrudelReplPreview, {
  type StrudelReplPreviewHandle,
} from '../editor/StrudelReplPreview';
import StrudelViewSwitch from '../editor/StrudelViewSwitch';
import P5Preview from '../editor/P5Preview';
import P5ViewSwitch from '../editor/P5ViewSwitch';
import MermaidPreview from '../editor/MermaidPreview';
import MermaidViewSwitch from '../editor/MermaidViewSwitch';
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
import SchemeSourceLayout from '../editor/SchemeSourceLayout';
import BunSourceLayout from '../editor/BunSourceLayout';
import PythonSourceLayout from '../editor/PythonSourceLayout';
import { useSchemeChezAvailable } from '../../hooks/useSchemeChezAvailable';
import { useBunAvailable } from '../../hooks/useBunAvailable';
import { usePythonAvailable } from '../../hooks/usePythonAvailable';
import { useIpythonAvailable } from '../../hooks/useIpythonAvailable';
import {
  createSchemePtySession,
  killSchemePtySession,
} from '../../lib/scheme/schemePtyClient';
import {
  createBunPtySession,
  killBunPtySession,
} from '../../lib/bun/bunPtyClient';
import {
  disposeSchemeTerminalSession,
  isSchemeSourceTab,
  shouldDisposeSchemeTerminalOnTabContextChange,
  type SchemeTerminalTabContext,
} from '../../lib/scheme/schemeTerminalSessionLifecycle';
import {
  disposeBunTerminalSession,
  isBunSourceTab,
  shouldDisposeBunTerminalOnTabContextChange,
  type BunTerminalTabContext,
} from '../../lib/bun/bunTerminalSessionLifecycle';
import {
  createPythonPtySession,
  killPythonPtySession,
} from '../../lib/python/pythonPtyClient';
import {
  disposePythonTerminalSession,
  isPythonSourceTab,
  shouldDisposePythonTerminalOnTabContextChange,
  type PythonTerminalTabContext,
} from '../../lib/python/pythonTerminalSessionLifecycle';
import type { PythonPtyMode } from '../../../shared/types/tools';
import { getSourceLanguageId } from '../../lib/fileLanguage';
import { extractSchemeTopLevelSymbols } from '../../lib/scheme/schemeTerminalSymbolTracker';
import { pushStatusToast } from '../../lib/statusToast';
import RunIcon from '../icons/RunIcon';
import IpythonIcon from '../icons/IpythonIcon';
import { DEFAULT_BUFFER_BYTES } from '../../../shared/constants';
import { formatBytes } from '../../../shared/formatBytes';
import { applyAiInEditor } from '../../lib/applyAiInEditor';
import { prepareMarkdownForWysiwyg } from '../../lib/prepareMarkdownForWysiwyg';
import { prepareMnoteForWysiwyg } from '../../lib/prepareMnoteForWysiwyg';
import {
  registerEditorAiHandlers,
  type EditorAiSnapshot,
} from '../../lib/editorAiBridge';
import { editorPaneFontVars } from '../../lib/editorFontStyle';
import { appendTextAtDocumentEnd } from '../../lib/appendTextAtDocumentEnd';
import { registerEditorViewHandlers } from '../../lib/editorViewBridge';
import { registerEditorOutlineHandlers } from '../../lib/editorOutlineBridge';
import type {
  EditorRevealTarget,
  EditorTab,
  PdfRevealTarget,
} from '../../types/tab';
import { isEditableTextTab, isSavableTab, tabLabel, tabUsesSourceCodeEditor } from '../../types/tab';

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
  onHtmlPreviewNavigate?: (readPath: string, hash?: string) => void;
  onClearHtmlPreviewHash?: (tabId: string) => void;
  /** 分屏时：将 PDF 选区复制到另一侧编辑器末尾 */
  onCopyPdfSelectionToOtherPane?: (text: string) => void;
  onAppendMnote?: (
    sourcePath: string,
    input: AppendMnoteEntryInput,
  ) => Promise<void>;
  onOpenMnoteSplit?: (sourcePath: string) => void;
  activeMnoteEntryId?: string | null;
  onMnoteEntryClick?: (entry: MnoteEntry) => void;
  onClearMnoteReveal?: () => void;
  onPdfPageChange?: (page: number) => void;
  mnotePagePdfHighlights?: PdfRevealTarget[];
  mnoteQuoteEditorHighlight?: EditorRevealTarget | null;
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
  onHtmlPreviewNavigate,
  onClearHtmlPreviewHash,
  onCopyPdfSelectionToOtherPane,
  onAppendMnote,
  onOpenMnoteSplit,
  activeMnoteEntryId = null,
  onMnoteEntryClick,
  onClearMnoteReveal,
  onPdfPageChange,
  mnotePagePdfHighlights = [],
  mnoteQuoteEditorHighlight = null,
}: TabContentProps) {
  const isPane = layout === 'pane';
  const mdxRef = useRef<MarkdownEditorHandle>(null);
  const sourceRef = useRef<SourceCodeEditorHandle>(null);
  const strudelReplRef = useRef<StrudelReplPreviewHandle>(null);
  const ipynbNotebookRef = useRef<IpynbNotebookViewHandle>(null);
  const editorPaneRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    snapshot: EditorAiSnapshot;
    anchorRect: DOMRect | null;
    showTranslate: boolean;
    showAiEdit: boolean;
    showRecordNote: boolean;
    showWysiwygEdit?: boolean;
    showMathBlock?: boolean;
    hasSelection: boolean;
    pendingLoc?: string;
  } | null>(null);
  const [noteOverlay, setNoteOverlay] = useState<{
    quote: string;
    loc: string;
    anchorRect: DOMRect | null;
    anchorX: number;
    anchorY: number;
  } | null>(null);
  const [noteSaving, setNoteSaving] = useState(false);
  const [mnoteExists, setMnoteExists] = useState(false);
  const [schemeRunning, setSchemeRunning] = useState(false);
  const [schemeTerminalSessionId, setSchemeTerminalSessionId] = useState<
    string | null
  >(null);
  const [schemeTerminalInitialSymbols, setSchemeTerminalInitialSymbols] =
    useState<string[]>([]);
  const schemeTerminalSessionIdRef = useRef<string | null>(null);
  schemeTerminalSessionIdRef.current = schemeTerminalSessionId;
  const schemeTabContextRef = useRef<SchemeTerminalTabContext | null>(null);
  const isSchemeSourceTabActive = isSchemeSourceTab(
    tab?.kind,
    tab?.relativePath ?? null,
  );
  const chezAvailable = useSchemeChezAvailable();
  const [bunRunning, setBunRunning] = useState(false);
  const [bunTerminalSessionId, setBunTerminalSessionId] = useState<
    string | null
  >(null);
  const [bunTerminalExitCode, setBunTerminalExitCode] = useState<number | null>(
    null,
  );
  const bunTerminalSessionIdRef = useRef<string | null>(null);
  bunTerminalSessionIdRef.current = bunTerminalSessionId;
  const bunTabContextRef = useRef<BunTerminalTabContext | null>(null);
  const isBunSourceTabActive = isBunSourceTab(
    tab?.kind,
    tab?.relativePath ?? null,
  );
  const bunAvailable = useBunAvailable();
  const [pythonRunning, setPythonRunning] = useState(false);
  const [pythonTerminalSessionId, setPythonTerminalSessionId] = useState<
    string | null
  >(null);
  const [pythonTerminalMode, setPythonTerminalMode] =
    useState<PythonPtyMode | null>(null);
  const [pythonTerminalExitCode, setPythonTerminalExitCode] = useState<
    number | null
  >(null);
  const pythonTerminalSessionIdRef = useRef<string | null>(null);
  pythonTerminalSessionIdRef.current = pythonTerminalSessionId;
  const pythonTabContextRef = useRef<PythonTerminalTabContext | null>(null);
  const isPythonSourceTabActive = isPythonSourceTab(
    tab?.kind,
    tab?.relativePath ?? null,
  );
  const pythonAvailable = usePythonAvailable();
  const ipythonAvailable = useIpythonAvailable();
  const { translationPopup, setTranslationPopup, runTranslate } =
    useTabTranslation();

  const sourcePath = tab?.relativePath ?? null;
  const mnotePath =
    sourcePath && isMnoteSourcePath(sourcePath)
      ? companionMnotePath(sourcePath)
      : null;

  useEffect(() => {
    if (!mnotePath || !window.muled?.workspace?.exists) {
      setMnoteExists(false);
      return undefined;
    }

    let cancelled = false;
    const check = () => {
      window.muled.workspace
        .exists(mnotePath)
        .then((result) => {
          if (!cancelled) setMnoteExists(result.exists);
        })
        .catch(() => {
          if (!cancelled) setMnoteExists(false);
        });
    };

    check();
    const unsubscribe = window.muled.workspace.onFilesystemChanged?.(() => {
      check();
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [mnotePath]);

  useEffect(() => {
    return () => {
      disposeSchemeTerminalSession({
        sessionIdRef: schemeTerminalSessionIdRef,
        kill: killSchemePtySession,
      });
      disposeBunTerminalSession({
        sessionIdRef: bunTerminalSessionIdRef,
        kill: killBunPtySession,
      });
      disposePythonTerminalSession({
        sessionIdRef: pythonTerminalSessionIdRef,
        kill: killPythonPtySession,
      });
      setSchemeTerminalSessionId(null);
      setSchemeTerminalInitialSymbols([]);
      setSchemeRunning(false);
      setBunTerminalSessionId(null);
      setBunTerminalExitCode(null);
      setBunRunning(false);
      setPythonTerminalSessionId(null);
      setPythonTerminalMode(null);
      setPythonTerminalExitCode(null);
      setPythonRunning(false);
    };
  }, [tab?.id]);

  useEffect(() => {
    const next: SchemeTerminalTabContext = {
      relativePath: tab?.relativePath ?? null,
      isSchemeSourceTab: isSchemeSourceTabActive,
    };
    const previous = schemeTabContextRef.current;
    schemeTabContextRef.current = next;

    if (
      previous &&
      shouldDisposeSchemeTerminalOnTabContextChange(previous, next) &&
      schemeTerminalSessionIdRef.current
    ) {
      disposeSchemeTerminalSession({
        sessionIdRef: schemeTerminalSessionIdRef,
        kill: killSchemePtySession,
      });
      setSchemeTerminalSessionId(null);
      setSchemeTerminalInitialSymbols([]);
      setSchemeRunning(false);
    }
  }, [tab?.relativePath, isSchemeSourceTabActive]);

  useEffect(() => {
    const next: BunTerminalTabContext = {
      relativePath: tab?.relativePath ?? null,
      isBunSourceTab: isBunSourceTabActive,
    };
    const previous = bunTabContextRef.current;
    bunTabContextRef.current = next;

    if (
      previous &&
      shouldDisposeBunTerminalOnTabContextChange(previous, next) &&
      bunTerminalSessionIdRef.current
    ) {
      disposeBunTerminalSession({
        sessionIdRef: bunTerminalSessionIdRef,
        kill: killBunPtySession,
      });
      setBunTerminalSessionId(null);
      setBunTerminalExitCode(null);
      setBunRunning(false);
    }
  }, [tab?.relativePath, isBunSourceTabActive]);

  useEffect(() => {
    const next: PythonTerminalTabContext = {
      relativePath: tab?.relativePath ?? null,
      isPythonSourceTab: isPythonSourceTabActive,
    };
    const previous = pythonTabContextRef.current;
    pythonTabContextRef.current = next;

    if (
      previous &&
      shouldDisposePythonTerminalOnTabContextChange(previous, next) &&
      pythonTerminalSessionIdRef.current
    ) {
      disposePythonTerminalSession({
        sessionIdRef: pythonTerminalSessionIdRef,
        kill: killPythonPtySession,
      });
      setPythonTerminalSessionId(null);
      setPythonTerminalMode(null);
      setPythonTerminalExitCode(null);
      setPythonRunning(false);
    }
  }, [tab?.relativePath, isPythonSourceTabActive]);

  const handleClosePythonTerminal = useCallback(() => {
    disposePythonTerminalSession({
      sessionIdRef: pythonTerminalSessionIdRef,
      sessionId: pythonTerminalSessionId,
      kill: killPythonPtySession,
    });
    setPythonTerminalSessionId(null);
    setPythonTerminalMode(null);
    setPythonTerminalExitCode(null);
  }, [pythonTerminalSessionId]);

  const handlePythonTerminalExit = useCallback((exitCode: number) => {
    setPythonTerminalExitCode(exitCode);
    if (exitCode !== 0) {
      pushStatusToast(`脚本退出码 ${exitCode}`, 'error');
    }
  }, []);

  const runPythonSession = useCallback(
    async (mode: PythonPtyMode) => {
      if (!tab) return;
      const code = sourceRef.current?.getValue() ?? tab.content;
      const canRunFile = Boolean(tab.relativePath) && !tab.dirty;

      if (pythonTerminalSessionId) {
        await killPythonPtySession(pythonTerminalSessionId);
        setPythonTerminalSessionId(null);
        setPythonTerminalMode(null);
        setPythonTerminalExitCode(null);
      }

      setPythonRunning(true);
      try {
        const sessionId = await createPythonPtySession(
          canRunFile && tab.relativePath
            ? { mode, path: tab.relativePath }
            : { mode, code },
        );
        if (sessionId) {
          if (!canRunFile && tab.relativePath) {
            pushStatusToast('运行未保存内容', 'info');
          }
          setPythonTerminalSessionId(sessionId);
          setPythonTerminalMode(mode);
          setPythonTerminalExitCode(null);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        pushStatusToast(`运行失败：${message}`, 'error');
      } finally {
        setPythonRunning(false);
      }
    },
    [tab, pythonTerminalSessionId],
  );

  const handlePythonRunFile = useCallback(() => {
    void runPythonSession('script');
  }, [runPythonSession]);

  const handlePythonRunRepl = useCallback(() => {
    void runPythonSession('repl');
  }, [runPythonSession]);

  const handleCloseBunTerminal = useCallback(() => {
    disposeBunTerminalSession({
      sessionIdRef: bunTerminalSessionIdRef,
      sessionId: bunTerminalSessionId,
      kill: killBunPtySession,
    });
    setBunTerminalSessionId(null);
    setBunTerminalExitCode(null);
  }, [bunTerminalSessionId]);

  const handleBunTerminalExit = useCallback((exitCode: number) => {
    setBunTerminalExitCode(exitCode);
    if (exitCode !== 0) {
      pushStatusToast(`脚本退出码 ${exitCode}`, 'error');
    }
  }, []);

  const handleBunRun = useCallback(async () => {
    if (!tab) return;
    const code = sourceRef.current?.getValue() ?? tab.content;
    const canRunFile = Boolean(tab.relativePath) && !tab.dirty;
    const language = getSourceLanguageId(tab.relativePath ?? null);

    if (bunTerminalSessionId) {
      await killBunPtySession(bunTerminalSessionId);
      setBunTerminalSessionId(null);
      setBunTerminalExitCode(null);
    }

    setBunRunning(true);
    try {
      const sessionId = await createBunPtySession(
        canRunFile && tab.relativePath
          ? { path: tab.relativePath, language }
          : { code, language },
      );
      if (sessionId) {
        if (!canRunFile && tab.relativePath) {
          pushStatusToast('运行未保存内容', 'info');
        }
        setBunTerminalSessionId(sessionId);
        setBunTerminalExitCode(null);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      pushStatusToast(`运行失败：${message}`, 'error');
    } finally {
      setBunRunning(false);
    }
  }, [tab, bunTerminalSessionId]);

  const handleCloseSchemeTerminal = useCallback(() => {
    disposeSchemeTerminalSession({
      sessionIdRef: schemeTerminalSessionIdRef,
      sessionId: schemeTerminalSessionId,
      kill: killSchemePtySession,
    });
    setSchemeTerminalSessionId(null);
    setSchemeTerminalInitialSymbols([]);
  }, [schemeTerminalSessionId]);

  const handleSchemeTerminalExit = useCallback(() => {
    setSchemeTerminalSessionId(null);
    setSchemeTerminalInitialSymbols([]);
  }, []);

  const handleSchemeRun = useCallback(async () => {
    if (!tab) return;
    const code = sourceRef.current?.getValue() ?? tab.content;
    const canRunFile = Boolean(tab.relativePath) && !tab.dirty;

    if (schemeTerminalSessionId) {
      await killSchemePtySession(schemeTerminalSessionId);
      setSchemeTerminalSessionId(null);
      setSchemeTerminalInitialSymbols([]);
    }

    setSchemeRunning(true);
    try {
      setSchemeTerminalInitialSymbols(extractSchemeTopLevelSymbols(code));
      const sessionId = await createSchemePtySession(
        canRunFile && tab.relativePath
          ? { path: tab.relativePath }
          : { code },
      );
      if (sessionId) {
        if (!canRunFile && tab.relativePath) {
          pushStatusToast('运行未保存内容', 'info');
        }
        setSchemeTerminalSessionId(sessionId);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      pushStatusToast(`运行失败：${message}`, 'error');
    } finally {
      setSchemeRunning(false);
    }
  }, [tab, schemeTerminalSessionId]);

  const getWysiwygContent = useCallback((): string => {
    return mdxRef.current?.getPersistedMarkdown() ?? tab?.content ?? '';
  }, [tab?.content]);

  const getWysiwygLiveContent = useCallback((): string => {
    return mdxRef.current?.getLiveMarkdown() ?? tab?.content ?? '';
  }, [tab?.content]);

  const usesWysiwygEditor = useCallback(
    (kind: EditorTab['kind'], viewMode: EditorViewMode): boolean =>
      (kind === 'markdown' || kind === 'mnote') && viewMode === 'rich-text',
    [],
  );

  const getEditableContent = useCallback((): string => {
    if (!tab || !isEditableTextTab(tab)) return '';
    if (tab.kind === 'markdown' || tab.kind === 'mnote') {
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
    if (tab.kind === 'org' && tab.viewMode === 'source') {
      return sourceRef.current?.getValue() ?? tab.content;
    }
    if (tab.kind === 'csv' && tab.viewMode === 'source') {
      return sourceRef.current?.getValue() ?? tab.content;
    }
    if (tab.kind === 'ipynb' && tab.viewMode === 'source') {
      return sourceRef.current?.getValue() ?? tab.content;
    }
    if (tab.kind === 'ipynb' && tab.viewMode === 'notebook') {
      return ipynbNotebookRef.current?.getContent() ?? tab.content;
    }
    if (tab.kind === 'strudel' && tab.viewMode === 'source') {
      return sourceRef.current?.getValue() ?? tab.content;
    }
    if (tab.kind === 'p5' && tab.viewMode === 'source') {
      return sourceRef.current?.getValue() ?? tab.content;
    }
    if (tab.kind === 'mermaid' && tab.viewMode === 'source') {
      return sourceRef.current?.getValue() ?? tab.content;
    }
    if (tab.kind === 'strudel' && tab.viewMode === 'preview') {
      return strudelReplRef.current?.getCode() ?? tab.content;
    }
    return tab.content;
  }, [getWysiwygContent, tab]);

  const getContentForViewSwitch = useCallback((): string => {
    if (!tab || !isEditableTextTab(tab)) return '';
    if (
      (tab.kind === 'markdown' || tab.kind === 'mnote') &&
      tab.viewMode === 'rich-text'
    ) {
      return getWysiwygLiveContent();
    }
    return getEditableContent();
  }, [getEditableContent, getWysiwygLiveContent, tab]);

  const captureSnapshot = useCallback((): EditorAiSnapshot | null => {
    if (!tab || !isEditableTextTab(tab)) return null;

    const showWysiwyg = usesWysiwygEditor(tab.kind, tab.viewMode);
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

      const current = usesWysiwygEditor(tab.kind, tab.viewMode)
        ? getWysiwygContent()
        : (sourceRef.current?.getValue() ?? tab.content);

      const next = applyAiInEditor(current, snapshot, mode, aiText);
      if (next === null) return null;

      if (usesWysiwygEditor(tab.kind, tab.viewMode)) {
        mdxRef.current?.markUserEdited();
        mdxRef.current?.setMarkdown(
          tab.kind === 'mnote'
            ? prepareMnoteForWysiwyg(next)
            : prepareMarkdownForWysiwyg(next),
        );
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
    return getEditableContent();
  }, [getEditableContent, tab]);

  const appendToEditorEnd = useCallback(
    (text: string) => {
      if (!tab || !isEditableTextTab(tab) || tab.truncated) return;

      const trimmed = text.trim();
      if (!trimmed) return;

      const current = getEditorContent();
      const next = appendTextAtDocumentEnd(current, trimmed);

      if (tab.kind === 'markdown' && tab.viewMode === 'preview') {
        mdxRef.current?.markUserEdited();
        mdxRef.current?.setMarkdown(prepareMarkdownForWysiwyg(next));
      } else if (usesWysiwygEditor(tab.kind, tab.viewMode)) {
        mdxRef.current?.markUserEdited();
        mdxRef.current?.setMarkdown(
          tab.kind === 'mnote'
            ? prepareMnoteForWysiwyg(next)
            : prepareMarkdownForWysiwyg(next),
        );
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
      getContentForViewSwitch,
      appendToEnd: appendToEditorEnd,
    });
    if (tab.kind === 'markdown') {
      registerEditorOutlineHandlers(tab.id, {
        revealOutlineTarget: ({ line, title, hash: _hash }) => {
          if (tab.viewMode === 'source') {
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
    } else {
      registerEditorOutlineHandlers(tab.id, null);
    }
    return () => {
      registerEditorAiHandlers(tab.id, null);
      registerEditorViewHandlers(tab.id, null);
      registerEditorOutlineHandlers(tab.id, null);
    };
  }, [appendToEditorEnd, applyAiResult, captureSnapshot, getContentForViewSwitch, getEditorContent, tab]);

  const handleViewModeChange = useCallback(
    (next: EditorViewMode) => {
      if (!tab || next === tab.viewMode) return;
      if (tab.kind === 'markdown' || tab.kind === 'mnote') {
        const content = getContentForViewSwitch();
        onViewModeChange(tab.id, next, content);
        if (content !== tab.content) {
          onContentChange(content);
        }
        return;
      }
      if (
        tab.kind === 'html' ||
        tab.kind === 'org' ||
        tab.kind === 'csv' ||
        tab.kind === 'ipynb' ||
        tab.kind === 'strudel' ||
        tab.kind === 'p5' ||
        tab.kind === 'mermaid'
      ) {
        let content = tab.content;
        if (tab.viewMode === 'source') {
          content = sourceRef.current?.getValue() ?? tab.content;
        } else if (tab.kind === 'ipynb' && tab.viewMode === 'notebook') {
          content = ipynbNotebookRef.current?.getContent() ?? tab.content;
        } else if (tab.kind === 'strudel' && tab.viewMode === 'preview') {
          content = strudelReplRef.current?.getCode() ?? tab.content;
        }
        onViewModeChange(tab.id, next, content);
        return;
      }
      if (tab.kind === 'docx') {
        onViewModeChange(tab.id, next, tab.content);
      }
    },
    [getContentForViewSwitch, getEditableContent, onContentChange, tab, onViewModeChange],
  );

  const openNoteOverlay = useCallback(
    (input: {
      quote: string;
      loc: string;
      anchorRect: DOMRect | null;
      anchorX: number;
      anchorY: number;
    }) => {
      setNoteOverlay(input);
    },
    [],
  );

  const handleSourceEditorContextMenu = useCallback(
    (e: MouseEvent) => {
      if (!tab || tab.truncated || !tabUsesSourceCodeEditor(tab)) return;

      e.preventDefault();
      e.stopPropagation();

      const captured = captureSnapshot();
      let snapshot: EditorAiSnapshot;
      if (captured) {
        snapshot = captured;
      } else {
        const pos =
          sourceRef.current?.getPositionAtCoords(e.clientX, e.clientY) ??
          sourceRef.current?.getInsertPosition() ??
          null;
        snapshot = {
          selection: '',
          sourceRange: pos != null ? { from: pos, to: pos } : null,
        };
      }

      if (tab.kind === 'markdown') {
        const content = sourceRef.current?.getValue() ?? tab.content;
        const pendingLoc = buildMarkdownMnoteLoc({
          tab,
          sourceRef: sourceRef.current,
          selectionText: snapshot.selection,
          sourceRange: snapshot.sourceRange,
          content,
        });
        setContextMenu({
          x: e.clientX,
          y: e.clientY,
          snapshot,
          anchorRect: null,
          showTranslate: false,
          showAiEdit: true,
          showRecordNote: true,
          hasSelection: Boolean(snapshot.selection.trim()),
          pendingLoc,
        });
        return;
      }

      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        snapshot,
        anchorRect: null,
        showTranslate: false,
        showAiEdit: true,
        showRecordNote: false,
        hasSelection: Boolean(snapshot.selection.trim()),
      });
    },
    [captureSnapshot, tab],
  );

  const handleEditorContextMenu = useCallback(
    (e: MouseEvent) => {
      if (!tab || tab.truncated) return;
      if (tabUsesSourceCodeEditor(tab)) return;

      if (tab.kind === 'markdown' || tab.kind === 'mnote') {
        e.preventDefault();
        mdxRef.current?.restoreContextMenuSelection();

        const isRichText = tab.viewMode === 'rich-text';
        const isPreview = tab.viewMode === 'preview';
        let snapshot: EditorAiSnapshot = { selection: '', sourceRange: null };
        let anchorRect: DOMRect | null = null;
        let showTranslate = false;
        let showAiEdit = false;
        let showRecordNote = tab.kind === 'markdown';
        const selectionMarkdown = isRichText
          ? (mdxRef.current?.getSelectionMarkdown() ?? '')
          : '';
        const hasSelection = Boolean(selectionMarkdown.trim());

        if (isRichText || isPreview) {
          const picked = mdxRef.current?.selectSentenceAtPoint(
            e.clientX,
            e.clientY,
          );
          if (picked?.text.trim()) {
            const current =
              isPreview ? tab.content : getWysiwygContent();
            snapshot = {
              selection: picked.text,
              sourceRange: findSelectionSpan(current, picked.text),
            };
            anchorRect = picked.rect;
            showTranslate = isRichText || isPreview;
            showAiEdit = isRichText;
          } else if (hasSelection) {
            const current = getWysiwygContent();
            snapshot = {
              selection: selectionMarkdown,
              sourceRange: findSelectionSpan(current, selectionMarkdown),
            };
            anchorRect = mdxRef.current?.getSelectionRect() ?? null;
            showAiEdit = isRichText;
          }
        }

        const content =
          isPreview ? tab.content : getWysiwygContent();
        const pendingLoc =
          tab.kind === 'markdown'
            ? buildMarkdownMnoteLoc({
                tab,
                sourceRef: sourceRef.current,
                selectionText: snapshot.selection,
                sourceRange: snapshot.sourceRange,
                content,
              })
            : undefined;

        setContextMenu({
          x: e.clientX,
          y: e.clientY,
          snapshot,
          anchorRect,
          showTranslate,
          showAiEdit,
          showRecordNote,
          showWysiwygEdit: isRichText && !tab.truncated,
          showMathBlock: tab.kind === 'markdown',
          hasSelection,
          pendingLoc,
        });
        return;
      }

      if (!isEditableTextTab(tab)) return;

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
        showRecordNote: false,
        hasSelection: true,
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
      if (!menu) return;

      if (action === 'recordNote') {
        openNoteOverlay({
          quote: menu.snapshot.selection,
          loc: menu.pendingLoc ?? 'lines=1',
          anchorRect: menu.anchorRect,
          anchorX: menu.x,
          anchorY: menu.y,
        });
        return;
      }

      if (action === 'translate') {
        if (!menu.snapshot.selection) return;
        const rect = menu.anchorRect;
        if (!rect) return;
        await runTranslate(menu.snapshot.selection, rect);
        return;
      }

      if (action === 'replace' && !menu.snapshot.selection) return;

      onAiOpen(action, menu.snapshot);
    },
    [contextMenu, onAiOpen, openNoteOverlay, runTranslate],
  );

  const handleWysiwygContextMenuSelect = useCallback(
    async (selection: WysiwygContextMenuSelect) => {
      if (selection.kind === 'edit') {
        setContextMenu(null);
        mdxRef.current?.restoreContextMenuSelection();
        if (runWysiwygEditorAction(selection.action)) {
          mdxRef.current?.markUserEdited();
        }
        return;
      }

      await handleContextMenuSelect(selection.action);
    },
    [handleContextMenuSelect],
  );

  const handleSaveNote = useCallback(
    async (input: { quote: string; body: string; label: string }) => {
      if (!tab?.relativePath || !noteOverlay || !onAppendMnote) return;
      setNoteSaving(true);
      try {
        await onAppendMnote(tab.relativePath, {
          loc: noteOverlay.loc,
          quote: input.quote.trim() || undefined,
          body: input.body.trim() || undefined,
          label: input.label.trim() || undefined,
        });
        setNoteOverlay(null);
        if (mnotePath) setMnoteExists(true);
      } finally {
        setNoteSaving(false);
      }
    },
    [mnotePath, noteOverlay, onAppendMnote, tab?.relativePath],
  );

  const handlePdfRecordNote = useCallback(
    (request: {
      quote: string;
      loc: string;
      anchorRect: DOMRect;
      menuX: number;
      menuY: number;
    }) => {
      openNoteOverlay({
        quote: request.quote,
        loc: request.loc,
        anchorRect: request.anchorRect,
        anchorX: request.menuX,
        anchorY: request.menuY,
      });
    },
    [openNoteOverlay],
  );

  const handlePdfTranslate = useCallback(
    (request: { sentence: string; anchorRect: DOMRect }) => {
      void runTranslate(request.sentence, request.anchorRect);
    },
    [runTranslate],
  );

  const handleHtmlPreviewTranslate = useCallback(
    (request: { sentence: string; anchorRect: DOMRect }) => {
      void runTranslate(request.sentence, request.anchorRect);
    },
    [runTranslate],
  );

  const handleHtmlPreviewRecordNote = useCallback(
    (request: {
      quote: string;
      loc: string;
      anchorRect: DOMRect;
      menuX: number;
      menuY: number;
    }) => {
      openNoteOverlay({
        quote: request.quote,
        loc: request.loc,
        anchorRect: request.anchorRect,
        anchorX: request.menuX,
        anchorY: request.menuY,
      });
    },
    [openNoteOverlay],
  );

  if (!tab) {
    return <div className="TabContent TabContent--empty">无打开的标签页</div>;
  }

  const showWysiwyg =
    tab.kind === 'markdown' && tab.viewMode === 'rich-text';
  const showMnoteWysiwyg =
    tab.kind === 'mnote' && tab.viewMode === 'rich-text';
  const showMnoteSource =
    tab.kind === 'mnote' && tab.viewMode === 'source';
  const showMarkdownPreview =
    tab.kind === 'markdown' && tab.viewMode === 'preview';
  const showHtmlPreview = tab.kind === 'html' && tab.viewMode === 'preview';
  const showOrgPreview = tab.kind === 'org' && tab.viewMode === 'preview';
  const showOrgAgenda = tab.kind === 'org' && tab.viewMode === 'agenda';
  const showTabNavigation =
    !isPane &&
    tabNavigation &&
    onTabNavigateBack &&
    onTabNavigateForward &&
    (tab.kind === 'markdown' ||
      (tab.kind === 'html' && tab.viewMode === 'preview'));
  const showStrudelRepl = tab.kind === 'strudel' && tab.viewMode === 'preview';
  const showP5Preview = tab.kind === 'p5' && tab.viewMode === 'preview';
  const showMermaidPreview = tab.kind === 'mermaid' && tab.viewMode === 'preview';
  const showCsvSpreadsheet = tab.kind === 'csv' && tab.viewMode === 'preview';
  const showIpynbPreview = tab.kind === 'ipynb' && tab.viewMode === 'preview';
  const showIpynbNotebook = tab.kind === 'ipynb' && tab.viewMode === 'notebook';
  const showSource =
    tab.kind === 'text' ||
    (tab.kind === 'org' && tab.viewMode === 'source') ||
    (tab.kind === 'html' && tab.viewMode === 'source') ||
    (tab.kind === 'csv' && tab.viewMode === 'source') ||
    (tab.kind === 'ipynb' && tab.viewMode === 'source') ||
    (tab.kind === 'strudel' && tab.viewMode === 'source') ||
    (tab.kind === 'p5' && tab.viewMode === 'source') ||
    (tab.kind === 'mermaid' && tab.viewMode === 'source') ||
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
      {contextMenu?.showWysiwygEdit ? (
        <WysiwygContextMenu
          open={contextMenu !== null}
          x={contextMenu?.x ?? 0}
          y={contextMenu?.y ?? 0}
          hasSelection={contextMenu?.hasSelection ?? false}
          readOnly={Boolean(tab.truncated)}
          showMathBlock={contextMenu?.showMathBlock ?? true}
          hasApiKey={hasApiKey}
          showTranslate={contextMenu?.showTranslate ?? false}
          showAiEdit={contextMenu?.showAiEdit ?? true}
          showRecordNote={contextMenu?.showRecordNote ?? false}
          onClose={() => setContextMenu(null)}
          onSelect={(selection) => {
            void handleWysiwygContextMenuSelect(selection);
          }}
        />
      ) : (
        <EditorContextMenu
          open={contextMenu !== null}
          x={contextMenu?.x ?? 0}
          y={contextMenu?.y ?? 0}
          hasSelection={Boolean(contextMenu?.snapshot.selection)}
          hasApiKey={hasApiKey}
          showTranslate={contextMenu?.showTranslate ?? false}
          showAiEdit={contextMenu?.showAiEdit ?? true}
          showRecordNote={contextMenu?.showRecordNote ?? false}
          onClose={() => setContextMenu(null)}
          onSelect={handleContextMenuSelect}
        />
      )}
      <TranslationPopup
        popup={translationPopup}
        onClose={() => setTranslationPopup(null)}
      />
      <NoteRecordingOverlay
        open={noteOverlay !== null}
        quote={noteOverlay?.quote ?? ''}
        anchorRect={noteOverlay?.anchorRect ?? null}
        anchorX={noteOverlay?.anchorX ?? 0}
        anchorY={noteOverlay?.anchorY ?? 0}
        saving={noteSaving}
        onClose={() => setNoteOverlay(null)}
        onSave={(input) => {
          void handleSaveNote(input);
        }}
      />
      <header className="TabContent__header">
        <div className="TabContent__headerLeft">
          {showTabNavigation ? (
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
          {!isPane && mnotePath && mnoteExists && onOpenMnoteSplit && (
            <button
              type="button"
              className="TabContent__mnoteButton"
              title="打开笔记（分屏）"
              aria-label="打开笔记"
              onClick={() => onOpenMnoteSplit(tab.relativePath!)}
            >
              笔记
            </button>
          )}
          {tab.kind === 'markdown' && (
            <EditorViewSwitch
              viewMode={tab.viewMode}
              disabled={tab.truncated}
              onChange={handleViewModeChange}
            />
          )}
          {tab.kind === 'mnote' && (
            <EditorViewSwitch
              viewMode={tab.viewMode}
              disabled={tab.truncated}
              showPreview={false}
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
          {tab.kind === 'org' && (
            <OrgViewSwitch
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
          {tab.kind === 'strudel' && (
            <StrudelViewSwitch
              viewMode={tab.viewMode}
              disabled={tab.truncated}
              onChange={handleViewModeChange}
            />
          )}
          {tab.kind === 'p5' && (
            <P5ViewSwitch
              viewMode={tab.viewMode}
              disabled={tab.truncated}
              onChange={handleViewModeChange}
            />
          )}
          {tab.kind === 'mermaid' && (
            <MermaidViewSwitch
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
          {!isPane && isBunSourceTabActive && bunAvailable && (
            <button
              type="button"
              className="TabContent__run"
              disabled={bunRunning || tab.truncated}
              title="运行当前文件 (Bun)"
              aria-label="运行 JavaScript/TypeScript 文件"
              aria-busy={bunRunning}
              onClick={() => {
                void handleBunRun();
              }}
            >
              <RunIcon size={11} />
              <span>{bunRunning ? '运行中…' : '运行'}</span>
            </button>
          )}
          {!isPane && isSchemeSourceTabActive && chezAvailable && (
            <button
              type="button"
              className="TabContent__run"
              disabled={schemeRunning || tab.truncated}
              title="运行当前文件 (Chez Scheme)"
              aria-label="运行 Scheme 文件"
              aria-busy={schemeRunning}
              onClick={() => {
                void handleSchemeRun();
              }}
            >
              <RunIcon size={11} />
              <span>{schemeRunning ? '运行中…' : '运行'}</span>
            </button>
          )}
          {!isPane &&
            isPythonSourceTabActive &&
            (pythonAvailable || ipythonAvailable) && (
              <div className="TabContent__runGroup">
                {pythonAvailable && (
                  <button
                    type="button"
                    className="TabContent__run TabContent__run--iconOnly"
                    disabled={pythonRunning || tab.truncated}
                    title="运行 Python 文件"
                    aria-label="运行 Python 文件"
                    aria-busy={pythonRunning}
                    onClick={() => {
                      handlePythonRunFile();
                    }}
                  >
                    <RunIcon size={11} />
                  </button>
                )}
                {ipythonAvailable && (
                  <button
                    type="button"
                    className="TabContent__run TabContent__run--iconOnly"
                    disabled={pythonRunning || tab.truncated}
                    title="在 IPython 中运行"
                    aria-label="在 IPython 中运行"
                    aria-busy={pythonRunning}
                    onClick={() => {
                      handlePythonRunRepl();
                    }}
                  >
                    <IpythonIcon size={11} />
                  </button>
                )}
              </div>
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
        ) : tab.kind === 'mnote' ? (
          <div
            ref={editorPaneRef}
            className="TabContent__editorPane"
            style={editorPaneFontVars(sourceFont, wysiwygFont)}
          >
            {showMnoteWysiwyg && (
              <MarkdownEditor
                ref={mdxRef}
                variant="mnote"
                tabKey={`${tab.id}:${tab.relativePath ?? 'untitled'}:wysiwyg`}
                markdown={tab.content}
                relativePath={tab.relativePath}
                readOnly={tab.truncated}
                onChange={onContentChange}
                onOpenFile={onOpenFileFromEditor}
                onMnoteEntryClick={onMnoteEntryClick}
                activeMnoteEntryId={activeMnoteEntryId}
              />
            )}
            {showMnoteSource && (
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
                onContextMenu={handleSourceEditorContextMenu}
              />
            )}
          </div>
        ) : tab.kind === 'pdf' ? (
          <PdfViewer
            tab={tab}
            hasApiKey={hasApiKey}
            onTranslate={handlePdfTranslate}
            onRecordNote={onAppendMnote ? handlePdfRecordNote : undefined}
            onCopySelectionToOtherPane={onCopyPdfSelectionToOtherPane}
            onPdfPageChange={onPdfPageChange}
            onPdfRevealComplete={onClearMnoteReveal}
            mnotePageHighlights={mnotePagePdfHighlights}
            activeMnoteEntryId={activeMnoteEntryId}
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
          <HtmlPreview
            tab={tab}
            workspaceRoot={workspaceRoot}
            hasApiKey={hasApiKey}
            showNote={Boolean(onAppendMnote && tab.relativePath)}
            onTranslate={handleHtmlPreviewTranslate}
            onRecordNote={
              onAppendMnote ? handleHtmlPreviewRecordNote : undefined
            }
            onNavigatePage={(target) => {
              onHtmlPreviewNavigate?.(target.readPath, target.hash || undefined);
            }}
            onClearHtmlPreviewHash={() => {
              onClearHtmlPreviewHash?.(tab.id);
            }}
          />
        ) : tab.kind === 'org' && showOrgAgenda ? (
          <OrgAgenda tab={tab} />
        ) : tab.kind === 'org' && showOrgPreview ? (
          <OrgPreview tab={tab} />
        ) : showStrudelRepl ? (
          <StrudelReplPreview
            ref={strudelReplRef}
            tab={tab}
            sourceFont={sourceFont}
          />
        ) : showP5Preview ? (
          <P5Preview tab={tab} />
        ) : showMermaidPreview ? (
          <MermaidPreview tab={tab} />
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
                onContextMenu={handleSourceEditorContextMenu}
              />
            </div>
          </CsvTabView>
        ) : showIpynbNotebook ? (
          <div className="TabContent__editorPane">
            <IpynbNotebookView
              ref={ipynbNotebookRef}
              notebookKey={tab.id}
              workspaceRoot={workspaceRoot}
              content={tab.content}
              readOnly={tab.truncated}
              keybindingMode={tab.keybindingMode}
              sourceFont={sourceFont}
              onChange={onContentChange}
            />
          </div>
        ) : showIpynbPreview ? (
          <IpynbPreview tab={tab} sourceFont={sourceFont} />
        ) : tab.kind === 'sqlite3' ? (
          <DatabaseView tab={tab} engine="sqlite" />
        ) : tab.kind === 'duckdb' ? (
          <DatabaseView tab={tab} engine="duckdb" />
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
            {showSource && tab.kind !== 'csv' &&
              (isSchemeSourceTabActive ? (
                <SchemeSourceLayout
                  terminalSessionId={schemeTerminalSessionId}
                  terminalInitialSymbols={schemeTerminalInitialSymbols}
                  onCloseTerminal={handleCloseSchemeTerminal}
                  onTerminalExit={handleSchemeTerminalExit}
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
                    mnoteQuoteHighlight={mnoteQuoteEditorHighlight}
                    onRevealComplete={onClearMnoteReveal}
                    onChange={onContentChange}
                    onContextMenu={handleSourceEditorContextMenu}
                    schemeEnvSymbols={schemeTerminalInitialSymbols}
                  />
                </SchemeSourceLayout>
              ) : isBunSourceTabActive ? (
                <BunSourceLayout
                  terminalSessionId={bunTerminalSessionId}
                  terminalExitCode={bunTerminalExitCode}
                  onCloseTerminal={handleCloseBunTerminal}
                  onTerminalExit={handleBunTerminalExit}
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
                    mnoteQuoteHighlight={mnoteQuoteEditorHighlight}
                    onRevealComplete={onClearMnoteReveal}
                    onChange={onContentChange}
                    onContextMenu={handleSourceEditorContextMenu}
                  />
                </BunSourceLayout>
              ) : isPythonSourceTabActive ? (
                <PythonSourceLayout
                  terminalSessionId={pythonTerminalSessionId}
                  terminalMode={pythonTerminalMode}
                  terminalExitCode={pythonTerminalExitCode}
                  onCloseTerminal={handleClosePythonTerminal}
                  onTerminalExit={handlePythonTerminalExit}
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
                    mnoteQuoteHighlight={mnoteQuoteEditorHighlight}
                    onRevealComplete={onClearMnoteReveal}
                    onChange={onContentChange}
                    onContextMenu={handleSourceEditorContextMenu}
                  />
                </PythonSourceLayout>
              ) : (
                <SourceCodeEditor
                  ref={sourceRef}
                  tabId={tab.id}
                  tabKey={`${tab.id}:${tab.relativePath ?? 'untitled'}:source`}
                  value={tab.content}
                  relativePath={tab.relativePath}
                  keybindingMode={tab.keybindingMode}
                  readOnly={tab.truncated}
                  reveal={tab.reveal ?? null}
                  mnoteQuoteHighlight={mnoteQuoteEditorHighlight}
                  onRevealComplete={onClearMnoteReveal}
                  onChange={onContentChange}
                  onContextMenu={handleSourceEditorContextMenu}
                />
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
