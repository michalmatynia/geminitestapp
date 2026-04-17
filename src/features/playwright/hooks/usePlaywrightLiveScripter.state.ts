'use client';

import { useRef, useState } from 'react';

import type { LiveScripterPickedElement } from '@/shared/contracts/playwright-live-scripter';

import type {
  LiveScripterConnectionRefs,
  LiveScripterFrame,
  LiveScripterMode,
  LiveScripterStateSetters,
  LiveScripterStatus,
} from './playwrightLiveScripter.result';

export function useLiveScripterRefs(): LiveScripterConnectionRefs {
  return {
    sessionIdRef: useRef<string | null>(null),
    socketRef: useRef<WebSocket | null>(null),
    connectionTokenRef: useRef(0),
  };
}

export type LiveScripterClientState = {
  status: LiveScripterStatus;
  setStatus: React.Dispatch<React.SetStateAction<LiveScripterStatus>>;
  frame: Pick<LiveScripterFrame, 'dataUrl' | 'width' | 'height'> | null;
  setFrame: React.Dispatch<
    React.SetStateAction<Pick<LiveScripterFrame, 'dataUrl' | 'width' | 'height'> | null>
  >;
  pickedElement: LiveScripterPickedElement | null;
  setPickedElement: React.Dispatch<React.SetStateAction<LiveScripterPickedElement | null>>;
  currentUrl: string;
  setCurrentUrl: React.Dispatch<React.SetStateAction<string>>;
  currentTitle: string | null;
  setCurrentTitle: React.Dispatch<React.SetStateAction<string | null>>;
  errorMessage: string | null;
  setErrorMessage: React.Dispatch<React.SetStateAction<string | null>>;
  mode: LiveScripterMode;
  setMode: React.Dispatch<React.SetStateAction<LiveScripterMode>>;
};

export function useLiveScripterClientState(): LiveScripterClientState {
  const [status, setStatus] = useState<LiveScripterStatus>('idle');
  const [frame, setFrame] = useState<Pick<LiveScripterFrame, 'dataUrl' | 'width' | 'height'> | null>(null);
  const [pickedElement, setPickedElement] = useState<LiveScripterPickedElement | null>(null);
  const [currentUrl, setCurrentUrl] = useState('');
  const [currentTitle, setCurrentTitle] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<LiveScripterMode>('drive');

  return {
    status,
    setStatus,
    frame,
    setFrame,
    pickedElement,
    setPickedElement,
    currentUrl,
    setCurrentUrl,
    currentTitle,
    setCurrentTitle,
    errorMessage,
    setErrorMessage,
    mode,
    setMode,
  };
}

export function useLiveScripterStateSetters({
  setStatus,
  setFrame,
  setPickedElement,
  setCurrentUrl,
  setCurrentTitle,
  setErrorMessage,
}: {
  setStatus: React.Dispatch<React.SetStateAction<LiveScripterStatus>>;
  setFrame: React.Dispatch<
    React.SetStateAction<Pick<LiveScripterFrame, 'dataUrl' | 'width' | 'height'> | null>
  >;
  setPickedElement: React.Dispatch<React.SetStateAction<LiveScripterPickedElement | null>>;
  setCurrentUrl: React.Dispatch<React.SetStateAction<string>>;
  setCurrentTitle: React.Dispatch<React.SetStateAction<string | null>>;
  setErrorMessage: React.Dispatch<React.SetStateAction<string | null>>;
}): LiveScripterStateSetters {
  return {
    setStatus,
    setFrame,
    setPickedElement,
    setCurrentUrl,
    setCurrentTitle,
    setErrorMessage,
  };
}
