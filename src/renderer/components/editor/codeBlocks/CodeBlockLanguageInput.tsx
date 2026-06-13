import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type RefObject,
} from 'react';

type CodeBlockLanguageInputProps = {
  language: string;
  onLanguageChange: (language: string) => void;
  inputRef?: RefObject<HTMLInputElement | null>;
  onEditingChange?: (editing: boolean) => void;
  className?: string;
};

/** WYSIWYG 代码块顶栏语言输入，写回 fenced code block 的 language。 */
export default function CodeBlockLanguageInput({
  language,
  onLanguageChange,
  inputRef,
  onEditingChange,
  className = 'MuledPlainCodeBlock__label',
}: CodeBlockLanguageInputProps) {
  const [draft, setDraft] = useState(language);
  const localRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  useEffect(() => {
    setDraft(language);
  }, [language]);

  const commit = useCallback(() => {
    const next = draft.trim();
    if (next !== language) {
      onLanguageChange(next);
      return;
    }
    setDraft(language);
  }, [draft, language, onLanguageChange]);

  const setRefs = useCallback(
    (node: HTMLInputElement | null) => {
      localRef.current = node;
      if (inputRef) {
        inputRef.current = node;
      }
    },
    [inputRef],
  );

  const endEditing = useCallback(() => {
    onEditingChange?.(false);
    commit();
  }, [commit, onEditingChange]);

  return (
    <input
      ref={setRefs}
      id={inputId}
      type="text"
      className={className}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onFocus={() => onEditingChange?.(true)}
      onBlur={endEditing}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === 'Enter') {
          event.preventDefault();
          commit();
          event.currentTarget.blur();
        } else if (event.key === 'Escape') {
          event.preventDefault();
          setDraft(language);
          event.currentTarget.blur();
        }
      }}
      onKeyUp={(event) => event.stopPropagation()}
      aria-label="代码块语言"
      spellCheck={false}
      autoCapitalize="off"
      autoCorrect="off"
      placeholder="plain"
    />
  );
}
