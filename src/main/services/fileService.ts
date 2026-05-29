import fs from 'fs';
import path from 'path';
import { assertPathInsideRoot, resolvePath } from '../../shared/pathUtils';
import type {
  FileReadBinaryResult,
  FileReadResult,
} from '../../shared/types/ipc';
import type { ConfigService } from './configService';
import type { WorkspaceService } from './workspaceService';

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|bmp|ico)$/i;

const MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',
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
    const root = this.workspaceService.getRoot();
    const resolved = resolvePath(filePath, root);
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
    if (!IMAGE_EXT.test(absolutePath)) {
      throw new Error(`Not an image file: ${filePath}`);
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
}
