import type { ReactNode } from 'react';
import type { EditorSplitLayout } from '../../../shared/editorSplit';
import { usePaneResize } from '../../hooks/usePaneResize';

interface EditorSplitViewProps {
  layout: EditorSplitLayout;
  primary: ReactNode;
  secondary: ReactNode;
  onRatioChange: (ratio: number) => void;
}

export default function EditorSplitView({
  layout,
  primary,
  secondary,
  onRatioChange,
}: EditorSplitViewProps) {
  const { resizing, containerRef, resizeHandleProps } = usePaneResize({
    enabled: true,
    direction: layout.direction,
    ratio: layout.ratio,
    onRatioChange,
  });

  const isHorizontal = layout.direction === 'horizontal';
  const primarySize = `${layout.ratio * 100}%`;
  const secondarySize = `${(1 - layout.ratio) * 100}%`;

  return (
    <div
      ref={containerRef}
      className={`EditorSplitView EditorSplitView--${layout.direction}${resizing ? ' EditorSplitView--resizing' : ''}`}
    >
      <div
        className="EditorSplitView__pane"
        style={
          isHorizontal
            ? { width: primarySize, height: '100%' }
            : { height: primarySize, width: '100%' }
        }
      >
        {primary}
      </div>
      <div
        className={`EditorSplitView__resize${resizing ? ' EditorSplitView__resize--active' : ''}`}
        {...resizeHandleProps}
      />
      <div
        className="EditorSplitView__pane"
        style={
          isHorizontal
            ? { width: secondarySize, height: '100%' }
            : { height: secondarySize, width: '100%' }
        }
      >
        {secondary}
      </div>
    </div>
  );
}
