import { randomUUID } from 'crypto';
import WebSocket from 'ws';
import type { IpynbOutput } from '../../../shared/types/ipynb';
import {
  buildJupyterKernelChannelsUrl,
  normalizeServerUrl,
  toJupyterWebSocketUrl,
  type JupyterServerConfig,
} from './jupyterServerClient';

const CONNECT_TIMEOUT_MS = 15_000;
const KERNEL_INFO_TIMEOUT_MS = 10_000;
const EXECUTION_TIMEOUT_MS = 300_000;

interface JupyterMessageHeader {
  msg_id: string;
  msg_type: string;
  username: string;
  session: string;
  date: string;
  version: string;
}

type JupyterWireMessage = [
  string,
  JupyterMessageHeader,
  JupyterMessageHeader | Record<string, never>,
  Record<string, unknown>,
  Record<string, unknown>,
  ...unknown[],
];

export interface JupyterExecuteResult {
  executionCount: number;
  outputs: IpynbOutput[];
  status: 'ok' | 'error';
}

export interface JupyterExecuteHandlers {
  onStream?: (name: 'stdout' | 'stderr', text: string) => void;
  onDisplay?: (output: IpynbOutput) => void;
}

interface PendingReply {
  msgType: string;
  resolve: (content: Record<string, unknown>) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

export class JupyterKernelConnection {
  private readonly config: JupyterServerConfig;
  private readonly kernelId: string;
  private readonly sessionId = randomUUID();
  private ws: WebSocket | null = null;
  private readonly pendingReplies = new Map<string, PendingReply>();
  private activeExecute:
    | {
        parentMsgId: string;
        cellId: string;
        outputs: IpynbOutput[];
        executionCount: number;
        handlers: JupyterExecuteHandlers;
        resolve: (result: JupyterExecuteResult) => void;
        reject: (error: Error) => void;
      }
    | null = null;

  constructor(config: JupyterServerConfig, kernelId: string) {
    this.config = { serverUrl: normalizeServerUrl(config.serverUrl) };
    this.kernelId = kernelId;
  }

  async connect(): Promise<void> {
    const channelsUrl = toJupyterWebSocketUrl(
      buildJupyterKernelChannelsUrl(
        this.config,
        this.kernelId,
        this.sessionId,
      ),
    );

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(channelsUrl);
      this.ws = ws;
      const timeout = setTimeout(() => {
        ws.terminate();
        reject(new Error('Jupyter Kernel WebSocket 连接超时'));
      }, CONNECT_TIMEOUT_MS);

      ws.on('open', () => {
        clearTimeout(timeout);
        resolve();
      });
      ws.on('error', (error) => {
        clearTimeout(timeout);
        reject(error instanceof Error ? error : new Error(String(error)));
      });
      ws.on('message', (data) => {
        this.handleMessage(data);
      });
      ws.on('close', () => {
        this.failActiveExecute(new Error('Jupyter Kernel 连接已断开'));
        for (const pending of this.pendingReplies.values()) {
          clearTimeout(pending.timeout);
          pending.reject(new Error('Jupyter Kernel 连接已断开'));
        }
        this.pendingReplies.clear();
      });
    });

    this.ws.on('error', () => {
      // close handler reports disconnect to session layer
    });

