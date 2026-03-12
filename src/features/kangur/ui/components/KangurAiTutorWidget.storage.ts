import {
  AVATAR_SIZE,
  EDGE_GAP,
  KANGUR_AI_TUTOR_GUEST_INTRO_STORAGE_KEY,
  KANGUR_AI_TUTOR_HOME_ONBOARDING_STORAGE_KEY,
  KANGUR_AI_TUTOR_WIDGET_STORAGE_KEY,
} from './KangurAiTutorWidget.shared';

import type { CSSProperties } from 'react';
import type {
  KangurAiTutorGuestIntroStatus,
  KangurAiTutorHomeOnboardingStatus,
  KangurAiTutorOnboardingRecord,
} from '@/shared/contracts/kangur-ai-tutor';
import type { TutorPanelPositionMode, TutorPanelSnapState } from './KangurAiTutorWidget.shared';

type KangurAiTutorGuestIntroRecord = KangurAiTutorOnboardingRecord<KangurAiTutorGuestIntroStatus>;
type KangurAiTutorHomeOnboardingRecord =
  KangurAiTutorOnboardingRecord<KangurAiTutorHomeOnboardingStatus>;

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
  actionLabel: string;
  actionReason: string | null;
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

export type KangurAiTutorPendingNavigationTarget = {
  version: 1;
  href: string;
  pathname: string;
  hash: string;
  nodeId: string;
  label: string;
  route: string | null;
  anchorId: string | null;
  messageIndex: number;
  sourcePathname: string;
  sourceSearch: string;
  createdAt: string;
};

export type KangurAiTutorAvatarPositionRecord = {
  version: 1;
  left: number;
  top: number;
  updatedAt: string;
};

export type KangurAiTutorPanelPositionRecord = {
  version: 1;
  left: number;
  mode?: TutorPanelPositionMode;
  snap?: TutorPanelSnapState;
  top: number;
  updatedAt: string;
};

type KangurAiTutorWidgetStorageState = {
  lastSessionKey?: string | null;
  pendingFollowUp?: KangurAiTutorPendingFollowUpRecord | null;
  pendingNavigationTarget?: KangurAiTutorPendingNavigationTarget | null;
  avatarPosition?: KangurAiTutorAvatarPositionRecord | null;
  panelPosition?: KangurAiTutorPanelPositionRecord | null;
  hidden?: boolean;
};

const KANGUR_AI_TUTOR_VISIBILITY_CHANGE_EVENT = 'kangur-ai-tutor-visibility-change';

type TutorVisibilityChangeDetail = {
  hidden: boolean;
};

const isTutorVisibilityChangeDetail = (
  detail: unknown
): detail is TutorVisibilityChangeDetail => {
  if (!detail || typeof detail !== 'object') {
    return false;
  }

  if (!('hidden' in detail)) {
    return false;
  }

  return typeof (detail as { hidden?: unknown }).hidden === 'boolean';
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
    ...(state.pendingNavigationTarget
      ? { pendingNavigationTarget: state.pendingNavigationTarget }
      : {}),
    ...(state.avatarPosition ? { avatarPosition: state.avatarPosition } : {}),
    ...(state.panelPosition ? { panelPosition: state.panelPosition } : {}),
    ...(state.hidden === true ? { hidden: true } : {}),
  };

  try {
    if (
      !('lastSessionKey' in nextState) &&
      !('pendingFollowUp' in nextState) &&
      !('pendingNavigationTarget' in nextState) &&
      !('avatarPosition' in nextState) &&
      !('panelPosition' in nextState) &&
      !('hidden' in nextState)
    ) {
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
    typeof input.actionLabel === 'string' &&
    (typeof input.actionReason === 'string' || input.actionReason === null) &&
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

const isValidPendingNavigationTargetRecord = (
  value: unknown
): value is KangurAiTutorPendingNavigationTarget => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const input = value as Partial<KangurAiTutorPendingNavigationTarget>;
  return (
    input.version === 1 &&
    typeof input.href === 'string' &&
    typeof input.pathname === 'string' &&
    typeof input.hash === 'string' &&
    typeof input.nodeId === 'string' &&
    typeof input.label === 'string' &&
    (typeof input.route === 'string' || input.route === null) &&
    (typeof input.anchorId === 'string' || input.anchorId === null) &&
    typeof input.messageIndex === 'number' &&
    typeof input.sourcePathname === 'string' &&
    typeof input.sourceSearch === 'string' &&
    typeof input.createdAt === 'string'
  );
};

const isValidAvatarPositionRecord = (
  value: unknown
): value is KangurAiTutorAvatarPositionRecord => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const input = value as Partial<KangurAiTutorAvatarPositionRecord>;
  return (
    input.version === 1 &&
    typeof input.left === 'number' &&
    Number.isFinite(input.left) &&
    typeof input.top === 'number' &&
    Number.isFinite(input.top) &&
    typeof input.updatedAt === 'string'
  );
};

