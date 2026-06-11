import {
  remapSourcePathForDirectoryMove,
  updateMnoteDocumentSource,
} from '../renderer/lib/mnoteCompanionSync';
import { createMnoteDocument } from '../renderer/lib/mnoteFormat';
import { companionMnotePath } from '../renderer/lib/mnotePath';

describe('mnoteCompanionSync', () => {
  it('updates frontmatter source', () => {
    const content = createMnoteDocument('notes/a.md');
    const next = updateMnoteDocumentSource(content, 'notes/b.md');
    expect(next).toContain('source: notes/b.md');
  });

  it('remaps source under renamed directory', () => {
    expect(
      remapSourcePathForDirectoryMove('drafts/a.md', 'drafts/', 'published/'),
    ).toBe('published/a.md');
  });

  it('companion path uses full filename', () => {
    expect(companionMnotePath('a.pdf')).toBe('a.pdf.mnote');
  });
});
