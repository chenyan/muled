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
          tools: { fd: '', rg: '' },
        },
      }),
      detectTools: async () => ({
        tools: { fd: '', rg: '' },
        found: { fd: false, rg: false },
      }),
      save: async () => mockConfig,
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
    },
    workspace: {
      get: async () => ({ root: '/tmp', recent: ['/tmp'] }),
      list: async () => ({ paths: ['README.md'] }),
      listChildren: async () => ({ paths: ['README.md'] }),
      pdfOutline: async () => ({ items: [] }),
      cd: async () => ({ root: '/tmp', paths: [], recent: ['/tmp'] }),
      completeCd: async () => ({ labels: [] }),
    },
    file: {
      read: async () => ({
        content: '# hello',
        truncated: false,
        fileSize: 7,
      }),
      readBinary: async () => ({ base64: '', mime: 'image/png' }),
      write: async () => ({ ok: true }),
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
  };
});

describe('App', () => {
  it('renders shell after config loads', async () => {
    render(<App />);
    expect((await screen.findAllByRole('tablist')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Untitled').length).toBeGreaterThan(0);
  });
});
