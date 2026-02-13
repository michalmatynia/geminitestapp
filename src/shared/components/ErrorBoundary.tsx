'use client';

import { Component, ErrorInfo, ReactNode } from 'react';

import { Button } from '@/shared/ui';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Standard Error Boundary component that logs errors to the centralized
 * observability system and displays a fallback UI.
 */
export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logClientError(error, {
      componentStack: errorInfo.componentStack,
      context: {
        source: 'ErrorBoundary',
        boundaryName: this.props.name || 'Global',
      },
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className='flex flex-col items-center justify-center p-8 rounded-lg border border-rose-500/30 bg-rose-500/10 text-center'>
          <h2 className='text-xl font-bold text-rose-200 mb-2'>Something went wrong</h2>
          <p className='text-sm text-rose-300 mb-6 max-w-md'>
            {this.state.error?.message || 'An unexpected error occurred in the user interface.'}
          </p>
          <Button 
            variant='outline' 
            onClick={this.handleReset}
            className='border-rose-500/50 hover:bg-rose-500/20 text-rose-100'
          >
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
