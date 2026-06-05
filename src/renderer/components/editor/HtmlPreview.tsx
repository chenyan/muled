import { useMemo } from 'react';
import {
  buildHtmlPreviewDocument,
  htmlPreviewBaseHref,
} from '../../lib/htmlPreviewDocument';
import type { EditorTab } from '../../types/tab';

interface HtmlPreviewProps {
  tab: EditorTab;
  workspaceRoot: string;
}

export default function HtmlPreview({ tab, workspaceRoot }: HtmlPreviewProps) {
  const srcDoc = useMemo(() => {
    const baseHref =
      tab.relativePath && workspaceRoot
        ? htmlPreviewBaseHref(workspaceRoot, tab.relativePath)
        : undefined;
    return buildHtmlPreviewDocument(
      tab.content,
      baseHref ?? 'about:blank',
    );
  }, [tab.content, tab.relativePath, workspaceRoot]);

  return (
    <iframe
      className="HtmlPreview"
      title="HTML 预览"
      sandbox="allow-scripts allow-same-origin"
      srcDoc={srcDoc}
    />
  );
}
