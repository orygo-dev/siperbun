import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

type State = { hasError: boolean };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('SIPERBUN UI error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="text-sm font-medium text-slate-800">
            Tampilan gagal dimuat.
          </p>
          <button
            type="button"
            className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary-dark"
            onClick={() => {
              this.setState({ hasError: false });
              window.location.reload();
            }}
          >
            Muat ulang
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
