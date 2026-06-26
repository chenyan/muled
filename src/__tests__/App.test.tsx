import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import type { PublicConfig } from '../shared/types/config';
import App from '../renderer/App';

jest.mock('../renderer/components/editor/pdf/PdfEngineProvider', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('../renderer/components/editor/pdf/PdfViewer', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../renderer/components/editor/PptxViewerView', () => ({
  __esModule: true,
  default: () => null,
}));

const mockConfig: PublicConfig = {
  editor: {
    buffer_bytes: 16777216,
    mode: 'vim',
    default_view: 'source',
    source: {
      font_family:
        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      font_size: 13,
    },
    wysiwyg: {
      font_family:
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      font_size: 15,
    },
    indent: { insert_spaces: true, tab_size: 2 },
  },
  workspace: { path: '/tmp' },
  ui: { sidebar_width: 260, tree_initial_expansion_depth: 1 },
  theme: {
    ui: 'system',
    wysiwyg: 'system',
    source: 'system',
    resolved: { ui: 'light', wysiwyg: 'light', source: 'light' },
  },
  openai: { model: 'gpt-4o-mini', has_api_key: false },
  system: { homedir: '/tmp' },
};

beforeEach(() => {
  window.muled = {
    config: {
      get: async () => mockConfig,
      getSettings: async () => ({
        configPath: '/tmp/muled.yaml',
        openai_key_configured: false,
        settings: {
          openai: { api_key: '', model: 'gpt-4o-mini', base_url: null },
          editor: mockConfig.editor,
          workspace: mockConfig.workspace,
          ui: mockConfig.ui,
          theme: {
            ui: 'system',
            wysiwyg: 'system',
            source: 'system',
          },
          tools: { fd: '', rg: '', chez: '' },
        },
      }),
      detectTools: async () => ({
        tools: { fd: '', rg: '', chez: '' },
        found: { fd: false, rg: false, chez: false },
      }),
      save: async () => ({ config: mockConfig, workspacePathChanged: false }),
      getWysiwygCss: async () => ({
        css: '',
        theme: 'light' as const,
        paths: {
          light: '/tmp/wysiwyg/light.css',
          dark: '/tmp/wysiwyg/dark.css',
          acme: '/tmp/wysiwyg/acme.css',
        },
      }),
      onThemeChanged: () => () => undefined,
      onConfigChanged: () => () => undefined,
    },
    workspace: {
      get: async () => ({ root: '/tmp', recent: ['/tmp'] }),
      list: async () => ({ paths: ['README.md'] }),
      listChildren: async () => ({ paths: ['README.md'] }),
      exists: async () => ({ exists: false }),
      createFile: async (path: string) => ({ path }),
      createDirectory: async (path: string) => ({ path }),
      rename: async ({ to }: { from: string; to: string }) => ({ path: to }),
      delete: async () => ({ ok: true }),
      pdfOutline: async () => ({ items: [] }),
      cd: async () => ({ root: '/tmp', paths: [], recent: ['/tmp'] }),
      completeCd: async () => ({ labels: [] }),
      getHistory: async () => ({ entries: [], pickerPaths: [] }),
      removeFromHistory: async () => ({ entries: [], pickerPaths: [] }),
      setPinned: async () => ({ entries: [], pickerPaths: [] }),
      onFilesystemChanged: () => () => undefined,
    },
    file: {
      read: async () => ({
        content: '# hello',
        truncated: false,
        fileSize: 7,
      }),
      readBinary: async () => ({ base64: '', mime: 'image/png' }),
      readBinaryBuffer: async () => ({
        data: new Uint8Array(0),
        mime: 'application/pdf',
      }),
      readBytes: async () => ({ data: new Uint8Array(0) }),
      write: async () => ({ ok: true }),
      writeBinary: async () => ({ ok: true }),
    },
    ai: {
      complete: async () => ({ text: '' }),
      translate: async () => ({ text: '' }),
    },
    search: {
      start: async () => ({ ok: true as const }),
      cancel: async () => ({ ok: true }),
      onStream: () => () => undefined,
    },
    shell: {
      openExternal: async () => ({ ok: true }),
    },
    csv: {
      register: async () => ({ ok: true as const, tableName: 'csv_data' }),
      query: async () => ({
        ok: true as const,
        columns: [],
        rows: [],
        rowCount: 0,
        truncated: false,
      }),
      close: async () => ({ ok: true }),
    },
    sqlite: {
      open: async () => ({ ok: true as const, tables: [], fileSize: 0 }),
      query: async () => ({
        ok: true as const,
        kind: 'select' as const,
        columns: [],
        rows: [],
        rowCount: 0,
        truncated: false,
      }),
      listTables: async () => ({ ok: true as const, tables: [] }),
      close: async () => ({ ok: true }),
    },
    duckdbFile: {
      open: async () => ({ ok: true as const, tables: [], fileSize: 0 }),
      query: async () => ({
        ok: true as const,
        kind: 'select' as const,
        columns: [],
        rows: [],
        rowCount: 0,
        truncated: false,
      }),
      listTables: async () => ({ ok: true as const, tables: [] }),
      close: async () => ({ ok: true }),
    },
    scheme: {
      available: async () => ({ available: false }),
      run: async () => ({ ok: true as const, stdout: '', stderr: '', exitCode: 0 }),
    },
    menu: {
      onOpenTranslationHistory: () => () => undefined,
      onOpenExternalDocument: () => () => undefined,
      onOpenExternalDirectory: () => () => undefined,
    },
  };
});

describe('App', () => {
  it('renders shell after config loads', async () => {
    render(<App />);
    expect((await screen.findAllByRole('tablist')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Untitled').length).toBeGreaterThan(0);
  });
});
