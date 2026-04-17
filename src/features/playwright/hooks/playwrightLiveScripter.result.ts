'use client';

import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

import type {
  LiveScripterClientMessage,
  LiveScripterPickedElement,
  LiveScripterStartRequest,
  LiveScripterServerMessage,
} from '@/shared/contracts/playwright-live-scripter';

export type LiveScripterStatus = 'idle' | 'starting' | 'live' | 'error';
export type LiveScripterMode = 'drive' | 'pick';
export type LiveScripterFrame = Extract<
  LiveScripterServerMessage,
  { type: 'frame' }
>;

export type StartOptions = Pick<
  LiveScripterStartRequest,
  'viewport' | 'websiteId' | 'flowId' | 'personaId' | 'selectorProfile'
>;

export type LiveScripterConnectionRefs = {
  sessionIdRef: MutableRefObject<string | null>;
  socketRef: MutableRefObject<WebSocket | null>;
  socketPathRef: MutableRefObject<string | null>;
  connectionTokenRef: MutableRefObject<number>;
  reconnectAttemptsRef: MutableRefObject<number>;
  pendingMessagesRef: MutableRefObject<LiveScripterClientMessage[]>;
};

export const flushPendingLiveScripterMessages = (
  refs: LiveScripterConnectionRefs
): void => {
  const socket = refs.socketRef.current;
  if (socket?.readyState !== WebSocket.OPEN || refs.pendingMessagesRef.current.length === 0) {
    return;
  }

  const queuedMessages = refs.pendingMessagesRef.current;
  refs.pendingMessagesRef.current = [];
  for (const message of queuedMessages) {
    socket.send(JSON.stringify(message));
  }
};

export type LiveScripterStateSetters = {
  setStatus: Dispatch<SetStateAction<LiveScripterStatus>>;
  setFrame: Dispatch<
    SetStateAction<Pick<LiveScripterFrame, 'dataUrl' | 'width' | 'height'> | null>
  >;
  setPickedElement: Dispatch<SetStateAction<LiveScripterPickedElement | null>>;
  setCurrentUrl: Dispatch<SetStateAction<string>>;
  setCurrentTitle: Dispatch<SetStateAction<string | null>>;
  setErrorMessage: Dispatch<SetStateAction<string | null>>;
};

export type LiveScripterResult = {
  status: LiveScripterStatus;
  frame: Pick<LiveScripterFrame, 'dataUrl' | 'width' | 'height'> | null;
  pickedElement: LiveScripterPickedElement | null;
  currentUrl: string;
  currentTitle: string | null;
  errorMessage: string | null;
  mode: LiveScripterMode;
  setMode: Dispatch<SetStateAction<LiveScripterMode>>;
  start: (url: string, options?: StartOptions) => Promise<void>;
  dispose: () => Promise<void>;
  send: (message: LiveScripterClientMessage) => void;
  driveClick: (x: number, y: number) => void;
  driveType: (value: string) => void;
  driveScroll: (deltaX: number, deltaY: number) => void;
  pickAt: (x: number, y: number) => void;
  navigate: (url: string) => void;
  back: () => void;
  forward: () => void;
  reload: () => void;
  clearPickedElement: () => void;
};

type BuildLiveScripterResultParams = Omit<
  LiveScripterResult,
  | 'driveClick'
  | 'driveType'
  | 'driveScroll'
  | 'pickAt'
  | 'navigate'
  | 'back'
  | 'forward'
  | 'reload'
  | 'clearPickedElement'
> & {
  setPickedElement: Dispatch<SetStateAction<LiveScripterPickedElement | null>>;
};

export const buildLiveScripterResult = ({
  status,
  frame,
  pickedElement,
  currentUrl,
  currentTitle,
  errorMessage,
  mode,
  setMode,
  start,
  dispose,
  send,
  setPickedElement,
}: BuildLiveScripterResultParams): LiveScripterResult => ({
  status,
  frame,
  pickedElement,
  currentUrl,
  currentTitle,
  errorMessage,
  mode,
  setMode,
  start,
  dispose,
  send,
  driveClick: (x, y) => send({ type: 'drive_click', x, y }),
  driveType: (value) => send({ type: 'drive_type', value }),
  driveScroll: (deltaX, deltaY) => send({ type: 'drive_scroll', deltaX, deltaY }),
  pickAt: (x, y) => send({ type: 'pick_at', x, y }),
  navigate: (url) => send({ type: 'navigate', url }),
  back: () => send({ type: 'back' }),
  forward: () => send({ type: 'forward' }),
  reload: () => send({ type: 'reload' }),
  clearPickedElement: () => setPickedElement(null),
});
