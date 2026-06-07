import fs from 'fs';
import path from 'path';
import {
  assertPathInsideRoot,
  expandTilde,
  getConfigDir,
  isPathInsideRoot,
  resolvePath,
} from '../../shared/pathUtils';
import type {
  FileReadBinaryResult,
  FileReadResult,
} from '../../shared/types/ipc';
import type { ConfigService } from './configService';
import type { WorkspaceService } from './workspaceService';

const BINARY_PREVIEW_EXT =
  /\.(png|jpe?g|gif|webp|svg|bmp|ico|pdf|docx|pptx|xlsx|mp3|wav|ogg|m4a|aac|flac|weba|mp4|webm|mov|m4v|ogv|mkv|avi)$/i;

const MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.docx':
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.pptx':
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.xlsx':
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.flac': 'audio/flac',
  '.weba': 'audio/webm',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.m4v': 'video/x-m4v',
  '.ogv': 'video/ogg',
  '.mkv': 'video/x-matroska',
  '.avi': 'video/x-msvideo',
};

function guessMime(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_BY_EXT[ext] ?? 'application/octet-stream';
}

export default class FileService {
  private readonly configService: ConfigService;

  private readonly workspaceService: WorkspaceService;

  constructor(
    configService: ConfigService,
    workspaceService: WorkspaceService,
  ) {
    this.configService = configService;
    this.workspaceService = workspaceService;
  }

  resolveFilePath(filePath: string): string {
    const expanded = expandTilde(filePath);
    const resolved = path.isAbsolute(expanded)
      ? path.normalize(expanded)
      : resolvePath(filePath, this.workspaceService.getRoot());

    const configDir = getConfigDir();
    if (isPathInsideRoot(configDir, resolved)) {
      return resolved;
    }

    const root = this.workspaceService.getRoot();
    if (isPathInsideRoot(root, resolved)) {
      return resolved;
    }

    if (path.isAbsolute(resolved)) {
      return resolved;
    }

    return assertPathInsideRoot(root, resolved);
  }

  read(filePath: string): FileReadResult {
    const absolutePath = this.resolveFilePath(filePath);
    const stat = fs.statSync(absolutePath);
    if (!stat.isFile()) {
      throw new Error(`Not a file: ${filePath}`);
    }

    const bufferBytes = this.configService.getBufferBytes();
    const truncated = stat.size > bufferBytes;
    const readLength = truncated ? bufferBytes : stat.size;
    const fd = fs.openSync(absolutePath, 'r');
    try {
      const buffer = Buffer.alloc(readLength);
      fs.readSync(fd, buffer, 0, readLength, 0);
      return {
        content: buffer.toString('utf8'),
        truncated,
        fileSize: stat.size,
      };
    } finally {
      fs.closeSync(fd);
    }
  }

  readBinary(filePath: string): FileReadBinaryResult {
    const absolutePath = this.resolveFilePath(filePath);
    const stat = fs.statSync(absolutePath);
    if (!stat.isFile()) {
      throw new Error(`Not a file: ${filePath}`);
    }
    if (!BINARY_PREVIEW_EXT.test(absolutePath)) {
      throw new Error(`Not a previewable binary file: ${filePath}`);
    }
    const data = fs.readFileSync(absolutePath);
    return {
      base64: data.toString('base64'),
      mime: guessMime(absolutePath),
    };
  }

  write(filePath: string, content: string): { ok: boolean } {
    const absolutePath = this.resolveFilePath(filePath);
    fs.writeFileSync(absolutePath, content, 'utf8');
    return { ok: true };
  }

  writeBinary(filePath: string, base64: string): { ok: boolean } {
    const absolutePath = this.resolveFilePath(filePath);
    const data = Buffer.from(base64, 'base64');
    fs.writeFileSync(absolutePath, data);
    return { ok: true };
  }
}
