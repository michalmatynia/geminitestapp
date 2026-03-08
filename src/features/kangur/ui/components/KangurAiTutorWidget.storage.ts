import type { CSSProperties } from 'react';

import {
  AVATAR_SIZE,
  EDGE_GAP,
  KANGUR_AI_TUTOR_GUEST_INTRO_STORAGE_KEY,
  KANGUR_AI_TUTOR_WIDGET_STORAGE_KEY,
} from './KangurAiTutorWidget.shared';

export type KangurAiTutorGuestIntroRecord = {
  status: 'shown' | 'accepted' | 'dismissed';
  version: 1;
  updatedAt: string;
};

export type KangurAiTutorGuestIntroCheckResponse = {
  ok?: boolean;
  shouldShow?: boolean;
  reason?: string;
};

export const loadPersistedTutorSessionKey = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(KANGUR_AI_TUTOR_WIDGET_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as { lastSessionKey?: unknown } | null;
    return typeof parsed?.lastSessionKey === 'string' ? parsed.lastSessionKey : null;
  } catch {
    return null;
  }
};

export const persistTutorSessionKey = (sessionKey: string | null): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.setItem(
      KANGUR_AI_TUTOR_WIDGET_STORAGE_KEY,
      JSON.stringify({ lastSessionKey: sessionKey })
    );
  } catch {
    // Ignore storage write failures so the widget remains functional without storage.
  }
};

export const clearPersistedTutorSessionKey = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.removeItem(KANGUR_AI_TUTOR_WIDGET_STORAGE_KEY);
  } catch {
    // Ignore storage cleanup failures so the widget remains functional without storage.
  }
};

export const loadPersistedGuestIntroRecord = (): KangurAiTutorGuestIntroRecord | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(KANGUR_AI_TUTOR_GUEST_INTRO_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<KangurAiTutorGuestIntroRecord> | null;
    if (
      parsed?.version !== 1 ||
      (parsed?.status !== 'shown' &&
        parsed?.status !== 'accepted' &&
        parsed?.status !== 'dismissed') ||
      typeof parsed?.updatedAt !== 'string'
    ) {
      return null;
    }

    return {
      status: parsed.status,
      version: 1,
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return null;
  }
};

export const persistGuestIntroRecord = (
  status: KangurAiTutorGuestIntroRecord['status']
): KangurAiTutorGuestIntroRecord | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const nextRecord: KangurAiTutorGuestIntroRecord = {
    status,
    version: 1,
    updatedAt: new Date().toISOString(),
  };

  try {
    window.localStorage.setItem(
      KANGUR_AI_TUTOR_GUEST_INTRO_STORAGE_KEY,
      JSON.stringify(nextRecord)
    );
  } catch {
    // Ignore storage write failures so the widget stays non-blocking.
  }

  return nextRecord;
};

export const getGuestIntroPanelStyle = (viewport: {
  width: number;
  height: number;
}): CSSProperties => {
  const bottom = EDGE_GAP + AVATAR_SIZE + 16;

  if (viewport.width < 640) {
    return {
      left: EDGE_GAP,
      right: EDGE_GAP,
      bottom,
    };
  }

  return {
    right: EDGE_GAP,
    bottom,
    width: Math.min(360, Math.max(300, viewport.width * 0.28)),
  };
};
