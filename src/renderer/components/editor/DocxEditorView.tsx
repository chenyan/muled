import { useEffect, useMemo, useRef } from 'react';
import { DocxEditor, type DocxEditorRef } from '@eigenpal/docx-editor-react';
import '@eigenpal/docx-editor-react/styles.css';
import './DocxEditorView.css';
import type { EditorViewMode } from '../../../shared/types/config';
import { dataUrlToArrayBuffer } from '../../lib/dataUrl';
import { registerDocxEditorHandlers } from '../../lib/editorDocxBridge';
import type { EditorTab } from '../../types/tab';

interface DocxEditorViewProps {
  tab: EditorTab;
  viewMode: EditorViewMode;
  onDirty: () => void;
}

export default function DocxEditorView({
  tab,
  viewMode,
  onDirty,
}: DocxEditorViewProps) {
  const editorRef = useRef<DocxEditorRef>(null);
  const buffer = useMemo(() => {
    if (!tab.docxSrc) return null;
    return dataUrlToArrayBuffer(tab.docxSrc);
  }, [tab.docxSrc]);

  const isEditing = viewMode === 'rich-text';

  useEffect(() => {
    registerDocxEditorHandlers(tab.id, {
      saveToBuffer: () => editorRef.current?.save() ?? Promise.resolve(null),
    });
    return () => registerDocxEditorHandlers(tab.id, null);
  }, [tab.id]);

  if (!buffer) {
    return (
      <div className="DocxEditorView DocxEditorView--loading">加载 DOCX…</div>
    );
  }

  return (
    <div className="DocxEditorView">
      <DocxEditor
        ref={editorRef}
        className="DocxEditorView__editor"
        documentBuffer={buffer}
        mode={isEditing ? 'editing' : 'viewing'}
        readOnly={!isEditing}
        showToolbar={isEditing}
        showZoomControl
        onChange={() => {
          if (isEditing) onDirty();
        }}
      />
    </div>
  );
}
