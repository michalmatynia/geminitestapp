'use client';

import type { LiveScripterServerMessage } from '@/shared/contracts/playwright-live-scripter';
import { liveScripterServerMessageSchema } from '@/shared/contracts/playwright-live-scripter';

import type {
  LiveScripterConnectionRefs,
  LiveScripterStateSetters,
} from './playwrightLiveScripter.result';
import { flushPendingLiveScripterMessages as flushPendingMessages } from './playwrightLiveScripter.result';

type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

type LiveScripterErrorSetters = Pick<
  LiveScripterStateSetters,
  'setErrorMessage' | 'setStatus'
>;

type SocketLifecycleArgs = {
  refs: LiveScripterConnectionRefs;
  clearClientState: () => void;
  closeSocket: () => void;
  setters: LiveScripterStateSetters;
  reconnectSocket: () => void;
};

type SocketCloseArgs = {
  connectionToken: number;
} & Pick<SocketLifecycleArgs, 'refs' | 'clearClientState' | 'setters' | 'reconnectSocket'>;

const setRefCurrent = <T>(ref: { current: T }, value: T): void => {
  const targetRef = ref;
  targetRef.current = value;
};

const reportSocketMessageError = (
  message: string,
  setters: LiveScripterErrorSetters
): null => {
  setters.setErrorMessage(message);
  setters.setStatus('error');
  return null;
};

const tryParseLiveScripterMessage = (rawData: unknown): JsonValue | null => {
  try {
    return JSON.parse(String(rawData)) as JsonValue;
  } catch {
    return null;
  }
};

const parseValidatedLiveScripterMessage = (
  parsed: JsonValue,
  setters: LiveScripterErrorSetters
): LiveScripterServerMessage | null => {
  const result = liveScripterServerMessageSchema.safeParse(parsed);
  if (!result.success) {
    return reportSocketMessageError(
      'Live scripter server message did not match the expected shape.',
      setters
    );
  }
  return result.data;
};

const applyReadyOrFrameMessage = (
  message: Extract<LiveScripterServerMessage, { type: 'ready' | 'frame' }>,
  refs: LiveScripterConnectionRefs,
  setters: LiveScripterStateSetters
): void => {
  if (message.type === 'ready') {
    const targetRefs = refs;
    targetRefs.reconnectAttemptsRef.current = 0;
    setters.setStatus('live');
    flushPendingMessages(refs);
    return;
  }
  setters.setFrame(message);
};

const applyNavigatedOrPickedMessage = (
  message: Extract<LiveScripterServerMessage, { type: 'navigated' | 'picked' }>,
  setters: LiveScripterStateSetters
): void => {
  if (message.type === 'navigated') {
    setters.setCurrentUrl(message.url);
    setters.setCurrentTitle(message.title);
    return;
  }
  setters.setPickedElement(message.element);
};

const applyClosedMessage = ({
  refs,
  clearClientState,
  closeSocket,
  setters,
}: SocketLifecycleArgs): void => {
  const { sessionIdRef } = refs;
  setRefCurrent(sessionIdRef, null);
  const targetRefs = refs;
  targetRefs.reconnectAttemptsRef.current = 0;
  setRefCurrent(targetRefs.socketPathRef, null);
  closeSocket();
  clearClientState();
  setters.setStatus('idle');
};

const handleSocketError = (
  connectionToken: number,
  refs: LiveScripterConnectionRefs,
  setters: LiveScripterStateSetters
): void => {
  if (refs.connectionTokenRef.current !== connectionToken) {
    return;
  }
  setters.setErrorMessage('Live scripter WebSocket connection failed.');
  setters.setStatus('error');
};

const handleSocketClose = ({
  connectionToken,
  refs,
  clearClientState,
  setters,
  reconnectSocket,
}: SocketCloseArgs): void => {
  if (refs.connectionTokenRef.current !== connectionToken) {
    return;
  }
  const { socketRef, sessionIdRef, socketPathRef, reconnectAttemptsRef } = refs;
  setRefCurrent(socketRef, null);
  const canReconnect =
    typeof sessionIdRef.current === 'string' &&
    sessionIdRef.current.length > 0 &&
    typeof socketPathRef.current === 'string' &&
    socketPathRef.current.length > 0 &&
    reconnectAttemptsRef.current < 3;
  if (!canReconnect) {
    setRefCurrent(sessionIdRef, null);
    setRefCurrent(socketPathRef, null);
    reconnectAttemptsRef.current = 0;
    refs.pendingMessagesRef.current = [];
    clearClientState();
    setters.setStatus((current) => (current === 'error' ? current : 'idle'));
    return;
  }
  reconnectAttemptsRef.current += 1;
  setters.setStatus((current) => (current === 'error' ? current : 'starting'));
  window.setTimeout(() => {
    if (refs.connectionTokenRef.current !== connectionToken) {
      return;
    }
    reconnectSocket();
  }, 250);
};

export const parseLiveScripterServerMessage = (
  rawData: unknown,
  setters: LiveScripterErrorSetters
): LiveScripterServerMessage | null => {
  const parsed = tryParseLiveScripterMessage(rawData);
  if (parsed === null) {
    return reportSocketMessageError(
      'Live scripter received an invalid server message.',
      setters
    );
  }
  return parseValidatedLiveScripterMessage(parsed, setters);
};

export const applyLiveScripterServerMessage = ({
  message,
  refs,
  clearClientState,
  closeSocket,
  setters,
}: {
  message: LiveScripterServerMessage;
} & SocketLifecycleArgs): void => {
  if (message.type === 'ready' || message.type === 'frame') {
    applyReadyOrFrameMessage(message, refs, setters);
    return;
  }
  if (message.type === 'navigated' || message.type === 'picked') {
    applyNavigatedOrPickedMessage(message, setters);
    return;
  }
  if (message.type === 'error') {
    setters.setErrorMessage(message.message);
    setters.setStatus((current) => (current === 'live' ? current : 'error'));
    return;
  }
  applyClosedMessage({ refs, clearClientState, closeSocket, setters });
};

export const attachLiveScripterSocketHandlers = ({
  socket,
  connectionToken,
  refs,
  clearClientState,
  closeSocket,
  setters,
  reconnectSocket,
}: {
  socket: WebSocket;
  connectionToken: number;
} & SocketLifecycleArgs): void => {
  const targetSocket = socket;
  targetSocket.onmessage = (event) => {
    if (refs.connectionTokenRef.current !== connectionToken) {
      return;
    }
    const message = parseLiveScripterServerMessage(event.data, setters);
    if (message === null) {
      return;
    }
    applyLiveScripterServerMessage({
      message,
      refs,
      clearClientState,
      closeSocket,
      setters,
      reconnectSocket,
    });
  };
  targetSocket.onerror = () => {
    handleSocketError(connectionToken, refs, setters);
  };
  targetSocket.onclose = () => {
    handleSocketClose({
      connectionToken,
      refs,
      clearClientState,
      setters,
      reconnectSocket,
    });
  };
};