const isValidPanelPositionRecord = (
  value: unknown
): value is KangurAiTutorPanelPositionRecord => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const input = value as Partial<KangurAiTutorPanelPositionRecord>;
  return (
    input.version === 1 &&
    typeof input.left === 'number' &&
    Number.isFinite(input.left) &&
    (input.mode === undefined || input.mode === 'manual' || input.mode === 'contextual') &&
    (input.snap === undefined ||
      input.snap === 'free' ||
      input.snap === 'left' ||
      input.snap === 'right' ||
      input.snap === 'top' ||
      input.snap === 'bottom' ||
      input.snap === 'top-left' ||
      input.snap === 'top-right' ||
      input.snap === 'bottom-left' ||
      input.snap === 'bottom-right') &&
    typeof input.top === 'number' &&
    Number.isFinite(input.top) &&
    typeof input.updatedAt === 'string'
  );
};

const clampNumber = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const getAvatarViewportBounds = (): {
  maxLeft: number;
  maxTop: number;
  minLeft: number;
  minTop: number;
} | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const viewportWidth = Number.isFinite(window.innerWidth) ? window.innerWidth : 0;
  const viewportHeight = Number.isFinite(window.innerHeight) ? window.innerHeight : 0;

  if (viewportWidth <= 0 || viewportHeight <= 0) {
    return null;
  }

  return {
    maxLeft: Math.max(EDGE_GAP, viewportWidth - EDGE_GAP - AVATAR_SIZE),
    maxTop: Math.max(EDGE_GAP, viewportHeight - EDGE_GAP - AVATAR_SIZE),
    minLeft: EDGE_GAP,
    minTop: EDGE_GAP,
  };
};

const normalizeTutorAvatarPositionRecord = (
  value: KangurAiTutorAvatarPositionRecord
): KangurAiTutorAvatarPositionRecord => {
  const bounds = getAvatarViewportBounds();
  if (!bounds) {
    return value;
  }

  const left = clampNumber(value.left, bounds.minLeft, bounds.maxLeft);
  const top = clampNumber(value.top, bounds.minTop, bounds.maxTop);

  if (left === value.left && top === value.top) {
    return value;
  }

  return {
    ...value,
    left,
    top,
  };
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

export const loadPersistedPendingNavigationTarget =
  (): KangurAiTutorPendingNavigationTarget | null => {
    const parsed = loadPersistedTutorWidgetState();
    return isValidPendingNavigationTargetRecord(parsed?.pendingNavigationTarget)
      ? parsed.pendingNavigationTarget
      : null;
  };

export const persistPendingNavigationTarget = (
  target: KangurAiTutorPendingNavigationTarget
): void => {
  const currentState = loadPersistedTutorWidgetState();
  persistTutorWidgetState({
    ...currentState,
    pendingNavigationTarget: target,
  });
};

export const clearPersistedPendingNavigationTarget = (): void => {
  const currentState = loadPersistedTutorWidgetState();
  persistTutorWidgetState({
    ...currentState,
    pendingNavigationTarget: null,
  });
};

const dispatchTutorVisibilityChange = (hidden: boolean): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(KANGUR_AI_TUTOR_VISIBILITY_CHANGE_EVENT, {
      detail: { hidden },
    })
  );
};

export const loadPersistedTutorVisibilityHidden = (): boolean =>
  loadPersistedTutorWidgetState()?.hidden === true;

export const persistTutorVisibilityHidden = (hidden: boolean): boolean => {
  const currentState = loadPersistedTutorWidgetState();
  persistTutorWidgetState({
    ...currentState,
    avatarPosition: null,
    panelPosition: null,
    hidden,
  });
  dispatchTutorVisibilityChange(hidden);
  return hidden;
};

