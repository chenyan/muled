import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import type { PublicConfig } from '../shared/types/config';
import App from '../renderer/App';

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
  openai: { model: 'gpt-4o-mini', has_api_key: false },
  system: { homedir: '/tmp' },
};

beforeEach(() => {
  window.muled = {
    config: {
      get: async () => mockConfig,
      getWysiwygCss: async () => ({
        css: '',
        theme: 'light' as const,
        paths: {
          light: '/tmp/wysiwyg/light.css',
          dark: '/tmp/wysiwyg/dark.css',
        },
      }),
      onWysiwygThemeChanged: () => () => undefined,
    },
    workspace: {
      get: async () => ({ root: '/tmp', recent: ['/tmp'] }),
      list: async () => ({ paths: ['README.md'] }),
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
    },
  };
});

describe('App', () => {
  it('renders shell after config loads', async () => {
    render(<App />);
    expect(await screen.findByRole('tablist')).toBeInTheDocument();
    expect(screen.getAllByText('Untitled').length).toBeGreaterThan(0);
  });
});
