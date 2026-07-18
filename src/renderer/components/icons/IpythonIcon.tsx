interface IpythonIconProps {
  size?: number;
}

/** IPython REPL：`In [n]:` 提示符的紧凑表示 */
export default function IpythonIcon({ size = 12 }: IpythonIconProps) {
  return (
    <svg
      className="IpythonIcon"
      viewBox="0 0 16 16"
      width={size}
      height={size}
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M2.25 3.5h1.25v9H2.25a.75.75 0 0 1-.75-.75v-7.5a.75.75 0 0 1 .75-.75Zm10.5 0h1.25a.75.75 0 0 1 .75.75v7.5a.75.75 0 0 1-.75.75H12.75v-9Z"
      />
      <path fill="currentColor" d="M5.5 7.25 8.75 5v6L5.5 8.75V7.25Z" />
      <path fill="currentColor" d="M9.5 10.75h3.25v1.25H9.5V10.75Z" />
    </svg>
  );
}
