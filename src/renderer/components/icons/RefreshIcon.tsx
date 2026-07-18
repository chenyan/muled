interface RefreshIconProps {
  size?: number;
}

export default function RefreshIcon({ size = 14 }: RefreshIconProps) {
  return (
    <svg
      className="RefreshIcon"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
    >
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8M21 3v5h-5"
      />
    </svg>
  );
}
