'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type {
  LiveScripterFrame,
  LiveScripterClientMessage,
  LiveScripterPickedElement,
} from '@/shared/contracts/playwright-live-scripter';

import {
  buildLiveScripterResult,
  type LiveScripterConnectionRefs,
  type LiveScripterResult,
  type LiveScripterStateSetters,
  type LiveScripterStatus,
  type LiveScripterMode,
  type StartOptions,
} from './playwrightLiveScripter.result';
import {
  clearLiveScripterClientState,
  closeLiveScripterSocket,
  disposeLiveScripterSession,
  startLiveScripterSession,
} from './playwrightLiveScripter.helpers';

export function usePlaywrightLiveScripter(): LiveScripterResult {
  const [status, setStatus] = useState<LiveScripterStatus>('idle');
  const [frame, setFrame] = useState<Pick<LiveScripterFrame, 'dataUrl' | 'width' | 'height'> | null>(null);
  const [pickedElement, setPickedElement] = useState<LiveScripterPickedElement | null>(null);
  const [currentUrl, setCurrentUrl] = useState('');
  const [currentTitle, setCurrentTitle] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<LiveScripterMode>('drive');

  const sessionIdRef = useRef<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const socketPathRef = useRef<string | null>(null);
  const connectionTokenRef = useRef(0);
  const reconnectAttemptsRef = useRef(0);
  const pendingMessagesRef = useRef<LiveScripterClientMessage[]>([]);

  const refs = useMemo<LiveScripterConnectionRefs>(
    () => ({
      sessionIdRef,
      socketRef,
      socketPathRef,
      connectionTokenRef,
      reconnectAttemptsRef,
      pendingMessagesRef,
    }),
    []
  );
  const setters = useMemo<LiveScripterStateSetters>(
    () => ({
      setStatus,
      setFrame,
      setPickedElement,
      setCurrentUrl,
      setCurrentTitle,
      setErrorMessage,
    }),
    []
  );

  const clearClientState = useCallback((): void => {
    clearLiveScripterClientState(setters);
  }, [setters]);
  const closeSocket = useCallback((): void => {
    closeLiveScripterSocket(refs.socketRef);
  }, [refs]);

  const dispose = useCallback(async (): Promise<void> => {
    await disposeLiveScripterSession({
      refs,
      clearClientState,
      closeSocket,
      setters: {
        setStatus,
        setErrorMessage,
      },
    });
  }, [clearClientState, closeSocket, refs, setErrorMessage, setStatus]);

  const send = useCallback((message: LiveScripterClientMessage): void => {
    if (refs.socketRef.current?.readyState === WebSocket.OPEN) {
      refs.socketRef.current.send(JSON.stringify(message));
      return;
    }
    const hasActiveSession =
      typeof refs.sessionIdRef.current === 'string' &&
      refs.sessionIdRef.current.length > 0 &&
      typeof refs.socketPathRef.current === 'string' &&
      refs.socketPathRef.current.length > 0;
    if (!hasActiveSession) {
      return;
    }
    refs.pendingMessagesRef.current = [...refs.pendingMessagesRef.current.slice(-24), message];
  }, [refs]);

  const start = useCallback(
    async (url: string, options?: StartOptions): Promise<void> => {
      await startLiveScripterSession({
        url,
        options,
        refs,
        dispose,
        clearClientState,
        closeSocket,
        setters,
      });
    },
    [clearClientState, closeSocket, dispose, refs, setters]
  );

  useEffect(() => {
    const handlePageExit = (): void => {
      dispose().catch(() => undefined);
    };
    window.addEventListener('beforeunload', handlePageExit);
    window.addEventListener('pagehide', handlePageExit);
    return () => {
      window.removeEventListener('beforeunload', handlePageExit);
      window.removeEventListener('pagehide', handlePageExit);
    };
  }, [dispose]);

  return useMemo(
    () =>
      buildLiveScripterResult({
        status,
        frame,
        pickedElement,
        currentUrl,
        currentTitle,
        errorMessage,
        mode,
        setMode,
        start,
        send,
        setPickedElement,
        dispose,
      }),
    [
      dispose,
      send,
      start,
      currentTitle,
      currentUrl,
      errorMessage,
      frame,
      mode,
      pickedElement,
      setMode,
      setPickedElement,
    ]
  );
}
