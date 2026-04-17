'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type {
  LiveScripterClientMessage,
  LiveScripterPickedElement,
  LiveScripterServerMessage,
  LiveScripterStartRequest,
} from '@/shared/contracts/playwright-live-scripter';
import {
  liveScripterServerMessageSchema,
  liveScripterStartResponseSchema,
} from '@/shared/contracts/playwright-live-scripter';

type LiveScripterFrame = Extract<LiveScripterServerMessage, { type: 'frame' }>;
type LiveScripterMode = 'drive' | 'pick';
type LiveScripterStatus = 'idle' | 'starting' | 'live' | 'error';
type StartOptions = Omit<LiveScripterStartRequest, 'url'>;
type LiveScripterResult = {
  status: LiveScripterStatus;
  frame: Pick<LiveScripterFrame, 'dataUrl' | 'width' | 'height'> | null;
  pickedElement: LiveScripterPickedElement | null;
  currentUrl: string;
  currentTitle: string | null;
  errorMessage: string | null;
  mode: LiveScripterMode;
  setMode: (mode: LiveScripterMode) => void;
  start: (url: string, options?: StartOptions) => Promise<void>;
  driveClick: (x: number, y: number) => void;
  driveType: (text: string) => void;
  driveScroll: (deltaX: number, deltaY: number) => void;
  pickAt: (x: number, y: number) => void;
  navigate: (url: string) => void;
  back: () => void;
  forward: () => void;
  reload: () => void;
  clearPickedElement: () => void;
  dispose: () => Promise<void>;
};
type LiveScripterStateSetters = {
  setStatus: React.Dispatch<React.SetStateAction<LiveScripterStatus>>;
  setFrame: React.Dispatch<
    React.SetStateAction<Pick<LiveScripterFrame, 'dataUrl' | 'width' | 'height'> | null>
  >;
  setPickedElement: React.Dispatch<React.SetStateAction<LiveScripterPickedElement | null>>;
  setCurrentUrl: React.Dispatch<React.SetStateAction<string>>;
  setCurrentTitle: React.Dispatch<React.SetStateAction<string | null>>;
  setErrorMessage: React.Dispatch<React.SetStateAction<string | null>>;
};
type LiveScripterConnectionRefs = {
  sessionIdRef: React.MutableRefObject<string | null>;
  socketRef: React.MutableRefObject<WebSocket | null>;
  connectionTokenRef: React.MutableRefObject<number>;
};

const START_ENDPOINT = '/api/playwright/live-scripter/start';
const DISPOSE_ENDPOINT = '/api/playwright/live-scripter/dispose';

const toWebSocketUrl = (socketPath: string): string => {
  const target = new URL(socketPath, window.location.origin);
  target.protocol = target.protocol === 'https:' ? 'wss:' : 'ws:';
  return target.toString();
};

const clearLiveScripterClientState = ({
  setFrame,
  setPickedElement,
  setCurrentUrl,
  setCurrentTitle,
}: LiveScripterStateSetters): void => {
  setFrame(null);
  setPickedElement(null);
  setCurrentUrl('');
  setCurrentTitle(null);
};

const closeLiveScripterSocket = (socketRef: LiveScripterConnectionRefs['socketRef']): void => {
  const socket = socketRef.current;
  socketRef.current = null;
  if (socket === null) {
    return;
  }
  socket.onopen = null;
  socket.onmessage = null;
  socket.onerror = null;
  socket.onclose = null;
  socket.close();
};

const buildStartRequestBody = (url: string, options?: StartOptions): LiveScripterStartRequest => ({
  url,
  viewport: options?.viewport,
  websiteId: options?.websiteId ?? null,
  flowId: options?.flowId ?? null,
  personaId: options?.personaId ?? null,
  selectorProfile: options?.selectorProfile ?? null,
});

const reportLiveScripterError = (
  message: string,
  setters: Pick<LiveScripterStateSetters, 'setErrorMessage' | 'setStatus'>
): void => {
  setters.setErrorMessage(message);
  setters.setStatus('error');
};

const parseLiveScripterServerMessage = (
  rawData: unknown,
  setters: Pick<LiveScripterStateSetters, 'setErrorMessage' | 'setStatus'>
): LiveScripterServerMessage | null => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(String(rawData));
  } catch {
    reportLiveScripterError('Live scripter received an invalid server message.', setters);
    return null;
  }

  const result = liveScripterServerMessageSchema.safeParse(parsed);
  if (!result.success) {
    reportLiveScripterError(
      'Live scripter server message did not match the expected shape.',
      setters
    );
    return null;
  }
  return result.data;
};

const applyLiveScripterServerMessage = ({
  message,
  refs,
  clearClientState,
  closeSocket,
  setters,
}: {
  message: LiveScripterServerMessage;
  refs: LiveScripterConnectionRefs;
  clearClientState: () => void;
  closeSocket: () => void;
  setters: LiveScripterStateSetters;
}): void => {
  switch (message.type) {
    case 'ready':
      setters.setStatus('live');
      return;
    case 'frame':
      setters.setFrame(message);
      return;
    case 'navigated':
      setters.setCurrentUrl(message.url);
      setters.setCurrentTitle(message.title);
      return;
    case 'picked':
      setters.setPickedElement(message.element);
      return;
    case 'error':
      setters.setErrorMessage(message.message);
      setters.setStatus((current) => (current === 'live' ? current : 'error'));
      return;
    case 'closed':
      refs.sessionIdRef.current = null;
      closeSocket();
      clearClientState();
      setters.setStatus('idle');
      return;
  }
};

