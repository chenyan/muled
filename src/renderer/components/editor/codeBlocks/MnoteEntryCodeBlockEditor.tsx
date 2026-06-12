import {
  type CodeBlockEditorProps,
  useCodeBlockEditorContext,
} from '@mdxeditor/editor';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  parseMnoteEntryBlock,
  serializeMnoteEntryInterior,
} from '../../../lib/mnoteFormat';
import useCodeBlockFocus, {
  useTextareaAutoHeight,
} from './useCodeBlockFocus';
import { useMnoteEntryInteraction } from '../../mnote/MnoteEntryInteractionContext';
import '../../mnote/mnoteEntryShared.css';
import './MnoteEntryCodeBlockEditor.css';

/** WYSIWYG：mnote-entry 整体块（元数据 + 摘录 + 批注） */
export default function MnoteEntryCodeBlockEditor({
  code,
  focusEmitter,
}: CodeBlockEditorProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const quoteRef = useRef<HTMLTextAreaElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const { setCode } = useCodeBlockEditorContext();
  const { onEntryClick, activeEntryId, onEdit } = useMnoteEntryInteraction();
  const parsed = useMemo(() => parseMnoteEntryBlock(code), [code]);
  const meta = parsed.meta;
  const [quote, setQuote] = useState(parsed.quote ?? '');
  const [body, setBody] = useState(parsed.body ?? '');

  useEffect(() => {
    const next = parseMnoteEntryBlock(code);
    setQuote(next.quote ?? '');
    setBody(next.body ?? '');
  }, [code]);

  useCodeBlockFocus(focusEmitter, rootRef);
  useTextareaAutoHeight(quoteRef, quote);
  useTextareaAutoHeight(bodyRef, body);

  const isActive = Boolean(meta?.id && activeEntryId === meta.id);
  const canNavigate = Boolean(meta && onEntryClick);

  const commit = useCallback(
    (nextQuote: string, nextBody: string) => {
      if (!meta) return;
      onEdit?.();
      setCode(
        serializeMnoteEntryInterior({
          ...meta,
          quote: nextQuote,
          body: nextBody,
        }),
      );
    },
    [meta, onEdit, setCode],
  );

  const handleNavigate = () => {
    if (!meta || !onEntryClick) return;
    onEntryClick({
      ...meta,
      quote,
      body,
    });
  };

  return (
    <div
      ref={rootRef}
      className={`MnoteEntryCodeBlockEditor${isActive ? ' MnoteEntryCodeBlockEditor--active' : ''}`}
      data-mnote-entry-id={meta?.id}
      role="group"
      aria-label={meta?.label ? `笔记条目 ${meta.label}` : '笔记条目'}
    >
      <div
        className={`MnoteEntryCodeBlockEditor__meta${canNavigate ? ' MnoteEntryCodeBlockEditor__meta--navigable' : ''}`}
        role={canNavigate ? 'button' : undefined}
        tabIndex={canNavigate ? 0 : undefined}
        aria-label="跳转到源文档位置"
        onClick={
          canNavigate
            ? (event) => {
                event.stopPropagation();
                handleNavigate();
              }
            : undefined
        }
        onKeyDown={
          canNavigate
            ? (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  handleNavigate();
                }
              }
            : undefined
        }
      >
        <div className="MnoteEntryMeta__header">
          <span className="MnoteEntryMeta__entryId">
            {meta?.id ?? '未知条目'}
          </span>
          {meta?.label ? (
            <span className="MnoteEntryMeta__label">{meta.label}</span>
          ) : null}
          {canNavigate ? (
            <span className="MnoteEntryCodeBlockEditor__jumpHint">跳转源文档</span>
          ) : null}
        </div>
        {meta?.loc ? (
          <div className="MnoteEntryMeta__loc">{meta.loc}</div>
        ) : null}
      </div>

      <textarea
        ref={quoteRef}
        className="MnoteEntryCodeBlockEditor__quote"
        value={quote}
        placeholder="摘录"
        rows={1}
        aria-label="摘录"
        onChange={(event) => {
          const next = event.target.value;
          setQuote(next);
          commit(next, body);
        }}
        onClick={(event) => event.stopPropagation()}
      />

      <textarea
        ref={bodyRef}
        className="MnoteEntryCodeBlockEditor__body"
        value={body}
        placeholder="笔记"
        rows={1}
        aria-label="笔记"
        onChange={(event) => {
          const next = event.target.value;
          setBody(next);
          commit(quote, next);
        }}
        onClick={(event) => event.stopPropagation()}
      />
    </div>
  );
}
