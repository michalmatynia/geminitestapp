/**
 * Error Boundary Component
 * 
 * React Error Boundary for graceful error handling and recovery.
 * Features:
 * - Catches JavaScript errors in component tree
 * - Logs errors to centralized observability system
 * - Displays user-friendly fallback UI
 * - Provides error recovery mechanism
 * - Component stack trace capture
 * - Named boundaries for better debugging
 * 
 * This boundary prevents entire application crashes by containing
 * errors to specific component subtrees while maintaining observability.
 */

'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

import { Button } from '@/shared/ui/primitives.public';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

/**
 * Error Boundary component props
 */
interface Props {
  children?: ReactNode;
  fallback?: ReactNode; // Custom fallback UI
  name?: string; // Boundary identifier for debugging
}

/**
 * Error Boundary component state
 */
interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Standard Error Boundary component that logs errors to the centralized
 * observability system and displays a fallback UI with recovery option.
 */
export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  /**
   * Static method to derive state from error
   * Called when an error is caught during rendering
   */
  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  /**
   * Lifecycle method called when error is caught
   * Logs error details to observability system
   */
  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logClientError(error, {
      componentStack: errorInfo.componentStack,
      context: {
        source: 'ErrorBoundary',
        boundaryName: this.props.name || 'Global',
      },
    });
  }

  /**
   * Reset error state to allow recovery
   */
  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public override render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
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
