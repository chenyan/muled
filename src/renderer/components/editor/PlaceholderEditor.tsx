import type { EditorTab } from '../../types/tab';

interface PlaceholderEditorProps {
  tab: EditorTab;
  onChange: (content: string) => void;
}

/** P1 占位编辑器，P2 替换为 MDXEditor */
export default function PlaceholderEditor({
  tab,
  onChange,
}: PlaceholderEditorProps) {
  return (
    <div className="PlaceholderEditor">
      {tab.truncated && (
        <div className="PlaceholderEditor__banner">
          文件已截断（仅加载前 {Math.round(tab.fileSize / 1024 / 1024)}MB
          中可读部分）。只读，不可保存。
        </div>
      )}
      <textarea
        className="PlaceholderEditor__area"
        value={tab.content}
        readOnly={tab.truncated}
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
        placeholder="从左侧选择文件，或在此输入…"
      />
    </div>
  );
}
