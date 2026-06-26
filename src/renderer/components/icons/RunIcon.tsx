interface RunIconProps {
  size?: number;
}

export default function RunIcon({ size = 12 }: RunIconProps) {
  return (
    <svg
      className="RunIcon"
      viewBox="0 0 16 16"
      width={size}
      height={size}
      aria-hidden="true"
    >
      <path fill="currentColor" d="M4 3.5v9l9-4.5-9-4.5z" />
    </svg>
  );
}
