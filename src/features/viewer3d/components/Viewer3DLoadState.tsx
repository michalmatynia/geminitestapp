'use client';

import React, { useEffect, useRef, useState } from 'react';

export type ModelAvailabilityState =
  | { status: 'checking' }
  | { status: 'available' }
  | { error: Error; status: 'failed' };

export const normalizeViewerError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

const createModelUnavailableError = (modelUrl: string, response: Response): Error => {
  const statusText = response.statusText.trim().length > 0 ? response.statusText : 'Unknown';
  return new Error(
    `Could not load ${modelUrl}: fetch responded with ${response.status}: ${statusText}`
  );
};

const failModelAvailability = (
  error: Error,
  setState: React.Dispatch<React.SetStateAction<ModelAvailabilityState>>,
  onErrorRef: React.MutableRefObject<((error: Error) => void) | undefined>
): void => {
  setState({ error, status: 'failed' });
  onErrorRef.current?.(error);
};

export function useModelAvailability(
  modelUrl: string,
  onError?: (error: Error) => void
): ModelAvailabilityState {
  const onErrorRef = useRef(onError);
  const [state, setState] = useState<ModelAvailabilityState>({ status: 'checking' });

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    const trimmedUrl = modelUrl.trim();
    if (trimmedUrl.length === 0) {
      failModelAvailability(new Error('3D model URL is empty'), setState, onErrorRef);
      return undefined;
    }

    const controller = new AbortController();
    setState({ status: 'checking' });

    const checkAvailability = async (): Promise<void> => {
      try {
        const response = await fetch(trimmedUrl, {
          cache: 'no-store',
          method: 'HEAD',
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        if (response.ok || response.status === 405) {
          setState({ status: 'available' });
          return;
        }

        failModelAvailability(
          createModelUnavailableError(trimmedUrl, response),
          setState,
          onErrorRef
        );
      } catch (error) {
        if (controller.signal.aborted) return;
        failModelAvailability(normalizeViewerError(error), setState, onErrorRef);
      }
    };

    void checkAvailability();

    return (): void => {
      controller.abort();
    };
  }, [modelUrl]);

  return state;
}

export class Viewer3DCanvasErrorBoundary extends React.Component<
  {
    children: React.ReactNode;
    fallback: (error: Error) => React.ReactNode;
    onError?: (error: Error) => void;
  },
  { error: Error | null }
> {
  override state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: unknown): { error: Error } {
    return { error: normalizeViewerError(error) };
  }

  override componentDidCatch(error: Error): void {
    this.props.onError?.(normalizeViewerError(error));
  }

  override render(): React.ReactNode {
    const { error } = this.state;
    if (error !== null) {
      return this.props.fallback(error);
    }

    return this.props.children;
  }
}

export function Viewer3DLoadErrorFallback({ error }: { error: Error }): React.JSX.Element {
  const message = error.message.trim();

  return (
    <div className='flex h-full w-full items-center justify-center bg-black/40 p-4 text-center text-red-400'>
      <div>
        <p>Failed to load 3D model</p>
        {message.length > 0 ? (
          <p className='mt-2 text-sm text-gray-400'>{message}</p>
        ) : null}
      </div>
    </div>
  );
}

export function Viewer3DLoadingFallback(): React.JSX.Element {
  return (
    <div className='flex h-full w-full items-center justify-center bg-black/40 p-4 text-center text-gray-400'>
      <p className='text-sm'>Loading model...</p>
    </div>
  );
}