const attachLiveScripterSocketHandlers = ({
  socket,
  connectionToken,
  refs,
  clearClientState,
  closeSocket,
  setters,
}: {
  socket: WebSocket;
  connectionToken: number;
  refs: LiveScripterConnectionRefs;
  clearClientState: () => void;
  closeSocket: () => void;
  setters: LiveScripterStateSetters;
}): void => {
  socket.onmessage = (event) => {
    if (refs.connectionTokenRef.current !== connectionToken) {
      return;
    }
    const message = parseLiveScripterServerMessage(event.data, setters);
    if (message === null) {
      return;
    }
    applyLiveScripterServerMessage({ message, refs, clearClientState, closeSocket, setters });
  };

  socket.onerror = () => {
    if (refs.connectionTokenRef.current !== connectionToken) {
      return;
    }
    reportLiveScripterError('Live scripter WebSocket connection failed.', setters);
  };

  socket.onclose = () => {
    if (refs.connectionTokenRef.current !== connectionToken) {
      return;
    }
    refs.socketRef.current = null;
    refs.sessionIdRef.current = null;
    clearClientState();
    setters.setStatus((current) => (current === 'error' ? current : 'idle'));
  };
};

const disposeLiveScripterSession = async ({
  refs,
  clearClientState,
  closeSocket,
  setters,
}: {
  refs: LiveScripterConnectionRefs;
  clearClientState: () => void;
  closeSocket: () => void;
  setters: Pick<LiveScripterStateSetters, 'setStatus' | 'setErrorMessage'>;
}): Promise<void> => {
  refs.connectionTokenRef.current += 1;
  closeSocket();
  const sessionId = refs.sessionIdRef.current;
  refs.sessionIdRef.current = null;
  clearClientState();
  setters.setStatus('idle');
  setters.setErrorMessage(null);
  if (sessionId === null) {
    return;
  }
  await fetch(DISPOSE_ENDPOINT, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  }).catch(() => undefined);
};

const startLiveScripterSession = async ({
  url,
  options,
  refs,
  dispose,
  clearClientState,
  closeSocket,
  setters,
}: {
  url: string;
  options?: StartOptions;
  refs: LiveScripterConnectionRefs;
  dispose: () => Promise<void>;
  clearClientState: () => void;
  closeSocket: () => void;
  setters: LiveScripterStateSetters;
}): Promise<void> => {
  await dispose();
  setters.setStatus('starting');
  setters.setErrorMessage(null);
  clearClientState();

  const response = await fetch(START_ENDPOINT, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildStartRequestBody(url, options)),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    reportLiveScripterError(
      text.length > 0 ? text : `Live scripter start failed with ${response.status}.`,
      setters
    );
    return;
  }

  const payload = liveScripterStartResponseSchema.parse(await response.json());
  refs.sessionIdRef.current = payload.sessionId;
  refs.connectionTokenRef.current += 1;
  const connectionToken = refs.connectionTokenRef.current;
  const socket = new WebSocket(toWebSocketUrl(payload.socketPath));
  refs.socketRef.current = socket;
  attachLiveScripterSocketHandlers({
    socket,
    connectionToken,
    refs,
    clearClientState,
    closeSocket,
    setters,
  });
};

export function usePlaywrightLiveScripter(): LiveScripterResult {
  const [status, setStatus] = useState<LiveScripterStatus>('idle');
  const [frame, setFrame] = useState<Pick<LiveScripterFrame, 'dataUrl' | 'width' | 'height'> | null>(
    null
  );
  const [pickedElement, setPickedElement] = useState<LiveScripterPickedElement | null>(null);
  const [currentUrl, setCurrentUrl] = useState('');
  const [currentTitle, setCurrentTitle] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<LiveScripterMode>('drive');

  const sessionIdRef = useRef<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const connectionTokenRef = useRef(0);

  const setters = useMemo(
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
  const refs = useMemo(
    () => ({
      sessionIdRef,
      socketRef,
      connectionTokenRef,
    }),
    []
  );

  const clearClientState = useCallback((): void => {
    clearLiveScripterClientState(setters);
  }, [setters]);

  const closeSocket = useCallback((): void => {
    closeLiveScripterSocket(socketRef);
  }, [socketRef]);

  const dispose = useCallback(async (): Promise<void> => {
    await disposeLiveScripterSession({
      refs,
      clearClientState,
      closeSocket,
      setters: { setStatus, setErrorMessage },
    });
  }, [clearClientState, closeSocket, refs, setErrorMessage, setStatus]);

  const send = useCallback((message: LiveScripterClientMessage): void => {
    const socket = socketRef.current;
    if (socket?.readyState !== WebSocket.OPEN) {
      return;
    }
    socket.send(JSON.stringify(message));
  }, []);

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
    return () => {
      dispose().catch(() => undefined);
    };
  }, [dispose]);

  return useMemo(
    () => ({
      status,
      frame,
      pickedElement,
      currentUrl,
      currentTitle,
      errorMessage,
      mode,
      setMode,
      start,
      driveClick: (x: number, y: number) => send({ type: 'drive_click', x, y }),
      driveType: (text: string) => send({ type: 'drive_type', value: text }),
      driveScroll: (deltaX: number, deltaY: number) =>
        send({ type: 'drive_scroll', deltaX, deltaY }),
      pickAt: (x: number, y: number) => send({ type: 'pick_at', x, y }),
      navigate: (url: string) => send({ type: 'navigate', url }),
      back: () => send({ type: 'back' }),
      forward: () => send({ type: 'forward' }),
      reload: () => send({ type: 'reload' }),
      clearPickedElement: () => setPickedElement(null),
      dispose,
    }),
    [
      currentTitle,
      currentUrl,
      dispose,
      errorMessage,
      frame,
      mode,
      pickedElement,
      send,
      start,
      status,
    ]
  );
}
