import type { ReactNode } from 'react';
import type { IpynbCellType } from '../../../../shared/types/ipynb';

export interface IpynbCellChromeProps {
  index: number;
  total: number;
  readOnly: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onChangeType: (type: IpynbCellType) => void;
}

interface IpynbCellHeaderProps extends IpynbCellChromeProps {
  cellType: IpynbCellType;
  leading?: ReactNode;
  trailing?: ReactNode;
}

const CELL_TYPE_LABELS: Record<IpynbCellType, string> = {
  code: 'Code',
  markdown: 'Markdown',
  raw: 'Raw',
};

export default function IpynbCellHeader({
  cellType,
  index,
  total,
  readOnly,
  leading,
  trailing,
  onMoveUp,
  onMoveDown,
  onDelete,
  onChangeType,
}: IpynbCellHeaderProps) {
  return (
    <div className="IpynbCellHeader">
      <span className="IpynbCellHeader__index">[{index + 1}]</span>
      <select
        className="IpynbCellHeader__type"
        value={cellType}
        disabled={readOnly}
        aria-label="Cell 类型"
        onChange={(e) => onChangeType(e.target.value as IpynbCellType)}
      >
        {(Object.keys(CELL_TYPE_LABELS) as IpynbCellType[]).map((type) => (
          <option key={type} value={type}>
            {CELL_TYPE_LABELS[type]}
          </option>
        ))}
      </select>
      {leading ? <div className="IpynbCellHeader__leading">{leading}</div> : null}
      <div className="IpynbCellHeader__actions">
        <button
          type="button"
          className="IpynbCellHeader__btn"
          disabled={readOnly || index === 0}
          title="上移"
          aria-label="上移 cell"
          onClick={onMoveUp}
        >
          ↑
        </button>
        <button
          type="button"
          className="IpynbCellHeader__btn"
          disabled={readOnly || index >= total - 1}
          title="下移"
          aria-label="下移 cell"
          onClick={onMoveDown}
        >
          ↓
        </button>
        <button
          type="button"
          className="IpynbCellHeader__btn IpynbCellHeader__btn--danger"
          disabled={readOnly}
          title="删除"
          aria-label="删除 cell"
          onClick={onDelete}
        >
          ×
        </button>
        {trailing}
      </div>
    </div>
  );
}
