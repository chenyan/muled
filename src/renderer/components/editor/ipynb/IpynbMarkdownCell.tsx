import { useEffect, useMemo, useRef, useState } from 'react';
import 'katex/dist/katex.min.css';
import type { EditorMode } from '../../../../shared/types/config';
import type { IpynbCell } from '../../../../shared/types/ipynb';
import { useWysiwygTheme } from '../../../hooks/useAppTheme';
import { highlightNotebookMarkdownCodeBlocks } from '../../../lib/notebookHighlighter';
import {
  enhanceNotebookMarkdownElement,
  renderNotebookMarkdownHtml,
} from '../../../lib/notebookMarkdownPreview';
import IpynbCellEditor from './IpynbCellEditor';
import IpynbCellHeader, { type IpynbCellChromeProps } from './IpynbCellHeader';

interface IpynbMarkdownCellProps extends IpynbCellChromeProps {
  cell: IpynbCell;
  keybindingMode: EditorMode;
  onChange: (source: string) => void;
  onShiftEnter?: () => void;
}

export default function IpynbMarkdownCell({
  cell,
  keybindingMode,
  readOnly,
  onChange,
  onShiftEnter,
  ...chrome
}: IpynbMarkdownCellProps) {
  const [editing, setEditing] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const wysiwygTheme = useWysiwygTheme();

  const html = useMemo(
    () => renderNotebookMarkdownHtml(cell.source),
    [cell.source],
  );

  useEffect(() => {
    if (editing) return undefined;
    const container = previewRef.current;
    if (!container) return undefined;
    container.innerHTML = html;
    highlightNotebookMarkdownCodeBlocks(container);
    void enhanceNotebookMarkdownElement(container, wysiwygTheme, {
      math: false,
      mermaid: true,
    });
    return undefined;
  }, [html, editing, wysiwygTheme]);

  const editButton = !readOnly ? (
    <button
      type="button"
      className="IpynbCellHeader__action"
      onClick={() => setEditing((value) => !value)}
    >
      {editing ? '完成' : '编辑'}
    </button>
  ) : null;

  if (editing && !readOnly) {
    return (
      <div className="IpynbMarkdownCell IpynbMarkdownCell--editing">
        <IpynbCellHeader
          {...chrome}
          cellType="markdown"
          readOnly={readOnly}
          trailing={editButton}
        />
        <div className="IpynbMarkdownCell__body">
          <IpynbCellEditor
            cellKey={`${cell.id}:edit`}
            value={cell.source}
            languageId="markdown"
            keybindingMode={keybindingMode}
            readOnly={false}
            minLines={3}
            onChange={onChange}
            onShiftEnter={() => {
              setEditing(false);
              onShiftEnter?.();
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className="IpynbMarkdownCell"
      onDoubleClick={() => {
        if (!readOnly) setEditing(true);
      }}
    >
      <IpynbCellHeader
        {...chrome}
        cellType="markdown"
        readOnly={readOnly}
        trailing={editButton}
      />
      <div className="IpynbMarkdownCell__body">
        <div ref={previewRef} className="IpynbMarkdownCell__preview" />
      </div>
    </div>
  );
}
