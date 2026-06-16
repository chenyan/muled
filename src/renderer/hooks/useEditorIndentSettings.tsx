import { createContext, useContext, type ReactNode } from 'react';
import {
  DEFAULT_EDITOR_INDENT,
  type EditorIndentSettings,
} from '../../shared/editorIndentConfig';

const EditorIndentContext = createContext<EditorIndentSettings>(
  DEFAULT_EDITOR_INDENT,
);

export function EditorIndentProvider({
  value,
  children,
}: {
  value: EditorIndentSettings;
  children: ReactNode;
}) {
  return (
    <EditorIndentContext.Provider value={value}>
      {children}
    </EditorIndentContext.Provider>
  );
}

export function useEditorIndentSettings(): EditorIndentSettings {
  return useContext(EditorIndentContext);
}
