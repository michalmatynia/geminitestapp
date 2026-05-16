'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { error: Error | null };

export class KangurAdminErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[KangurAdminErrorBoundary]', error, info.componentStack);
  }

  private handleRetry = (): void => {
    this.setState({ error: null });
  };

  override render(): ReactNode {
    if (this.state.error) {
      return (
        <div className='flex min-h-[420px] flex-col items-center justify-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive'>
          <p className='font-medium'>Failed to load StudiQ workspace.</p>
          <p className='text-xs text-muted-foreground'>{this.state.error.message}</p>
          <button
            type='button'
            className='rounded-md border border-border px-3 py-1.5 text-xs text-foreground hover:bg-accent'
            onClick={this.handleRetry}
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
