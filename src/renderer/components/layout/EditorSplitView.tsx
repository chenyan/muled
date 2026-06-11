import type { ReactNode } from 'react';
import type {
  EditorSplitLayout,
  SplitPaneId,
} from '../../../shared/editorSplit';
import { usePaneResize } from '../../hooks/usePaneResize';

interface EditorSplitViewProps {
  layout: EditorSplitLayout;
  primary: ReactNode;
  secondary: ReactNode;
  onRatioChange: (ratio: number) => void;
  /** 折叠为单栏时隐藏的分区（保留另一侧 DOM，避免 PDF 等重挂载） */
  hiddenPane?: SplitPaneId;
}

export default function EditorSplitView({
  layout,
  primary,
  secondary,
  onRatioChange,
  hiddenPane,
}: EditorSplitViewProps) {
  const collapsed = hiddenPane !== undefined;
  const { resizing, containerRef, resizeHandleProps } = usePaneResize({
    enabled: !collapsed,
    direction: layout.direction,
    ratio: layout.ratio,
    onRatioChange,
  });

  const isHorizontal = layout.direction === 'horizontal';
  const primarySize = collapsed
    ? hiddenPane === 'primary'
      ? '0%'
      : '100%'
    : `${layout.ratio * 100}%`;
  const secondarySize = collapsed
    ? hiddenPane === 'secondary'
      ? '0%'
      : '100%'
    : `${(1 - layout.ratio) * 100}%`;

  return (
    <div
      ref={containerRef}
      className={`EditorSplitView EditorSplitView--${layout.direction}${resizing ? ' EditorSplitView--resizing' : ''}${collapsed ? ' EditorSplitView--collapsed' : ''}`}
    >
      <div
        className={`EditorSplitView__pane${hiddenPane === 'primary' ? ' EditorSplitView__pane--hidden' : ''}`}
        style={
          isHorizontal
            ? { width: primarySize, height: '100%' }
            : { height: primarySize, width: '100%' }
        }
        aria-hidden={hiddenPane === 'primary'}
      >
        {primary}
      </div>
      {collapsed ? null : (
        <div
          className={`EditorSplitView__resize${resizing ? ' EditorSplitView__resize--active' : ''}`}
          {...resizeHandleProps}
        />
      )}
      <div
        className={`EditorSplitView__pane${hiddenPane === 'secondary' ? ' EditorSplitView__pane--hidden' : ''}`}
        style={
          isHorizontal
            ? { width: secondarySize, height: '100%' }
            : { height: secondarySize, width: '100%' }
        }
        aria-hidden={hiddenPane === 'secondary'}
      >
        {secondary}
      </div>
    </div>
  );
}
