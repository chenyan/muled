import type { IpynbCellType, IpynbKernelStatus } from '../../../../shared/types/ipynb';
import type {
  JupyterServerKernelInfo,
  KernelSpec,
} from '../../../../shared/types/ipynbKernel';
import IpynbKernelPicker from './IpynbKernelPicker';

interface IpynbNotebookToolbarProps {
  readOnly: boolean;
  kernels: KernelSpec[];
  selectedSpecId: string | null;
  kernelStatus: IpynbKernelStatus;
  kernelErrorMessage: string | null;
  runningCellId: string | null;
  onSelectKernel: (specId: string) => void;
  onConnectJupyterServer: (args: {
    serverUrl: string;
    kernel: JupyterServerKernelInfo;
  }) => void;
  onRestartKernel: () => void;
  onInterrupt: () => void;
  onRunAll: () => void;
  onAddCell: (type: IpynbCellType) => void;
}

export default function IpynbNotebookToolbar({
  readOnly,
  kernels,
  selectedSpecId,
  kernelStatus,
  kernelErrorMessage,
  runningCellId,
  onSelectKernel,
  onConnectJupyterServer,
  onRestartKernel,
  onInterrupt,
  onRunAll,
  onAddCell,
}: IpynbNotebookToolbarProps) {
  const kernelConnected =
    kernelStatus === 'idle' || kernelStatus === 'busy' || kernelStatus === 'error';

  return (
    <div className="IpynbNotebookToolbar">
      <div className="IpynbNotebookToolbar__kernel">
        <IpynbKernelPicker
          kernels={kernels}
          selectedSpecId={selectedSpecId}
          kernelStatus={kernelStatus}
          kernelErrorMessage={kernelErrorMessage}
          disabled={readOnly}
          onSelect={onSelectKernel}
          onConnectJupyterServer={onConnectJupyterServer}
        />
      </div>
      <div className="IpynbNotebookToolbar__actions">
        <button
          type="button"
          className="IpynbNotebookToolbar__btn"
          disabled={readOnly || !kernelConnected}
          title="重启 Kernel"
          onClick={onRestartKernel}
        >
          ↻
        </button>
        <button
          type="button"
          className="IpynbNotebookToolbar__btn"
          disabled={readOnly || kernelStatus !== 'busy'}
          title="中断"
          onClick={onInterrupt}
        >
          ■
        </button>
        <button
          type="button"
          className="IpynbNotebookToolbar__btn"
          disabled={readOnly || !kernelConnected || Boolean(runningCellId)}
          title="运行全部 Code Cell"
          onClick={onRunAll}
        >
          ▶▶
        </button>
        <span className="IpynbNotebookToolbar__sep" aria-hidden />
        <button
          type="button"
          className="IpynbNotebookToolbar__btn"
          disabled={readOnly}
          onClick={() => onAddCell('code')}
        >
          + Code
        </button>
        <button
          type="button"
          className="IpynbNotebookToolbar__btn"
          disabled={readOnly}
          onClick={() => onAddCell('markdown')}
        >
          + Markdown
        </button>
        <button
          type="button"
          className="IpynbNotebookToolbar__btn"
          disabled={readOnly}
          onClick={() => onAddCell('raw')}
        >
          + Raw
        </button>
      </div>
    </div>
  );
}
