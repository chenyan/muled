export type IpynbCellType = 'code' | 'markdown' | 'raw';

export interface IpynbMetadata {
  kernelspec?: {
    name?: string;
    display_name?: string;
    language?: string;
  };
  language_info?: {
    name?: string;
    version?: string;
    mimetype?: string;
    file_extension?: string;
    pygments_lexer?: string;
    codemirror_mode?: string | Record<string, unknown>;
    nbconvert_exporter?: string;
  };
  /** 序列化时保留的缩进宽度（Muled 扩展） */
  indentAmount?: string;
  [key: string]: unknown;
}

export interface IpynbOutput {
  output_type: string;
  name?: string;
  text?: string | string[];
  data?: Record<string, string | string[]>;
  metadata?: Record<string, unknown>;
  execution_count?: number | null;
  ename?: string;
  evalue?: string;
  traceback?: string[];
}

export interface IpynbCell {
  id?: string;
  cell_type: IpynbCellType;
  source: string;
  metadata: Record<string, unknown>;
  outputs?: IpynbOutput[];
  execution_count?: number | null;
}

export interface IpynbDocument {
  nbformat: number;
  nbformat_minor: number;
  metadata: IpynbMetadata;
  cells: IpynbCell[];
}

export type IpynbKernelStatus =
  | 'disconnected'
  | 'connecting'
  | 'idle'
  | 'busy'
  | 'error';

export type IpynbCellExecutionStatus =
  | 'idle'
  | 'queued'
  | 'running'
  | 'success'
  | 'error';

/** 运行时状态（不写入磁盘） */
export interface IpynbCellRuntimeState {
  status: IpynbCellExecutionStatus;
  error?: string;
}

export interface IpynbRuntimeState {
  kernelId: string | null;
  kernelStatus: IpynbKernelStatus;
  cellStates: Record<string, IpynbCellRuntimeState>;
}
