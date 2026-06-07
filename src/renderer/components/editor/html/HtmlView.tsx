import {
  MULED_FILE_VIDEO_SRC_PREFIX,
  WIKI_VIDEO_SRC_PREFIX,
} from '../../../lib/normalizeMarkdownWikiImages';
import { parseWikiVideoEmbedHtml } from '../../../lib/wikiVideoEmbed';
import WikiVideoView from '../wikiVideo/WikiVideoView';

export default function HtmlView({
  html,
  block,
}: {
  html: string;
  block: boolean;
}) {
  if (!html.trim()) {
    return null;
  }

  const videoEmbed = parseWikiVideoEmbedHtml(html);
  if (videoEmbed) {
    const src =
      videoEmbed.kind === 'wiki'
        ? `${WIKI_VIDEO_SRC_PREFIX}${videoEmbed.path}`
        : `${MULED_FILE_VIDEO_SRC_PREFIX}${videoEmbed.path}`;
    return <WikiVideoView src={src} altText="" />;
  }

  const className = block ? 'MuledHtmlBlock' : 'MuledInlineHtml';

  if (block) {
    return (
      // eslint-disable-next-line react/no-danger -- authored HTML in markdown
      <div
        className={className}
        contentEditable={false}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    // eslint-disable-next-line react/no-danger -- authored HTML in markdown
    <span
      className={className}
      contentEditable={false}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
