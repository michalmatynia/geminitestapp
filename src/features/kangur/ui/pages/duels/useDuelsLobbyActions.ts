'use client';

import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

export const beginAbortableLobbyLoad = (input: {
  errorReset: () => void;
  loadingRef: MutableRefObject<AbortController | null>;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  pollingRef: MutableRefObject<boolean>;
  showLoading: boolean;
}): AbortController => {
  if (input.loadingRef.current !== null && input.showLoading) {
    input.loadingRef.current.abort();
  }

  const controller = new AbortController();
  input.loadingRef.current = controller;
  input.pollingRef.current = true;
  if (input.showLoading) {
    input.setIsLoading(true);
  }
  input.errorReset();
  return controller;
};

export const finishAbortableLobbyLoad = (input: {
  controller: AbortController;
  loadingRef: MutableRefObject<AbortController | null>;
  pollingRef: MutableRefObject<boolean>;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  showLoading: boolean;
}): void => {
  if (input.loadingRef.current !== input.controller) {
    return;
  }

  input.loadingRef.current = null;
  input.pollingRef.current = false;
  if (input.showLoading) {
    input.setIsLoading(false);
  }
};
