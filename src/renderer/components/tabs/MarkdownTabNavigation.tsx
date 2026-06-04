interface MarkdownTabNavigationProps {
  canGoBack: boolean;
  canGoForward: boolean;
  onBack: () => void;
  onForward: () => void;
}

function NavIcon({ direction }: { direction: 'back' | 'forward' }) {
  const path =
    direction === 'back'
      ? 'M14.5 6.5 9 12l5.5 5.5'
      : 'M9.5 6.5 15 12l-5.5 5.5';
  return (
    <svg
      className="MarkdownTabNavigation__icon"
      viewBox="0 0 24 24"
      width="12"
      height="12"
      aria-hidden
    >
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="square"
        strokeLinejoin="miter"
        d={path}
      />
    </svg>
  );
}

export default function MarkdownTabNavigation({
  canGoBack,
  canGoForward,
  onBack,
  onForward,
}: MarkdownTabNavigationProps) {
  return (
    <div className="MarkdownTabNavigation" role="group" aria-label="文档导航">
      <button
        type="button"
        className="MarkdownTabNavigation__btn"
        disabled={!canGoBack}
        aria-label="后退"
        title="后退"
        onClick={onBack}
      >
        <NavIcon direction="back" />
      </button>
      <button
        type="button"
        className="MarkdownTabNavigation__btn"
        disabled={!canGoForward}
        aria-label="前进"
        title="前进"
        onClick={onForward}
      >
        <NavIcon direction="forward" />
      </button>
    </div>
  );
}
