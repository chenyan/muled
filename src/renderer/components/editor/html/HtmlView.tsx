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
