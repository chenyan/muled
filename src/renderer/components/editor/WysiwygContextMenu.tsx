import { useEffect, useRef, type ReactNode } from 'react';
import FloatingContextMenuPortal from '../tree/FloatingContextMenuPortal';
import type { EditorContextMenuAction } from '../ai/EditorContextMenu';
import type { WysiwygEditorAction } from '../../lib/wysiwygEditorActions';
import './WysiwygContextMenu.css';

export type WysiwygContextMenuSelect =
  | { kind: 'edit'; action: WysiwygEditorAction }
  | { kind: 'ai'; action: EditorContextMenuAction };

interface WysiwygContextMenuProps {
  open: boolean;
  x: number;
  y: number;
  hasSelection: boolean;
  readOnly?: boolean;
  showMathBlock?: boolean;
  hasApiKey: boolean;
  showTranslate?: boolean;
  showAiEdit?: boolean;
  showRecordNote?: boolean;
  onSelect: (selection: WysiwygContextMenuSelect) => void;
  onClose: () => void;
}

function Submenu({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="WysiwygContextMenu__submenu">
      <div
        className="WysiwygContextMenu__submenuTrigger"
        role="menuitem"
        aria-haspopup="menu"
      >
        {label}
      </div>
      <div className="WysiwygContextMenu__submenuPanel" role="menu">
        {children}
      </div>
    </div>
  );
}

function MenuItem({
  label,
  disabled,
  title,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  title?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className="WysiwygContextMenu__item"
      disabled={disabled}
      title={title}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export default function WysiwygContextMenu({
  open,
  x,
  y,
  hasSelection,
  readOnly = false,
  showMathBlock = true,
  hasApiKey,
  showTranslate = false,
  showAiEdit = true,
  showRecordNote = false,
  onSelect,
  onClose,
}: WysiwygContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const onPointerDown = (event: MouseEvent) => {
      const el = menuRef.current;
      if (el && !el.contains(event.target as Node)) {
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('mousedown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('mousedown', onPointerDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const editDisabled = readOnly;
  const selectionRequired = !hasSelection;
  const appendDisabled = !hasApiKey;
  const replaceDisabled = !hasSelection || !hasApiKey;
  const translateDisabled = !hasSelection || !hasApiKey;
  const appendTitle = !hasApiKey ? '未配置 OpenAI API Key' : undefined;
  const replaceTitle = (() => {
    if (!hasSelection) return '请先选中文字';
    if (!hasApiKey) return '未配置 OpenAI API Key';
    return undefined;
  })();
  const translateTitle = replaceTitle;

  const pickEdit = (action: WysiwygEditorAction) => {
    onSelect({ kind: 'edit', action });
  };

  const pickAi = (action: EditorContextMenuAction) => {
    onSelect({ kind: 'ai', action });
  };

  const showAiSection = showTranslate || showAiEdit || showRecordNote;

  return (
    <FloatingContextMenuPortal
      x={x}
      y={y}
      className="WysiwygContextMenu WysiwygContextMenu--floating"
      role="menu"
    >
      <div ref={menuRef}>
        <MenuItem
          label="剪切"
          disabled={editDisabled || selectionRequired}
          title={selectionRequired ? '请先选中文字' : undefined}
          onClick={() => pickEdit('cut')}
        />
        <MenuItem
          label="复制"
          disabled={selectionRequired}
          title={selectionRequired ? '请先选中文字' : undefined}
          onClick={() => pickEdit('copy')}
        />
        <MenuItem
          label="粘贴"
          disabled={editDisabled}
          onClick={() => pickEdit('paste')}
        />
        <MenuItem
          label="粘贴为纯文本"
          disabled={editDisabled}
          onClick={() => pickEdit('pastePlainText')}
        />

        <div className="WysiwygContextMenu__separator" role="separator" />

        <Submenu label="文本格式">
          <MenuItem
            label="加粗"
            disabled={editDisabled}
            onClick={() => pickEdit('bold')}
          />
          <MenuItem
            label="倾斜"
            disabled={editDisabled}
            onClick={() => pickEdit('italic')}
          />
          <MenuItem
            label="删除线"
            disabled={editDisabled}
            onClick={() => pickEdit('strikethrough')}
          />
          <MenuItem
            label="高亮"
            disabled={editDisabled}
            onClick={() => pickEdit('highlight')}
          />
          <MenuItem
            label="代码"
            disabled={editDisabled}
            onClick={() => pickEdit('code')}
          />
          <MenuItem
            label="公式"
            disabled={editDisabled}
            onClick={() => pickEdit('inlineMath')}
          />
          <MenuItem
            label="注释"
            disabled={editDisabled}
            onClick={() => pickEdit('comment')}
          />
          <MenuItem
            label="清除格式"
            disabled={editDisabled || selectionRequired}
            title={selectionRequired ? '请先选中文字' : undefined}
            onClick={() => pickEdit('clearFormat')}
          />
        </Submenu>

        <Submenu label="段落设置">
          <MenuItem
            label="正文"
            disabled={editDisabled}
            onClick={() => pickEdit('paragraph')}
          />
          <MenuItem
            label="引用"
            disabled={editDisabled}
            onClick={() => pickEdit('quote')}
          />
        </Submenu>

        <Submenu label="插入">
          <MenuItem
            label="表格"
            disabled={editDisabled}
            onClick={() => pickEdit('insertTable')}
          />
          <MenuItem
            label="代码块"
            disabled={editDisabled}
            onClick={() => pickEdit('insertCodeBlock')}
          />
          {showMathBlock ? (
            <MenuItem
              label="数学块"
              disabled={editDisabled}
              onClick={() => pickEdit('insertMathBlock')}
            />
          ) : null}
        </Submenu>

        {showAiSection ? (
          <>
            <div className="WysiwygContextMenu__separator" role="separator" />
            {showTranslate ? (
              <MenuItem
                label="翻译该句"
                disabled={translateDisabled}
                title={translateTitle}
                onClick={() => pickAi('translate')}
              />
            ) : null}
            {showAiEdit ? (
              <>
                <MenuItem
                  label="Chat Append"
                  disabled={appendDisabled}
                  title={appendTitle}
                  onClick={() => pickAi('append')}
                />
                <MenuItem
                  label="Chat Replace"
                  disabled={replaceDisabled}
                  title={replaceTitle}
                  onClick={() => pickAi('replace')}
                />
              </>
            ) : null}
            {showRecordNote ? (
              <MenuItem
                label="记录笔记"
                onClick={() => pickAi('recordNote')}
              />
            ) : null}
          </>
        ) : null}
      </div>
    </FloatingContextMenuPortal>
  );
}
