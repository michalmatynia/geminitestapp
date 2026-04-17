'use client';

import type { LiveScripterStartRequest } from '@/shared/contracts/playwright-live-scripter';
import { liveScripterStartResponseSchema } from '@/shared/contracts/playwright-live-scripter';

import {
  attachLiveScripterSocketHandlers,
  parseLiveScripterServerMessage,
  applyLiveScripterServerMessage,
} from './playwrightLiveScripter.socket';
import type {
  LiveScripterConnectionRefs,
  LiveScripterStateSetters,
  StartOptions,
} from './playwrightLiveScripter.result';

const START_ENDPOINT = '/api/playwright/live-scripter/start';
const DISPOSE_ENDPOINT = '/api/playwright/live-scripter/dispose';

type LiveScripterErrorSetters = Pick<
  LiveScripterStateSetters,
  'setErrorMessage' | 'setStatus'
>;

const toNullable = <T>(value: T | null | undefined): T | null => value ?? null;

const setRefCurrent = <T>(ref: { current: T }, value: T): void => {
  const targetRef = ref;
  targetRef.current = value;
};

const resetReconnectAttempts = (refs: LiveScripterConnectionRefs): void => {
  const targetRefs = refs;
  targetRefs.reconnectAttemptsRef.current = 0;
};

const clearPendingMessages = (refs: LiveScripterConnectionRefs): void => {
  const targetRefs = refs;
  targetRefs.pendingMessagesRef.current = [];
};

const resetSocketHandlers = (socket: WebSocket): void => {
  const targetSocket = socket;
  targetSocket.onopen = null;
  targetSocket.onmessage = null;
  targetSocket.onerror = null;
  targetSocket.onclose = null;
};

const buildStartRequestBody = (
  url: string,
  options?: StartOptions
): LiveScripterStartRequest => ({
  url,
  viewport: options?.viewport,
  websiteId: toNullable(options?.websiteId),
  flowId: toNullable(options?.flowId),
  personaId: toNullable(options?.personaId),
  selectorProfile: toNullable(options?.selectorProfile),
});

const connectLiveScripterSocket = (
  socketPath: string,
  refs: LiveScripterConnectionRefs
): { socket: WebSocket; connectionToken: number } => {
  const { connectionTokenRef, socketRef, socketPathRef } = refs;
  const socket = new WebSocket(toWebSocketUrl(socketPath));
  const nextConnectionToken = connectionTokenRef.current + 1;
  setRefCurrent(connectionTokenRef, nextConnectionToken);
  setRefCurrent(socketRef, socket);
  setRefCurrent(socketPathRef, socketPath);
  return {
    socket,
    connectionToken: nextConnectionToken,
  };
};

const bindLiveScripterSocket = ({
  socketPath,
  refs,
  clearClientState,
  closeSocket,
  setters,
}: {
  socketPath: string;
  refs: LiveScripterConnectionRefs;
  clearClientState: () => void;
  closeSocket: () => void;
  setters: LiveScripterStateSetters;
}): void => {
  const reconnectSocket = (): void => {
    if (
      typeof refs.sessionIdRef.current !== 'string' ||
      refs.sessionIdRef.current.length === 0 ||
      typeof refs.socketPathRef.current !== 'string' ||
      refs.socketPathRef.current.length === 0
    ) {
      return;
    }
    const nextSocketPath = refs.socketPathRef.current;
    const { socket, connectionToken } = connectLiveScripterSocket(nextSocketPath, refs);
    attachLiveScripterSocketHandlers({
      socket,
      connectionToken,
      refs,
      clearClientState,
      closeSocket,
      setters,
      reconnectSocket,
    });
  };

  const { socket, connectionToken } = connectLiveScripterSocket(socketPath, refs);
  attachLiveScripterSocketHandlers({
    socket,
    connectionToken,
    refs,
    clearClientState,
    closeSocket,
    setters,
    reconnectSocket,
  });
};

const readStructuredErrorMessage = (value: string): string | null => {
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    if (typeof parsed['error'] === 'string' && parsed['error'].trim().length > 0) {
      return parsed['error'].trim();
    }
    if (typeof parsed['message'] === 'string' && parsed['message'].trim().length > 0) {
      return parsed['message'].trim();
    }
  } catch {
    return null;
  }
  return null;
};

const readFailedStartResponse = async (response: Response): Promise<string> => {
  const text = await response.text().catch(() => '');
  if (text.length === 0) {
    return `Live scripter start failed with ${response.status}.`;
  }

  return readStructuredErrorMessage(text) ?? text;
};

export const toWebSocketUrl = (socketPath: string): string => {
  const target = new URL(socketPath, window.location.origin);
  target.protocol = target.protocol === 'https:' ? 'wss:' : 'ws:';
  return target.toString();
};

export const clearLiveScripterClientState = ({
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

export const closeLiveScripterSocket = (
  socketRef: LiveScripterConnectionRefs['socketRef']
): void => {
  const targetSocketRef = socketRef;
  const socket = targetSocketRef.current;
  setRefCurrent(targetSocketRef, null);
  if (socket === null) {
    return;
  }
  resetSocketHandlers(socket);
  socket.close();
};

export const reportLiveScripterError = (
  message: string,
  setters: LiveScripterErrorSetters
): void => {
  setters.setErrorMessage(message);
  setters.setStatus('error');
};

export {
  applyLiveScripterServerMessage,
  attachLiveScripterSocketHandlers,
  parseLiveScripterServerMessage,
};

export const disposeLiveScripterSession = async ({
  refs,
  clearClientState,
  closeSocket,
  setters,
}: {
  refs: LiveScripterConnectionRefs;
  clearClientState: () => void;
  closeSocket: () => void;
  setters: LiveScripterErrorSetters;
}): Promise<void> => {
  const { connectionTokenRef, sessionIdRef } = refs;
  setRefCurrent(connectionTokenRef, connectionTokenRef.current + 1);
  resetReconnectAttempts(refs);
  clearPendingMessages(refs);
  closeSocket();
  const sessionId = sessionIdRef.current;
  setRefCurrent(sessionIdRef, null);
  setRefCurrent(refs.socketPathRef, null);
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

export const startLiveScripterSession = async ({
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
    reportLiveScripterError(await readFailedStartResponse(response), setters);
    return;
  }

  const payload = liveScripterStartResponseSchema.parse(await response.json());
  const { sessionIdRef } = refs;
  resetReconnectAttempts(refs);
  setRefCurrent(sessionIdRef, payload.sessionId);
  bindLiveScripterSocket({
    socketPath: payload.socketPath,
    refs,
    clearClientState,
    closeSocket,
    setters,
  });
};
