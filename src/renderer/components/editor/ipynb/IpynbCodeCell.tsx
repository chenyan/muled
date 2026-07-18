import type { EditorMode } from '../../../../shared/types/config';
import type { IpynbCell, IpynbOutput } from '../../../../shared/types/ipynb';
import type { IpynbCellExecutionStatus } from '../../../../shared/types/ipynb';
import IpynbCellEditor from './IpynbCellEditor';
import IpynbCellHeader, { type IpynbCellChromeProps } from './IpynbCellHeader';
import IpynbCellOutput from './IpynbCellOutput';

interface IpynbCodeCellProps extends IpynbCellChromeProps {
  cell: IpynbCell;
  languageId: string;
  keybindingMode: EditorMode;
  executionStatus?: IpynbCellExecutionStatus;
  kernelConnected: boolean;
  liveOutputs?: IpynbOutput[];
  onChange: (source: string) => void;
  onRun?: () => void;
  onShiftEnter?: () => void;
}

export default function IpynbCodeCell({
  cell,
  languageId,
  keybindingMode,
  readOnly,
  executionStatus = 'idle',
  kernelConnected,
  liveOutputs,
  onChange,
  onRun,
  onShiftEnter,
  ...chrome
}: IpynbCodeCellProps) {
  const handleShiftEnter = () => {
    if (
      kernelConnected &&
      onRun &&
      executionStatus !== 'running' &&
      executionStatus !== 'queued'
    ) {
      onRun();
    }
    onShiftEnter?.();
  };

  const runButton =
    !readOnly ? (
      <button
        type="button"
        className="IpynbCellHeader__run"
        disabled={
          !kernelConnected ||
          executionStatus === 'running' ||
          executionStatus === 'queued'
        }
        title="运行 cell (Shift+Enter)"
        aria-label="运行 cell"
        onClick={() => onRun?.()}
      >
        ▶
      </button>
    ) : null;

  return (
    <div
      className={`IpynbCodeCell${executionStatus === 'running' || executionStatus === 'queued' ? ' IpynbCodeCell--running' : ''}`}
    >
      <IpynbCellHeader
        {...chrome}
        cellType="code"
        readOnly={readOnly}
        trailing={runButton}
      />
      <div className="IpynbCodeCell__editor">
        <IpynbCellEditor
          cellKey={cell.id ?? 'code'}
          value={cell.source}
          languageId={languageId}
          keybindingMode={keybindingMode}
          readOnly={readOnly}
          minLines={2}
          onChange={onChange}
          onShiftEnter={handleShiftEnter}
        />
      </div>
      <IpynbCellOutput outputs={liveOutputs ?? cell.outputs ?? []} />
    </div>
  );
}
