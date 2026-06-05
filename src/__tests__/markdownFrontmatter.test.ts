import {
  exportFrontmatterFromWysiwyg,
  frontmatterHtmlTableToYaml,
  frontmatterYamlToHtmlTable,
  normalizeMarkdownFrontmatterForWysiwyg,
  splitObsidianFrontmatter,
} from '../renderer/lib/markdownFrontmatter';
import { exportMarkdownFromWysiwyg } from '../renderer/lib/normalizeMarkdownWikiImages';
import { prepareMarkdownForWysiwyg } from '../renderer/lib/prepareMarkdownForWysiwyg';

describe('splitObsidianFrontmatter', () => {
  it('detects frontmatter at document start', () => {
    expect(
      splitObsidianFrontmatter('---\ntitle: Note\n---\n\n# Heading'),
    ).toEqual({
      yaml: 'title: Note',
      body: '\n# Heading',
    });
  });

  it('ignores thematic breaks in the body', () => {
    expect(splitObsidianFrontmatter('# Heading\n\n---\n')).toBeNull();
  });
});

describe('frontmatterYamlToHtmlTable', () => {
  it('renders key-value pairs as an HTML table', () => {
    const table = frontmatterYamlToHtmlTable('title: Note\ntags:\n  - a\n  - b');
    expect(table).toContain('data-muled-frontmatter');
    expect(table).not.toContain('<th>');
    expect(table).toContain('<td>title</td>');
    expect(table).toContain('<td>Note</td>');
    expect(table).toContain('<td>tags</td>');
    expect(table).toContain('<td>a, b</td>');
  });
});

describe('normalizeMarkdownFrontmatterForWysiwyg', () => {
  it('replaces leading frontmatter with a table and keeps body', () => {
    const source = '---\ntitle: Note\n---\n\n# Heading';
    const prepared = normalizeMarkdownFrontmatterForWysiwyg(source);
    expect(prepared).toContain('MuledFrontmatterTable');
    expect(prepared).toContain('# Heading');
    expect(prepared).not.toContain('---\ntitle: Note\n---');
  });
});

describe('exportFrontmatterFromWysiwyg', () => {
  it('restores Obsidian frontmatter from the table block', () => {
    const table = frontmatterYamlToHtmlTable('title: Note\npublished: true')!;
    const exported = exportFrontmatterFromWysiwyg(`${table}\n\n# Heading`);
    expect(exported).toMatch(/^---\n/);
    expect(exported).toContain('title: Note');
    expect(exported).toContain('published: true');
    expect(exported).toContain('# Heading');
  });

  it('round-trips through prepare and export helpers', () => {
    const original = '---\ntitle: Note\ncount: 3\n---\n\nBody';
    const prepared = prepareMarkdownForWysiwyg(original);
    expect(prepared).toContain('MuledFrontmatterTable');
    const exported = exportMarkdownFromWysiwyg(prepared, original);
    expect(exported).toContain('title: Note');
    expect(exported).toContain('count: 3');
    expect(exported).toContain('Body');
    expect(exported).toMatch(/^---\n/);
  });
});

describe('frontmatterHtmlTableToYaml', () => {
  it('reads edited table rows back into YAML', () => {
    const table = frontmatterYamlToHtmlTable('title: Old')!;
    const edited = table.replace('Old', 'New');
    const yamlBlock = frontmatterHtmlTableToYaml(edited);
    expect(yamlBlock).toContain('title: New');
  });
});