    await this.requestKernelInfo();
  }

  execute(
    code: string,
    cellId: string,
    handlers: JupyterExecuteHandlers = {},
  ): Promise<JupyterExecuteResult> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error('Jupyter Kernel 未连接'));
    }
    if (this.activeExecute) {
      return Promise.reject(new Error('已有 Cell 正在执行'));
    }

    const msgId = this.send('shell', 'execute_request', {
      code,
      silent: false,
      store_history: true,
      user_expressions: {},
      allow_stdin: false,
      stop_on_error: true,
    });

    return new Promise((resolve, reject) => {
      this.activeExecute = {
        parentMsgId: msgId,
        cellId,
        outputs: [],
        executionCount: 0,
        handlers,
        resolve,
        reject,
      };
    });
  }

  interrupt(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.send('control', 'interrupt_request', {});
  }

  close(): void {
    for (const pending of this.pendingReplies.values()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('连接已关闭'));
    }
    this.pendingReplies.clear();
    this.failActiveExecute(new Error('连接已关闭'));
    if (this.ws) {
      this.ws.removeAllListeners();
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.close();
      } else {
        this.ws.terminate();
      }
      this.ws = null;
    }
  }

  private async requestKernelInfo(): Promise<void> {
    const msgId = this.send('shell', 'kernel_info_request', {});
    await this.waitForReply(msgId, 'kernel_info_reply', KERNEL_INFO_TIMEOUT_MS);
  }

  private send(
    channel: string,
    msgType: string,
    content: Record<string, unknown>,
    parentHeader?: JupyterMessageHeader,
  ): string {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Jupyter Kernel 未连接');
    }
    const header: JupyterMessageHeader = {
      msg_id: randomUUID(),
      msg_type: msgType,
      username: '',
      session: this.sessionId,
      date: new Date().toISOString(),
      version: '5.3',
    };
    const message: JupyterWireMessage = [
      channel,
      header,
      parentHeader ?? {},
      {},
      content,
      [],
    ];
    this.ws.send(JSON.stringify(message));
    return header.msg_id;
  }

  private waitForReply(
    msgId: string,
    msgType: string,
    timeoutMs = EXECUTION_TIMEOUT_MS,
  ): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingReplies.delete(msgId);
        reject(new Error(`等待 ${msgType} 超时`));
      }, timeoutMs);
      this.pendingReplies.set(msgId, {
        msgType,
        resolve,
        reject,
        timeout,
      });
    });
  }

  private handleMessage(data: WebSocket.RawData): void {
    let message: JupyterWireMessage;
    try {
      message = JSON.parse(data.toString()) as JupyterWireMessage;
    } catch {
      return;
    }
    const [, header, parentHeader, , content] = message;
    if (!header || typeof header.msg_type !== 'string') {
      return;
    }

    const pending = this.pendingReplies.get(header.msg_id);
    if (pending && header.msg_type === pending.msgType) {
      clearTimeout(pending.timeout);
      this.pendingReplies.delete(header.msg_id);
      pending.resolve(content ?? {});
      return;
    }

    const parentId =
      parentHeader &&
      typeof parentHeader === 'object' &&
      'msg_id' in parentHeader &&
      typeof parentHeader.msg_id === 'string'
        ? parentHeader.msg_id
        : null;
    if (!parentId || !this.activeExecute || parentId !== this.activeExecute.parentMsgId) {
      return;
    }

    const active = this.activeExecute;
    switch (header.msg_type) {
      case 'stream': {
        const name = content?.name === 'stderr' ? 'stderr' : 'stdout';
        const text = typeof content?.text === 'string' ? content.text : '';
        if (text) {
          const output: IpynbOutput = {
            output_type: 'stream',
            name,
            text,
          };
          active.outputs.push(output);
          active.handlers.onStream?.(name, text);
        }
        break;
      }
      case 'display_data':
      case 'execute_result': {
        const output = this.toDisplayOutput(header.msg_type, content);
        if (output) {
          active.outputs.push(output);
          active.handlers.onDisplay?.(output);
        }
        break;
      }
      case 'error': {
        active.outputs.push({
          output_type: 'error',
          ename: typeof content?.ename === 'string' ? content.ename : 'Error',
          evalue: typeof content?.evalue === 'string' ? content.evalue : '',
          traceback: Array.isArray(content?.traceback)
            ? (content.traceback as string[])
            : [],
        });
        break;
      }
      case 'execute_reply': {
        const executionCount =
          typeof content?.execution_count === 'number'
            ? content.execution_count
            : active.executionCount;
        const status = content?.status === 'error' ? 'error' : 'ok';
        this.activeExecute = null;
        active.resolve({
          executionCount,
          outputs: active.outputs,
          status,
        });
        break;
      }
      default:
        break;
    }
  }

  private toDisplayOutput(
    msgType: string,
    content: Record<string, unknown>,
  ): IpynbOutput | null {
    const data = content?.data;
    if (!data || typeof data !== 'object') {
      return null;
    }
    const metadata =
      content.metadata && typeof content.metadata === 'object'
        ? (content.metadata as Record<string, unknown>)
        : {};
    if (msgType === 'execute_result') {
      return {
        output_type: 'execute_result',
        data: data as IpynbOutput extends { data: infer D } ? D : never,
        metadata,
        execution_count:
          typeof content.execution_count === 'number'
            ? content.execution_count
            : null,
      };
    }
    return {
      output_type: 'display_data',
      data: data as IpynbOutput extends { data: infer D } ? D : never,
      metadata,
    };
  }

  private failActiveExecute(error: Error): void {
    if (!this.activeExecute) return;
    const active = this.activeExecute;
    this.activeExecute = null;
    active.reject(error);
  }
}
