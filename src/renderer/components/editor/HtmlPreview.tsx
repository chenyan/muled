import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildHtmlPreviewMnoteLoc } from '../../lib/buildHtmlPreviewMnoteLoc';
import {
  buildHtmlPreviewDocument,
  HTML_PREVIEW_CONTEXT_MENU_MESSAGE,
  HTML_PREVIEW_NAVIGATE_MESSAGE,
  htmlPreviewBaseHref,
} from '../../lib/htmlPreviewDocument';
import {
  decodeHtmlBytes,
  HTML_PREVIEW_DEFAULT_ENCODING,
  HTML_PREVIEW_ENCODINGS,
} from '../../lib/htmlPreviewEncodings';
import {
  type HtmlPreviewLoadTarget,
  resolveHtmlPreviewLoadTarget,
  scrollHtmlPreviewToHash,
} from '../../lib/htmlPreviewNavigate';
import { workspaceAbsolutePath } from '../../lib/workspaceAbsolutePath';
import type { EditorTab } from '../../types/tab';
import HtmlPreviewContextMenu, {
  type HtmlPreviewContextMenuAction,
} from './HtmlPreviewContextMenu';

export interface HtmlPreviewTranslateRequest {
  sentence: string;
  anchorRect: DOMRect;
}

export interface HtmlPreviewRecordNoteRequest {
  quote: string;
  loc: string;
  anchorRect: DOMRect;
  menuX: number;
  menuY: number;
}

interface HtmlPreviewProps {
  tab: EditorTab;
  workspaceRoot: string;
  hasApiKey: boolean;
  showNote?: boolean;
  onTranslate?: (request: HtmlPreviewTranslateRequest) => void;
  onRecordNote?: (request: HtmlPreviewRecordNoteRequest) => void;
}

function getIframeSelectionText(iframe: HTMLIFrameElement | null): string {
  return iframe?.contentDocument?.getSelection()?.toString() ?? '';
}

function getIframeSelectionAnchorRect(
  iframe: HTMLIFrameElement | null,
): DOMRect | null {
  if (!iframe) return null;
  const sel = iframe.contentDocument?.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
  const rect = sel.getRangeAt(0).getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;
  const iframeRect = iframe.getBoundingClientRect();
  return new DOMRect(
    iframeRect.left + rect.left,
    iframeRect.top + rect.top,
    Math.max(rect.width, 1),
    Math.max(rect.height, 1),
  );
}

function previewTargetFromTab(
  tab: EditorTab,
  workspaceRoot: string,
): HtmlPreviewLoadTarget | null {
  if (!tab.relativePath || !workspaceRoot) return null;
  const absolutePath = workspaceAbsolutePath(workspaceRoot, tab.relativePath);
  return {
    readPath: tab.relativePath,
    absolutePath,
    baseHref: htmlPreviewBaseHref(workspaceRoot, tab.relativePath),
    hash: '',
  };
}

