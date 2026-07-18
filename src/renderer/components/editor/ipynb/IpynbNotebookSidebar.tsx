import type { IpynbKernelStatus } from '../../../../shared/types/ipynb';
import type {
  IpynbKernelVariable,
  KernelSpec,
} from '../../../../shared/types/ipynbKernel';
import {
  isJupyterServerKernelSpec,
  isLocalKernelSpec,
} from '../../../../shared/types/ipynbKernel';
import { formatBytes } from '../../../../shared/formatBytes';
import RefreshIcon from '../../icons/RefreshIcon';

interface IpynbNotebookSidebarProps {
  kernelStatus: IpynbKernelStatus;
  kernelErrorMessage: string | null;
  selectedKernel: KernelSpec | null;
  memoryBytes: number | null;
  variables: IpynbKernelVariable[];
  inspectLoading: boolean;
  kernelConnected: boolean;
  onRefresh: () => void;
}

const STATUS_LABEL: Record<IpynbKernelStatus, string> = {
  disconnected: '未连接',
  connecting: '连接中',
  idle: '空闲',
  busy: '运行中',
  error: '错误',
};

export default function IpynbNotebookSidebar({
  kernelStatus,
  kernelErrorMessage,
  selectedKernel,
  memoryBytes,
  variables,
  inspectLoading,
  kernelConnected,
  onRefresh,
}: IpynbNotebookSidebarProps) {
  return (
    <aside className="IpynbNotebookSidebar" aria-label="Kernel 与变量">
      <section className="IpynbNotebookSidebar__section">
        <div className="IpynbNotebookSidebar__sectionHeader">
          <button
            type="button"
            className={`IpynbNotebookSidebar__refresh${inspectLoading ? ' IpynbNotebookSidebar__refresh--spinning' : ''}`}
            disabled={!kernelConnected || inspectLoading}
            title="刷新变量与内存"
            aria-label={inspectLoading ? '刷新中' : '刷新变量与内存'}
            onClick={onRefresh}
          >
            <RefreshIcon />
          </button>
          <h3 className="IpynbNotebookSidebar__title">Kernel</h3>
        </div>
        <dl className="IpynbNotebookSidebar__meta">
          <div className="IpynbNotebookSidebar__metaRow">
            <dt>状态</dt>
            <dd>
              <span
                className="IpynbNotebookSidebar__status"
                data-status={kernelStatus}
              >
                {STATUS_LABEL[kernelStatus]}
              </span>
            </dd>
          </div>
          <div className="IpynbNotebookSidebar__metaRow">
            <dt>Kernel</dt>
            <dd
              title={
                selectedKernel && isLocalKernelSpec(selectedKernel)
                  ? selectedKernel.pythonPath
                  : selectedKernel && isJupyterServerKernelSpec(selectedKernel)
                    ? selectedKernel.serverUrl
                    : undefined
              }
            >
              {selectedKernel?.displayName ?? '—'}
            </dd>
          </div>
          <div className="IpynbNotebookSidebar__metaRow">
            <dt>内存</dt>
            <dd>{memoryBytes === null ? '—' : formatBytes(memoryBytes)}</dd>
          </div>
        </dl>
        {kernelErrorMessage ? (
          <p className="IpynbNotebookSidebar__error" role="alert">
            {kernelErrorMessage}
          </p>
        ) : null}
      </section>

      <section className="IpynbNotebookSidebar__section IpynbNotebookSidebar__section--grow">
        <h3 className="IpynbNotebookSidebar__title">变量</h3>
        {!kernelConnected ? (
          <p className="IpynbNotebookSidebar__empty">连接 Kernel 后显示变量</p>
        ) : selectedKernel && isJupyterServerKernelSpec(selectedKernel) ? (
          <p className="IpynbNotebookSidebar__empty">
            远程 Jupyter Kernel 暂不支持变量面板
          </p>
        ) : variables.length === 0 ? (
          <p className="IpynbNotebookSidebar__empty">
            {inspectLoading ? '加载中…' : '暂无用户变量'}
          </p>
        ) : (
          <div className="IpynbNotebookSidebar__tableWrap">
            <table className="IpynbNotebookSidebar__table">
              <thead>
                <tr>
                  <th scope="col">名称</th>
                  <th scope="col">类型</th>
                  <th scope="col">值</th>
                </tr>
              </thead>
              <tbody>
                {variables.map((variable) => (
                  <tr key={variable.name}>
                    <td className="IpynbNotebookSidebar__name">
                      {variable.name}
                    </td>
                    <td className="IpynbNotebookSidebar__type">
                      {variable.type}
                    </td>
                    <td className="IpynbNotebookSidebar__value" title={variable.value}>
                      {variable.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </aside>
  );
}
