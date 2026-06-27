import React from 'react';

export function useTerminal() {
  return {
    ref: { current: null },
    write: () => undefined,
    resize: () => undefined,
    focus: () => undefined,
  };
}

export function Terminal({
  className,
  onData,
  onResize,
}: {
  className?: string;
  onData?: (data: string) => void;
  onResize?: (cols: number, rows: number) => void;
}) {
  return (
    <div
      className={className}
      data-testid="scheme-terminal-mock"
      onKeyDown={(event) => {
        if (event.key.length === 1) {
          onData?.(event.key);
        }
      }}
      onFocus={() => {
        onResize?.(80, 24);
      }}
    />
  );
}
