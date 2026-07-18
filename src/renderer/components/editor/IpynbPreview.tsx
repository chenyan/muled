import { useEffect, useMemo, useRef } from 'react';
import 'katex/dist/katex.min.css';
import {
  IpynbRenderError,
  renderIpynbToElement,
} from '../../lib/renderIpynb';
import { renderNotebookMermaidInElement } from '../../lib/notebookMarkdownPreview';
import { useWysiwygTheme } from '../../hooks/useAppTheme';
import type { EditorFontSettings } from '../../../shared/types/config';
import { sourceEditorFontVars } from '../../lib/editorFontStyle';
import type { EditorTab } from '../../types/tab';
import './IpynbPreview.css';

interface IpynbPreviewProps {
  tab: EditorTab;
  sourceFont: EditorFontSettings;
}

export default function IpynbPreview({ tab, sourceFont }: IpynbPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wysiwygTheme = useWysiwygTheme();
  const renderResult = useMemo(() => {
    try {
      return {
        error: null as string | null,
        node: renderIpynbToElement(tab.content),
      };
    } catch (e) {
      return {
        error:
          e instanceof IpynbRenderError
            ? e.message
            : '无法渲染 Jupyter Notebook',
        node: null,
      };
    }
  }, [tab.content]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || renderResult.error || !renderResult.node) {
      return undefined;
    }

    container.replaceChildren(renderResult.node);
    void renderNotebookMermaidInElement(renderResult.node, wysiwygTheme);
    return () => {
      container.replaceChildren();
    };
  }, [renderResult, wysiwygTheme]);

  if (renderResult.error) {
    return (
      <div
        className="IpynbPreview"
        style={sourceEditorFontVars(sourceFont)}
      >
        <div className="IpynbPreview__inner">
          <p className="IpynbPreview__error" role="alert">
            {renderResult.error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="IpynbPreview" style={sourceEditorFontVars(sourceFont)}>
      <div ref={containerRef} className="IpynbPreview__inner" />
    </div>
  );
}
