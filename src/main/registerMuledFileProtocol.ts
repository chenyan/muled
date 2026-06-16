import fs from 'fs';
import path from 'path';
import { protocol } from 'electron';
import { MULED_FILE_PROTOCOL } from '../shared/muledFileProtocol';
import { muledFileUrlToAbsolutePath } from '../shared/muledFileUrl';

const MIME_BY_EXT: Record<string, string> = {
  '.html': 'text/html',
  '.htm': 'text/html',
  '.xhtml': 'application/xhtml+xml',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
};

function guessMime(filePath: string): string {
  return MIME_BY_EXT[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream';
}

function normalizeAbsolutePath(filePath: string): string {
  let normalized = path.normalize(filePath);
  if (
    process.platform === 'win32' &&
    normalized.startsWith('/') &&
    /^\/[A-Za-z]:/.test(normalized)
  ) {
    normalized = normalized.slice(1);
  }
  return normalized;
}

export function registerMuledFileScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: MULED_FILE_PROTOCOL,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
        stream: true,
      },
    },
  ]);
}

export function registerMuledFileProtocolHandler(): void {
  protocol.handle(MULED_FILE_PROTOCOL, async (request) => {
    const filePath = normalizeAbsolutePath(
      muledFileUrlToAbsolutePath(request.url),
    );
    try {
      const data = await fs.promises.readFile(filePath);
      return new Response(data, {
        headers: {
          'Content-Type': guessMime(filePath),
        },
      });
    } catch {
      return new Response('Not Found', { status: 404 });
    }
  });
}
