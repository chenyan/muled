import { useCallback, useState } from 'react';
import type { IpynbKernelStatus } from '../../../../shared/types/ipynb';
import type {
  JupyterServerKernelInfo,
  KernelSpec,
  LocalKernelSpec,
} from '../../../../shared/types/ipynbKernel';
import { isLocalKernelSpec } from '../../../../shared/types/ipynbKernel';
import { listJupyterServerKernels } from '../../../lib/ipynb/ipynbClient';

interface IpynbKernelPickerProps {
  kernels: KernelSpec[];
  selectedSpecId: string | null;
  kernelStatus: IpynbKernelStatus;
  kernelErrorMessage: string | null;
  disabled: boolean;
  onSelect: (specId: string) => void;
  onConnectJupyterServer: (args: {
    serverUrl: string;
    kernel: JupyterServerKernelInfo;
  }) => void;
}

const STATUS_LABEL: Record<IpynbKernelStatus, string> = {
  disconnected: '未连接',
  connecting: '连接中',
  idle: '空闲',
  busy: '运行中',
  error: '错误',
};

function kernelOptionTitle(kernel: KernelSpec): string {
  if (isLocalKernelSpec(kernel)) {
    return kernel.pythonPath;
  }
  return `${kernel.serverUrl} · ${kernel.kernelId}`;
}

export default function IpynbKernelPicker({
  kernels,
  selectedSpecId,
  kernelStatus,
  kernelErrorMessage,
  disabled,
  onSelect,
  onConnectJupyterServer,
}: IpynbKernelPickerProps) {
  const selected = kernels.find((k) => k.id === selectedSpecId) ?? null;
  const [showJupyterPanel, setShowJupyterPanel] = useState(false);
  const [serverUrl, setServerUrl] = useState('http://127.0.0.1:8888/?token=');
  const [remoteKernels, setRemoteKernels] = useState<JupyterServerKernelInfo[]>(
    [],
  );
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [resolvedServerUrl, setResolvedServerUrl] = useState<string | null>(
    null,
  );

  const refreshRemoteKernels = useCallback(async () => {
    setRemoteLoading(true);
    setRemoteError(null);
    try {
      const result = await listJupyterServerKernels({ serverUrl });
      if ('error' in result) {
        setRemoteKernels([]);
        setResolvedServerUrl(null);
        setRemoteError(result.error);
        return;
      }
      setRemoteKernels(result.kernels);
      setResolvedServerUrl(result.serverUrl);
      if (result.kernels.length === 0) {
        setRemoteError('该 Jupyter Server 上没有正在运行的 Kernel');
      }
    } finally {
      setRemoteLoading(false);
    }
  }, [serverUrl]);

  const localKernels = kernels.filter(isLocalKernelSpec) as LocalKernelSpec[];

  return (
    <div className="IpynbKernelPicker">
      <div className="IpynbKernelPicker__row">
        <label className="IpynbKernelPicker__label">
          <span className="IpynbKernelPicker__status" data-status={kernelStatus}>
            {STATUS_LABEL[kernelStatus]}
          </span>
          <select
            className="IpynbKernelPicker__select"
            value={selectedSpecId ?? ''}
            disabled={disabled || kernels.length === 0}
            aria-label="选择 Kernel"
            title={selected ? kernelOptionTitle(selected) : undefined}
            onChange={(e) => {
              if (e.target.value) {
                onSelect(e.target.value);
              }
            }}
          >
            <option value="" disabled>
              {kernels.length === 0 ? '未找到 Kernel' : '选择 Kernel…'}
            </option>
            {localKernels.length > 0 ? (
              <optgroup label="本地 Python">
                {localKernels.map((kernel) => (
                  <option
                    key={kernel.id}
                    value={kernel.id}
                    title={kernel.pythonPath}
                  >
                    {kernel.displayName}
                  </option>
                ))}
              </optgroup>
            ) : null}
            {kernels
              .filter((kernel) => kernel.kind === 'jupyter-server')
              .map((kernel) => (
                <option
                  key={kernel.id}
                  value={kernel.id}
                  title={kernelOptionTitle(kernel)}
                >
                  {kernel.displayName}
                </option>
              ))}
          </select>
        </label>
        {selected && isLocalKernelSpec(selected) && !selected.hasIpython ? (
          <span className="IpynbKernelPicker__hint">
            无 IPython，仅支持基础 exec 执行
          </span>
        ) : null}
        <button
          type="button"
          className="IpynbKernelPicker__jupyterBtn"
          disabled={disabled}
          onClick={() => setShowJupyterPanel((open) => !open)}
        >
          Jupyter Server…
        </button>
      </div>

      {showJupyterPanel ? (
        <div className="IpynbKernelPicker__jupyterPanel">
          <label className="IpynbKernelPicker__field">
            <span>Server URL（含 token 查询参数）</span>
            <input
              type="url"
              value={serverUrl}
              disabled={disabled || remoteLoading}
              placeholder="http://127.0.0.1:8888/?token=..."
              onChange={(e) => setServerUrl(e.target.value)}
            />
          </label>
          <div className="IpynbKernelPicker__jupyterActions">
            <button
              type="button"
              className="IpynbKernelPicker__jupyterRefresh"
              disabled={disabled || remoteLoading || !serverUrl.trim()}
              onClick={() => {
                void refreshRemoteKernels();
              }}
            >
              {remoteLoading ? '获取中…' : '获取 Kernel 列表'}
            </button>
          </div>
          {remoteError ? (
            <p className="IpynbKernelPicker__error" role="alert">
              {remoteError}
            </p>
          ) : null}
          {remoteKernels.length > 0 && resolvedServerUrl ? (
            <ul className="IpynbKernelPicker__remoteList">
              {remoteKernels.map((kernel) => (
                <li key={kernel.id}>
                  <button
                    type="button"
                    className="IpynbKernelPicker__remoteItem"
                    disabled={disabled || kernelStatus === 'connecting'}
                    onClick={() => {
                      onConnectJupyterServer({
                        serverUrl: resolvedServerUrl,
                        kernel,
                      });
                      setShowJupyterPanel(false);
                    }}
                  >
                    <span className="IpynbKernelPicker__remoteName">
                      {kernel.displayName}
                    </span>
                    <span className="IpynbKernelPicker__remoteId">
                      {kernel.id}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {kernelErrorMessage ? (
        <p className="IpynbKernelPicker__error" role="alert">
          {kernelErrorMessage}
        </p>
      ) : null}
    </div>
  );
}
