import type { EditorMode } from '../../../../shared/types/config';
import type { IpynbCell } from '../../../../shared/types/ipynb';
import IpynbCellEditor from './IpynbCellEditor';
import IpynbCellHeader, { type IpynbCellChromeProps } from './IpynbCellHeader';

interface IpynbRawCellProps extends IpynbCellChromeProps {
  cell: IpynbCell;
  keybindingMode: EditorMode;
  onChange: (source: string) => void;
}

export default function IpynbRawCell({
  cell,
  keybindingMode,
  readOnly,
  onChange,
  ...chrome
}: IpynbRawCellProps) {
  return (
    <div className="IpynbRawCell">
      <IpynbCellHeader {...chrome} cellType="raw" readOnly={readOnly} />
      <div className="IpynbRawCell__body">
        <IpynbCellEditor
          cellKey={cell.id ?? 'raw'}
          value={cell.source}
          languageId="text"
          keybindingMode={keybindingMode}
          readOnly={readOnly}
          minLines={2}
          onChange={onChange}
        />
      </div>
    </div>
  );
}