export default function HtmlPreview({
  tab,
  workspaceRoot,
  hasApiKey,
  showNote = false,
  onTranslate,
  onRecordNote,
}: HtmlPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const pendingHashRef = useRef('');
  const [encoding, setEncoding] = useState(HTML_PREVIEW_DEFAULT_ENCODING);
  const [previewTarget, setPreviewTarget] = useState<HtmlPreviewLoadTarget | null>(
    () => previewTargetFromTab(tab, workspaceRoot),
  );
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    selection: string;
  } | null>(null);
  const [diskHtml, setDiskHtml] = useState<string | null>(null);
  const [diskLoadState, setDiskLoadState] = useState<
    'idle' | 'loading' | 'error'
  >('idle');

  const isInitialDirtyTab =
    tab.dirty &&
    previewTarget?.readPath === (tab.relativePath ?? '');

  useEffect(() => {
    pendingHashRef.current = '';
    setPreviewTarget(previewTargetFromTab(tab, workspaceRoot));
    setEncoding(HTML_PREVIEW_DEFAULT_ENCODING);
  }, [tab.id, tab.relativePath, workspaceRoot]);

  useEffect(() => {
    if (!previewTarget || isInitialDirtyTab) {
      setDiskHtml(null);
      setDiskLoadState('idle');
      return undefined;
    }

    let cancelled = false;
    setDiskLoadState('loading');

    void (async () => {
      try {
        if (!window.muled?.file?.readBytes) {
          throw new Error('readBytes unavailable');
        }
        const { data } = await window.muled.file.readBytes(previewTarget.readPath);
        if (cancelled) return;
        setDiskHtml(decodeHtmlBytes(data, encoding));
        setDiskLoadState('idle');
      } catch {
        if (cancelled) return;
        setDiskHtml(null);
        setDiskLoadState('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    encoding,
    isInitialDirtyTab,
    previewTarget,
  ]);

  const baseHref = previewTarget?.baseHref ?? 'about:blank';

  const previewSourceContent = isInitialDirtyTab
    ? tab.content
    : diskHtml ?? tab.content;

  const srcDoc = useMemo(() => {
    if (isInitialDirtyTab) {
      return buildHtmlPreviewDocument(tab.content, baseHref);
    }
    if (!previewTarget) {
      return buildHtmlPreviewDocument(tab.content, baseHref);
    }
    if (diskLoadState === 'error') {
      return buildHtmlPreviewDocument('<p>无法加载预览文件</p>', baseHref);
    }
    if (diskLoadState === 'loading' || diskHtml === null) {
      return buildHtmlPreviewDocument('<p>加载中…</p>', baseHref);
    }
    return buildHtmlPreviewDocument(diskHtml, baseHref);
  }, [
    baseHref,
    diskHtml,
    diskLoadState,
    isInitialDirtyTab,
    previewTarget,
    tab.content,
  ]);

  const handleNavigate = useCallback(
    (href: string, navigateBaseHref?: string) => {
      const target = resolveHtmlPreviewLoadTarget(
        href,
        workspaceRoot,
        navigateBaseHref ?? previewTarget?.baseHref,
      );
      if (!target) {
        return;
      }

      if (target.absolutePath === previewTarget?.absolutePath) {
        if (target.hash) {
          scrollHtmlPreviewToHash(
            iframeRef.current?.contentDocument,
            target.hash,
          );
        }
        return;
      }

      setContextMenu(null);
      pendingHashRef.current = target.hash;
      setPreviewTarget(target);
    },
    [previewTarget, workspaceRoot],
  );

  const openContextMenu = useCallback(
    (x: number, y: number, selectionFromMessage?: string) => {
      const selection =
        selectionFromMessage?.trim() ||
        getIframeSelectionText(iframeRef.current).trim();
      setContextMenu({ x, y, selection });
    },
    [],
  );

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const iframe = iframeRef.current;
      if (!iframe?.contentWindow || event.source !== iframe.contentWindow) {
        return;
      }
      if (event.data?.type === HTML_PREVIEW_NAVIGATE_MESSAGE) {
        if (typeof event.data.href === 'string') {
          const navigateBaseHref =
            typeof event.data.baseHref === 'string' && event.data.baseHref
              ? event.data.baseHref
              : undefined;
          handleNavigate(event.data.href, navigateBaseHref);
        }
        return;
      }
      if (event.data?.type !== HTML_PREVIEW_CONTEXT_MENU_MESSAGE) {
        return;
      }
      const rect = iframe.getBoundingClientRect();
      openContextMenu(
        rect.left + Number(event.data.x),
        rect.top + Number(event.data.y),
        typeof event.data.selection === 'string'
          ? event.data.selection
          : undefined,
      );
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [handleNavigate, openContextMenu]);

  useEffect(() => {
    const hash = pendingHashRef.current;
    if (!hash || isInitialDirtyTab) {
      return undefined;
    }
    if (diskLoadState !== 'idle' || diskHtml === null) {
      return undefined;
    }

    const iframe = iframeRef.current;
    if (!iframe?.contentDocument) {
      return undefined;
    }

    const frameId = requestAnimationFrame(() => {
      if (
        scrollHtmlPreviewToHash(iframe.contentDocument, hash)
      ) {
        pendingHashRef.current = '';
      }
    });
    return () => cancelAnimationFrame(frameId);
  }, [diskHtml, diskLoadState, isInitialDirtyTab, srcDoc]);

  useEffect(() => {
    if (!contextMenu) return undefined;

    const closeMenu = () => setContextMenu(null);

    const attachIframeListeners = (): (() => void) => {
      const doc = iframeRef.current?.contentDocument;
      if (!doc) return () => undefined;
      doc.addEventListener('pointerdown', closeMenu, true);
      doc.addEventListener('contextmenu', closeMenu, true);
      return () => {
        doc.removeEventListener('pointerdown', closeMenu, true);
        doc.removeEventListener('contextmenu', closeMenu, true);
      };
    };

    let detachIframe = attachIframeListeners();
    const iframe = iframeRef.current;
    const onIframeLoad = () => {
      detachIframe();
      detachIframe = attachIframeListeners();
    };
    iframe?.addEventListener('load', onIframeLoad);

    return () => {
      detachIframe();
      iframe?.removeEventListener('load', onIframeLoad);
    };
  }, [contextMenu, srcDoc]);

  const handleWrapperContextMenu = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      openContextMenu(event.clientX, event.clientY);
    },
    [openContextMenu],
  );

  const handleMenuSelect = useCallback(
    async (action: HtmlPreviewContextMenuAction) => {
      const menu = contextMenu;
      setContextMenu(null);
      if (!menu) return;

      if (action.kind === 'encoding') {
        setEncoding(action.encodingId);
        return;
      }

      const selection = menu.selection.trim();
      const anchorRect =
        getIframeSelectionAnchorRect(iframeRef.current) ??
        new DOMRect(menu.x, menu.y, 1, 1);

      if (action.kind === 'copy') {
        if (!selection) return;
        await navigator.clipboard.writeText(selection);
        return;
      }

      if (action.kind === 'translate') {
        if (!selection || !onTranslate) return;
        onTranslate({ sentence: selection, anchorRect });
        return;
      }

      if (action.kind === 'note') {
        if (!onRecordNote) return;
        onRecordNote({
          quote: selection,
          loc: buildHtmlPreviewMnoteLoc(previewSourceContent, selection),
          anchorRect,
          menuX: menu.x,
          menuY: menu.y,
        });
      }
    },
    [contextMenu, onRecordNote, onTranslate, previewSourceContent],
  );

  return (
    <div className="HtmlPreviewHost" onContextMenu={handleWrapperContextMenu}>
      <iframe
        ref={iframeRef}
        className="HtmlPreview"
        title="HTML 预览"
        sandbox="allow-scripts allow-same-origin"
        srcDoc={srcDoc}
      />
      {contextMenu ? (
        <HtmlPreviewContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          encoding={encoding}
          encodings={HTML_PREVIEW_ENCODINGS}
          encodingDisabled={isInitialDirtyTab}
          hasSelection={Boolean(contextMenu.selection.trim())}
          hasApiKey={hasApiKey}
          showNote={showNote}
          onSelect={(action) => {
            void handleMenuSelect(action);
          }}
          onClose={() => setContextMenu(null)}
        />
      ) : null}
    </div>
  );
}
