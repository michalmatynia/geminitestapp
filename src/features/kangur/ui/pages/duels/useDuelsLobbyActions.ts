'use client';

import { useCallback, useRef } from 'react';
import {
  withKangurClientError,
} from '@/features/kangur/observability/client';
import { getKangurPlatform } from '@/features/kangur/services/kangur-platform';
import {
  KANGUR_DUELS_DEFAULT_LOBBY_LIMIT,
} from '@/features/kangur/shared/duels-config';
import type {
  KangurDuelLobbyEntry,
  KangurDuelLobbyPresenceEntry,
} from '@/features/kangur/shared/contracts/kangur-duels';
import { isAbortLikeError } from '@/features/kangur/shared/utils/observability/is-abort-like-error';

const kangurPlatform = getKangurPlatform();

export const beginAbortableLobbyLoad = (input: {
  errorReset: () => void;
  loadingRef: React.MutableRefObject<AbortController | null>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  pollingRef: React.MutableRefObject<boolean>;
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
  loadingRef: React.MutableRefObject<AbortController | null>;
  pollingRef: React.MutableRefObject<boolean>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
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
