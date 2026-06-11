import { type CodeBlockEditorProps } from '@mdxeditor/editor';
import { useMemo, useRef } from 'react';
import { parseMnoteEntryMeta } from '../../../lib/mnoteFormat';
import useCodeBlockFocus from './useCodeBlockFocus';
import '../../mnote/mnoteEntryShared.css';
import './MnoteEntryCodeBlockEditor.css';

/** WYSIWYG：mnote-entry 元数据条（只读）；摘录与批注由 MDXEditor 正文编辑 */
export default function MnoteEntryCodeBlockEditor({
  code,
  focusEmitter,
}: CodeBlockEditorProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const meta = useMemo(() => parseMnoteEntryMeta(code), [code]);

  useCodeBlockFocus(focusEmitter, rootRef);

  return (
    <div
      ref={rootRef}
      className="MnoteEntryCodeBlockEditor"
      data-mnote-entry-id={meta?.id}
      tabIndex={0}
      role="group"
      aria-label={meta?.label ? `笔记条目 ${meta.label}` : '笔记条目'}
    >
      <div className="MnoteEntryMeta__header">
        <span className="MnoteEntryMeta__entryId">
          {meta?.id ?? '未知条目'}
        </span>
        {meta?.label ? (
          <span className="MnoteEntryMeta__label">{meta.label}</span>
        ) : null}
      </div>
      {meta?.loc ? (
        <div className="MnoteEntryMeta__loc">{meta.loc}</div>
      ) : null}
    </div>
  );
}
