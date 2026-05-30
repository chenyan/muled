import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export interface TranslationMarkdownProps {
  source: string;
}

export default function TranslationMarkdown({ source }: TranslationMarkdownProps) {
  return (
    <div className="TranslationPopup__markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
