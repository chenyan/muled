import { isVideoPath } from '../renderer/lib/mime';
import {
  normalizeMarkdownWikiImages,
} from '../renderer/lib/normalizeMarkdownWikiImages';
import { prepareMarkdownForWysiwyg } from '../renderer/lib/prepareMarkdownForWysiwyg';
import { resolveWikiImagePathCandidates } from '../renderer/lib/resolveWikiImagePreview';
import { buildWikiVideoEmbedHtml } from '../renderer/lib/wikiVideoEmbed';

const VIDEO_REL = 'att/32dad56ea283b9832618d2456ee5dec8_MD5.mp4';
const VAULT_VIDEO_REL =
  'physics/电磁学/att/32dad56ea283b9832618d2456ee5dec8_MD5.mp4';
const DOC_RELATIVE = 'physics/电磁学/库仑定律.md';
const NOTE_SOURCE = `---
aliases:
  - Coulomb's Law
---

![[${VAULT_VIDEO_REL}]]`;

describe('库仑定律.md video embed', () => {
  it('detects mp4 with _MD5 suffix as video', () => {
    expect(isVideoPath(VIDEO_REL)).toBe(true);
    expect(isVideoPath(VAULT_VIDEO_REL)).toBe(true);
  });

  it('prefers vault-style path over doubled note directory join', () => {
    expect(resolveWikiImagePathCandidates(VAULT_VIDEO_REL, DOC_RELATIVE)).toEqual([
      VAULT_VIDEO_REL,
      'physics/电磁学/physics/电磁学/att/32dad56ea283b9832618d2456ee5dec8_MD5.mp4',
    ]);
  });

  it('normalizes wiki embed to html video block', () => {
    const normalized = normalizeMarkdownWikiImages(NOTE_SOURCE);
    expect(normalized).toContain(buildWikiVideoEmbedHtml(VAULT_VIDEO_REL, 'wiki'));
  });

  it('prepareMarkdownForWysiwyg preserves video embed html', () => {
    const prepared = prepareMarkdownForWysiwyg(NOTE_SOURCE);
    expect(prepared).toContain(
      buildWikiVideoEmbedHtml(VAULT_VIDEO_REL, 'wiki'),
    );
  });
});