export const subscribeToTutorVisibilityChanges = (
  listener: (hidden: boolean) => void
): (() => void) => {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  listener(loadPersistedTutorVisibilityHidden());

  const handleVisibilityChange = (event: Event): void => {
    if (event instanceof CustomEvent) {
      const detail = (event as CustomEvent<unknown>).detail;
      if (isTutorVisibilityChangeDetail(detail)) {
        listener(detail.hidden);
        return;
      }
    }

    listener(loadPersistedTutorVisibilityHidden());
  };

  window.addEventListener(
    KANGUR_AI_TUTOR_VISIBILITY_CHANGE_EVENT,
    handleVisibilityChange as EventListener
  );

  return () => {
    window.removeEventListener(
      KANGUR_AI_TUTOR_VISIBILITY_CHANGE_EVENT,
      handleVisibilityChange as EventListener
    );
  };
};

export const loadPersistedTutorAvatarPosition =
  (): KangurAiTutorAvatarPositionRecord | null => {
    const parsed = loadPersistedTutorWidgetState();
    if (!isValidAvatarPositionRecord(parsed?.avatarPosition)) {
      return null;
    }

    const normalizedRecord = normalizeTutorAvatarPositionRecord(parsed.avatarPosition);
    if (normalizedRecord !== parsed.avatarPosition) {
      persistTutorWidgetState({
        ...parsed,
        avatarPosition: normalizedRecord,
      });
    }

    return normalizedRecord;
  };

export const persistTutorAvatarPosition = (
  position: Pick<KangurAiTutorAvatarPositionRecord, 'left' | 'top'>
): KangurAiTutorAvatarPositionRecord | null => {
  if (!Number.isFinite(position.left) || !Number.isFinite(position.top)) {
    return null;
  }

  const nextRecord = normalizeTutorAvatarPositionRecord({
    version: 1,
    left: position.left,
    top: position.top,
    updatedAt: new Date().toISOString(),
  });

  const currentState = loadPersistedTutorWidgetState();
  persistTutorWidgetState({
    ...currentState,
    avatarPosition: nextRecord,
  });
  return nextRecord;
};

export const clearPersistedTutorAvatarPosition = (): void => {
  const currentState = loadPersistedTutorWidgetState();
  persistTutorWidgetState({
    ...currentState,
    avatarPosition: null,
  });
};

export const loadPersistedTutorPanelPosition =
  (): KangurAiTutorPanelPositionRecord | null => {
    const parsed = loadPersistedTutorWidgetState();
    return isValidPanelPositionRecord(parsed?.panelPosition) ? parsed.panelPosition : null;
  };

export const persistTutorPanelPosition = (
  position: Pick<KangurAiTutorPanelPositionRecord, 'left' | 'top'> & {
    mode?: TutorPanelPositionMode;
    snap?: TutorPanelSnapState;
  }
): KangurAiTutorPanelPositionRecord | null => {
  if (!Number.isFinite(position.left) || !Number.isFinite(position.top)) {
    return null;
  }

  const nextRecord: KangurAiTutorPanelPositionRecord = {
    version: 1,
    left: position.left,
    ...(position.mode ? { mode: position.mode } : {}),
    ...(position.snap ? { snap: position.snap } : {}),
    top: position.top,
    updatedAt: new Date().toISOString(),
  };

  const currentState = loadPersistedTutorWidgetState();
  persistTutorWidgetState({
    ...currentState,
    panelPosition: nextRecord,
  });
  return nextRecord;
};

export const clearPersistedTutorPanelPosition = (): void => {
  const currentState = loadPersistedTutorWidgetState();
  persistTutorWidgetState({
    ...currentState,
    panelPosition: null,
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

export const loadPersistedHomeOnboardingRecord = (): KangurAiTutorHomeOnboardingRecord | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(KANGUR_AI_TUTOR_HOME_ONBOARDING_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<KangurAiTutorHomeOnboardingRecord> | null;
    if (
      parsed?.version !== 1 ||
      (parsed?.status !== 'shown' &&
        parsed?.status !== 'completed' &&
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

export const persistHomeOnboardingRecord = (
  status: KangurAiTutorHomeOnboardingRecord['status']
): KangurAiTutorHomeOnboardingRecord | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const nextRecord: KangurAiTutorHomeOnboardingRecord = {
    status,
    version: 1,
    updatedAt: new Date().toISOString(),
  };

  try {
    window.localStorage.setItem(
      KANGUR_AI_TUTOR_HOME_ONBOARDING_STORAGE_KEY,
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
