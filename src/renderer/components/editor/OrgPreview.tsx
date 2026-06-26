import { useEffect, useMemo, useRef } from 'react';
import { useAppTheme } from '../../hooks/useAppTheme';
import { HTML_PREVIEW_WHEEL_MESSAGE } from '../../lib/htmlPreviewDocument';
import { buildOrgPreviewDocument } from '../../lib/orgPreviewDocument';
import { readOrgPreviewThemeVars } from '../../lib/orgPreviewTheme';
import { registerEditorOutlineHandlers } from '../../lib/editorOutlineBridge';
import {
  noteIframeWheelScroll,
  useWheelScrollOnlyWhenGestureStartsIn,
} from '../../lib/wheelScrollOnlyWhenGestureStartsIn';
import type { EditorTab } from '../../types/tab';

interface OrgPreviewProps {
  tab: EditorTab;
}

function scrollOrgPreviewToHeadingTitle(
  doc: Document | null | undefined,
  title: string,
): boolean {
  if (!doc) return false;
  const normalize = (text: string) =>
    text.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  const targetTitle = normalize(title);
  if (!targetTitle) return false;
  const headingNodes = Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5, h6'));
  const matched = headingNodes.find(
    (node) => normalize(node.textContent ?? '') === targetTitle,
  );
  if (!(matched instanceof HTMLElement)) return false;
  matched.scrollIntoView();
  return true;
}

export default function OrgPreview({ tab }: OrgPreviewProps) {
  const { resolved } = useAppTheme();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  useWheelScrollOnlyWhenGestureStartsIn(hostRef);

  const themeVars = useMemo(
    () => readOrgPreviewThemeVars(),
    [resolved.ui],
  );

  const srcDoc = useMemo(
    () =>
      buildOrgPreviewDocument(tab.content, {
        uiTheme: resolved.ui,
        themeVars,
      }),
    [tab.content, resolved.ui, themeVars],
  );

  useEffect(() => {
    registerEditorOutlineHandlers(tab.id, {
      revealOutlineTarget: ({ title, line }) => {
        if (tab.kind !== 'org' || tab.viewMode === 'source') {
          return false;
        }
        const doc = iframeRef.current?.contentDocument;
        if (doc && scrollOrgPreviewToHeadingTitle(doc, title)) {
          return true;
        }
        if (line) {
          const headingNodes = Array.from(
            doc?.querySelectorAll('h1, h2, h3, h4, h5, h6') ?? [],
          );
          const index = Math.max(0, line - 1);
          const node = headingNodes[index];
          if (node instanceof HTMLElement) {
            node.scrollIntoView();
            return true;
          }
        }
        return false;
      },
    });
    return () => {
      registerEditorOutlineHandlers(tab.id, null);
    };
  }, [tab.id, tab.kind, tab.viewMode]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      const data = event.data as { type?: string; x?: number; y?: number };
      if (data?.type !== HTML_PREVIEW_WHEEL_MESSAGE) return;
      if (typeof data.x !== 'number' || typeof data.y !== 'number') return;
      noteIframeWheelScroll(data.x, data.y);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  return (
    <div ref={hostRef} className="OrgPreviewHost">
      <iframe
        ref={iframeRef}
        className="OrgPreview"
        title="Org 预览"
        sandbox="allow-same-origin"
        srcDoc={srcDoc}
      />
    </div>
  );
}
