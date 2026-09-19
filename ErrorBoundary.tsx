import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Kikuubo Wholesale Tracker crashed:', error, info.componentStack);
  }

  handleReload = () => {
    this.setState({ error: null });
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-violet-50 via-pink-50 to-white dark:from-neutral-950 dark:via-neutral-950 dark:to-neutral-950 text-neutral-900 dark:text-white flex items-center justify-center p-6">
          <div className="w-full max-w-md text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold mb-2">Something went wrong</h1>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-6">
              The app hit an unexpected error and couldn't continue. Your saved data is untouched — reloading should fix
              this.
            </p>
            <button
              onClick={this.handleReload}
              className="px-6 py-3 bg-gradient-to-r from-pink-500 to-violet-600 text-white font-semibold rounded-xl hover:from-pink-600 hover:to-violet-700 transition-all"
            >
              Reload App
            </button>
            <details className="mt-6 text-left">
              <summary className="text-xs text-neutral-400 dark:text-neutral-600 cursor-pointer hover:text-neutral-600 dark:hover:text-neutral-400">
                Technical details
              </summary>
              <pre className="mt-2 text-xs text-neutral-500 whitespace-pre-wrap break-words bg-violet-50 dark:bg-neutral-900 rounded-lg p-3 border border-violet-100 dark:border-neutral-800">
                {this.state.error.message}
              </pre>
            </details>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
