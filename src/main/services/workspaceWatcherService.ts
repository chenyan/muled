import fs from 'fs';
import { IGNORED_DIR_NAMES } from '../../shared/constants';

function debounce(fn: () => void, ms: number): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return () => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(fn, ms);
  };
}

export function shouldIgnoreWorkspaceWatchPath(relativePath: string): boolean {
  const segments = relativePath.replace(/\\/g, '/').split('/');
  for (const segment of segments) {
    if (!segment) {
      continue;
    }
    if (segment.startsWith('.')) {
      return true;
    }
    if (IGNORED_DIR_NAMES.has(segment)) {
      return true;
    }
  }
  return false;
}

export default class WorkspaceWatcherService {
  private watcher: fs.FSWatcher | null = null;

  private watchedRoot = '';

  private onChange: (() => void) | null = null;

  private debouncedNotify: (() => void) | null = null;

  setOnChange(listener: () => void): void {
    this.onChange = listener;
  }

  watch(root: string): void {
    const normalizedRoot = root.trim();
    if (this.watchedRoot === normalizedRoot && this.watcher) {
      return;
    }
    this.stop();
    this.watchedRoot = normalizedRoot;
    if (!normalizedRoot) {
      return;
    }

    let stat: fs.Stats;
    try {
      stat = fs.statSync(normalizedRoot);
    } catch {
      return;
    }
    if (!stat.isDirectory()) {
      return;
    }

    const notify = this.getDebouncedNotify();
    const handler = (eventType: string, filename: string | Buffer | null) => {
      if (eventType !== 'rename') {
        return;
      }
      if (filename == null || filename === '') {
        notify();
        return;
      }
      const name =
        typeof filename === 'string' ? filename : filename.toString('utf8');
      if (shouldIgnoreWorkspaceWatchPath(name)) {
        return;
      }
      notify();
    };

    try {
      this.watcher = fs.watch(normalizedRoot, { recursive: true }, handler);
      return;
    } catch {
      /* Linux 等平台可能不支持 recursive */
    }

    try {
      this.watcher = fs.watch(normalizedRoot, handler);
    } catch {
      this.watcher = null;
      this.watchedRoot = '';
    }
  }

  stop(): void {
    this.watcher?.close();
    this.watcher = null;
    this.watchedRoot = '';
  }

  private getDebouncedNotify(): () => void {
    if (!this.debouncedNotify) {
      this.debouncedNotify = debounce(() => {
        this.onChange?.();
      }, 300);
    }
    return this.debouncedNotify;
  }
}
