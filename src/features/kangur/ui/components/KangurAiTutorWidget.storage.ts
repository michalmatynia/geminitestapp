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

export type KangurAiTutorPendingFollowUpRecord = {
  version: 1;
  href: string;
  pathname: string;
  search: string;
  actionId: string;
  actionPage: string;
  messageIndex: number;
  hasQuery: boolean;
  sourceSurface: string | null;
  sourceContentId: string | null;
  sourceTitle: string | null;
  sourcePathname: string;
  sourceSearch: string;
  createdAt: string;
};

type KangurAiTutorWidgetStorageState = {
  lastSessionKey?: string | null;
  pendingFollowUp?: KangurAiTutorPendingFollowUpRecord | null;
};

const loadPersistedTutorWidgetState = (): KangurAiTutorWidgetStorageState | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(KANGUR_AI_TUTOR_WIDGET_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as KangurAiTutorWidgetStorageState | null;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

const persistTutorWidgetState = (state: KangurAiTutorWidgetStorageState): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const nextState = {
    ...(typeof state.lastSessionKey === 'string'
      ? { lastSessionKey: state.lastSessionKey }
      : {}),
    ...(state.pendingFollowUp ? { pendingFollowUp: state.pendingFollowUp } : {}),
  };

  try {
    if (!('lastSessionKey' in nextState) && !('pendingFollowUp' in nextState)) {
      window.sessionStorage.removeItem(KANGUR_AI_TUTOR_WIDGET_STORAGE_KEY);
      return;
    }

    window.sessionStorage.setItem(
      KANGUR_AI_TUTOR_WIDGET_STORAGE_KEY,
      JSON.stringify(nextState)
    );
  } catch {
    // Ignore storage write failures so the widget remains functional without storage.
  }
};

const isValidPendingFollowUpRecord = (
  value: unknown
): value is KangurAiTutorPendingFollowUpRecord => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const input = value as Partial<KangurAiTutorPendingFollowUpRecord>;
  return (
    input.version === 1 &&
    typeof input.href === 'string' &&
    typeof input.pathname === 'string' &&
    typeof input.search === 'string' &&
    typeof input.actionId === 'string' &&
    typeof input.actionPage === 'string' &&
    typeof input.messageIndex === 'number' &&
    typeof input.hasQuery === 'boolean' &&
    (typeof input.sourceSurface === 'string' || input.sourceSurface === null) &&
    (typeof input.sourceContentId === 'string' || input.sourceContentId === null) &&
    (typeof input.sourceTitle === 'string' || input.sourceTitle === null) &&
    typeof input.sourcePathname === 'string' &&
    typeof input.sourceSearch === 'string' &&
    typeof input.createdAt === 'string'
  );
};

export const loadPersistedTutorSessionKey = (): string | null => {
  const parsed = loadPersistedTutorWidgetState();
  return typeof parsed?.lastSessionKey === 'string' ? parsed.lastSessionKey : null;
};

export const persistTutorSessionKey = (sessionKey: string | null): void => {
  const currentState = loadPersistedTutorWidgetState();
  persistTutorWidgetState({
    ...currentState,
    lastSessionKey: sessionKey,
  });
};

export const clearPersistedTutorSessionKey = (): void => {
  const currentState = loadPersistedTutorWidgetState();
  persistTutorWidgetState({
    ...currentState,
    lastSessionKey: null,
  });
};

export const loadPersistedPendingTutorFollowUp =
  (): KangurAiTutorPendingFollowUpRecord | null => {
    const parsed = loadPersistedTutorWidgetState();
    return isValidPendingFollowUpRecord(parsed?.pendingFollowUp) ? parsed.pendingFollowUp : null;
  };

export const persistPendingTutorFollowUp = (
  followUp: KangurAiTutorPendingFollowUpRecord
): void => {
  const currentState = loadPersistedTutorWidgetState();
  persistTutorWidgetState({
    ...currentState,
    pendingFollowUp: followUp,
  });
};

export const clearPersistedPendingTutorFollowUp = (): void => {
  const currentState = loadPersistedTutorWidgetState();
  persistTutorWidgetState({
    ...currentState,
    pendingFollowUp: null,
  });
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
