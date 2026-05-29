import { Component, type ErrorInfo, type ReactNode } from 'react';
import { pushStatusToast } from '../../lib/statusToast';

interface MarkdownEditorErrorBoundaryProps {
  children: ReactNode;
  onReset: () => void;
}

interface MarkdownEditorErrorBoundaryState {
  hasError: boolean;
}

export default class MarkdownEditorErrorBoundary extends Component<
  MarkdownEditorErrorBoundaryProps,
  MarkdownEditorErrorBoundaryState
> {
  state: MarkdownEditorErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): MarkdownEditorErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    pushStatusToast(
      `WYSIWYG 渲染异常：${error.message}。已尝试恢复，其余内容仍可编辑。`,
      'error',
    );
    // eslint-disable-next-line no-console -- 便于排查局部渲染失败
    console.error('[MarkdownEditor]', error, info.componentStack);
  }

  componentDidUpdate(prevProps: MarkdownEditorErrorBoundaryProps): void {
    if (prevProps.onReset !== this.props.onReset && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="MuledMDXEditor__errorFallback" role="alert">
          <p>编辑器局部渲染失败，正在恢复…</p>
          <button type="button" onClick={() => this.props.onReset()}>
            重试
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
