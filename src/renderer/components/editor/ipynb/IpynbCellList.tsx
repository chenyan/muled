import type { CSSProperties } from 'react';
import type { EditorMode } from '../../../../shared/types/config';
import type {
  IpynbCell,
  IpynbCellExecutionStatus,
  IpynbCellType,
  IpynbOutput,
} from '../../../../shared/types/ipynb';
import { getNotebookLanguage } from '../../../../shared/ipynb/nbformat';
import type { IpynbDocument } from '../../../../shared/types/ipynb';
import { ipynbCellSessionRunTintPercent } from '../../../lib/ipynb/ipynbCellSessionRuns';
import IpynbCodeCell from './IpynbCodeCell';
import IpynbMarkdownCell from './IpynbMarkdownCell';
import IpynbRawCell from './IpynbRawCell';

interface IpynbCellListProps {
  doc: IpynbDocument;
  keybindingMode: EditorMode;
  readOnly: boolean;
  kernelConnected: boolean;
  cellStatuses: Record<string, IpynbCellExecutionStatus>;
  cellSessionRunCounts: Record<string, number>;
  liveOutputsByCellId: Record<string, IpynbOutput[]>;
  liveOutputTick: number;
  onUpdateSource: (cellId: string, source: string) => void;
  onRunCell: (cellId: string) => void;
  onMoveCell: (cellId: string, direction: 'up' | 'down') => void;
  onDeleteCell: (cellId: string) => void;
  onChangeCellType: (cellId: string, type: IpynbCellType) => void;
  onFocusNextCell: (index: number) => void;
}

export default function IpynbCellList({
  doc,
  keybindingMode,
  readOnly,
  kernelConnected,
  cellStatuses,
  cellSessionRunCounts,
  liveOutputsByCellId,
  liveOutputTick,
  onUpdateSource,
  onRunCell,
  onMoveCell,
  onDeleteCell,
  onChangeCellType,
  onFocusNextCell,
}: IpynbCellListProps) {
  void liveOutputTick;
  const languageId = getNotebookLanguage(doc);

  const renderCell = (cell: IpynbCell, index: number) => {
    const cellId = cell.id ?? `cell-${index}`;
    const handleShiftEnter = () => onFocusNextCell(index);
    const status = cellStatuses[cellId] ?? 'idle';
    const sessionRuns = cellSessionRunCounts[cellId] ?? 0;
    const sessionRunStyle =
      sessionRuns > 0
        ? ({
            '--ipynb-cell-session-tint': ipynbCellSessionRunTintPercent(
              sessionRuns,
            ),
          } as CSSProperties)
        : undefined;

    const chrome = {
      index,
      total: doc.cells.length,
      readOnly,
      onMoveUp: () => onMoveCell(cellId, 'up'),
      onMoveDown: () => onMoveCell(cellId, 'down'),
      onDelete: () => onDeleteCell(cellId),
      onChangeType: (type: IpynbCellType) => onChangeCellType(cellId, type),
    };

    let body;
    if (cell.cell_type === 'markdown') {
      body = (
        <IpynbMarkdownCell
          cell={cell}
          keybindingMode={keybindingMode}
          {...chrome}
          onChange={(source) => onUpdateSource(cellId, source)}
          onShiftEnter={handleShiftEnter}
        />
      );
    } else if (cell.cell_type === 'raw') {
      body = (
        <IpynbRawCell
          cell={cell}
          keybindingMode={keybindingMode}
          {...chrome}
          onChange={(source) => onUpdateSource(cellId, source)}
        />
      );
    } else {
      body = (
        <IpynbCodeCell
          cell={cell}
          languageId={languageId}
          keybindingMode={keybindingMode}
          executionStatus={status}
          kernelConnected={kernelConnected}
          liveOutputs={liveOutputsByCellId[cellId]}
          {...chrome}
          onChange={(source) => onUpdateSource(cellId, source)}
          onRun={() => onRunCell(cellId)}
          onShiftEnter={handleShiftEnter}
        />
      );
    }

    return (
      <section
        key={cellId}
        className={`IpynbCell IpynbCell--${cell.cell_type}`}
        data-cell-id={cellId}
        data-session-runs={sessionRuns}
        style={sessionRunStyle}
      >
        {body}
      </section>
    );
  };

  return (
    <div className="IpynbCellList">
      {doc.cells.map((cell, index) => renderCell(cell, index))}
    </div>
  );
}
