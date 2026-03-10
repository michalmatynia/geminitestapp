'use client';

import {
  useCallback,
  useEffect,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react';

import { trackKangurClientEvent } from '@/features/kangur/observability/client';

import { isAuthGuidedTutorTarget } from './KangurAiTutorWidget.helpers';
import {
  clearPersistedTutorAvatarPosition,
  persistGuestIntroRecord,
  persistHomeOnboardingRecord,
  type KangurAiTutorGuestIntroCheckResponse,
  type KangurAiTutorGuestIntroRecord,
  type KangurAiTutorHomeOnboardingRecord,
} from './KangurAiTutorWidget.storage';

import type {
  GuidedTutorAuthKind,
  GuidedTutorAuthMode,
  GuidedTutorTarget,
  TutorHomeOnboardingStep,
} from './KangurAiTutorWidget.types';

export const getGuidedGuestTargetKind = (authMode: GuidedTutorAuthMode): GuidedTutorAuthKind => {
  return authMode === 'create-account' ? 'create_account_action' : 'login_action';
};

export const getGuidedGuestModalTargetKind = (): GuidedTutorAuthKind => 'login_identifier_field';

type AuthState = {
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
} | null;

type LoginModalState = {
  authMode: GuidedTutorAuthMode;
  isOpen: boolean;
};

export function useKangurAiTutorGuestIntroFlow(input: {
  authState: AuthState;
  enabled: boolean;
  guestIntroCheckStartedRef: MutableRefObject<boolean>;
  guestIntroHelpVisible: boolean;
  guestIntroLocalSuppressionTrackedRef: MutableRefObject<boolean>;
  guestIntroRecord: KangurAiTutorGuestIntroRecord | null;
  guestIntroShownForCurrentEntryRef: MutableRefObject<boolean>;
  guestIntroVisible: boolean;
  contextualTutorMode: 'selection_explain' | 'section_explain' | null;
  guidedTutorTarget: GuidedTutorTarget | null;
  handleCloseChat: (reason: 'toggle') => void;
  handleOpenChat: (reason: 'toggle') => void;
  isOpen: boolean;
  isTutorHidden: boolean;
  mounted: boolean;
  selectionExplainTimeoutRef: MutableRefObject<number | null>;
  setGuidedTutorTarget: Dispatch<SetStateAction<GuidedTutorTarget | null>>;
  setGuestIntroHelpVisible: (value: boolean) => void;
  setGuestIntroRecord: (value: KangurAiTutorGuestIntroRecord | null) => void;
  setGuestIntroVisible: (value: boolean) => void;
  setHasNewMessage: (value: boolean) => void;
  shouldRepeatGuestIntroOnEntry: boolean;
  suppressAvatarClickRef: MutableRefObject<boolean>;
}) {
  const {
    authState,
    enabled,
    guestIntroCheckStartedRef,
    guestIntroHelpVisible,
    guestIntroLocalSuppressionTrackedRef,
    guestIntroRecord,
    guestIntroShownForCurrentEntryRef,
    guestIntroVisible,
    contextualTutorMode,
    guidedTutorTarget,
    handleCloseChat,
    handleOpenChat,
    isOpen,
    isTutorHidden,
    mounted,
    selectionExplainTimeoutRef,
    setGuidedTutorTarget,
    setGuestIntroHelpVisible,
    setGuestIntroRecord,
    setGuestIntroVisible,
    setHasNewMessage,
    shouldRepeatGuestIntroOnEntry,
    suppressAvatarClickRef,
  } = input;

  useEffect(() => {
    if (isTutorHidden) {
      setGuestIntroVisible(false);
      setGuestIntroHelpVisible(false);
      return;
    }

    if (!mounted || !authState || authState.isLoadingAuth) {
      return;
    }

    if (contextualTutorMode || guidedTutorTarget) {
      setGuestIntroVisible(false);
      setGuestIntroHelpVisible(false);
      return;
    }

    if (guestIntroVisible || guestIntroHelpVisible) {
      return;
    }

    if (authState.isAuthenticated) {
      return;
    }

    if (isOpen) {
      return;
    }

    if (shouldRepeatGuestIntroOnEntry) {
      if (guestIntroShownForCurrentEntryRef.current) {
        return;
      }

      guestIntroShownForCurrentEntryRef.current = true;
      guestIntroLocalSuppressionTrackedRef.current = false;
      const nextRecord = persistGuestIntroRecord('shown');
      setGuestIntroRecord(nextRecord);
      setGuestIntroVisible(true);
      trackKangurClientEvent('kangur_ai_tutor_guest_intro_shown', {
        reason: 'admin_every_visit',
      });
      return;
    }

    if (guestIntroRecord) {
      if (
        !guestIntroVisible &&
        !guestIntroHelpVisible &&
        !guestIntroLocalSuppressionTrackedRef.current
      ) {
        guestIntroLocalSuppressionTrackedRef.current = true;
        trackKangurClientEvent('kangur_ai_tutor_guest_intro_suppressed_local', {
          status: guestIntroRecord.status,
        });
      }
      return;
    }

    if (guestIntroCheckStartedRef.current) {
      return;
    }

    guestIntroCheckStartedRef.current = true;
    let cancelled = false;

    void fetch('/api/kangur/ai-tutor/guest-intro', {
      cache: 'no-store',
      credentials: 'same-origin',
    })
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }

        return (await response
          .json()
          .catch(() => null)) as KangurAiTutorGuestIntroCheckResponse | null;
      })
      .then((payload) => {
        if (cancelled || !payload) {
          return;
        }

        guestIntroLocalSuppressionTrackedRef.current = false;

        trackKangurClientEvent('kangur_ai_tutor_guest_intro_checked', {
          reason: payload.reason ?? null,
          shouldShow: payload.shouldShow === true,
        });

        if (payload.shouldShow !== true) {
          trackKangurClientEvent('kangur_ai_tutor_guest_intro_suppressed_server_seen', {
            reason: payload.reason ?? null,
          });
          return;
        }

        const nextRecord = persistGuestIntroRecord('shown');
        setGuestIntroRecord(nextRecord);
        setGuestIntroVisible(true);
        trackKangurClientEvent('kangur_ai_tutor_guest_intro_shown', {
          reason: payload.reason ?? null,
        });
      })
      .catch(() => {
        // Keep the prompt best-effort and silent on network failures.
      });

    return () => {
      cancelled = true;
    };
  }, [
    authState,
    guestIntroCheckStartedRef,
    guestIntroHelpVisible,
    guestIntroLocalSuppressionTrackedRef,
    guestIntroRecord,
    guestIntroShownForCurrentEntryRef,
    guestIntroVisible,
    contextualTutorMode,
    guidedTutorTarget,
    isTutorHidden,
    isOpen,
    mounted,
    setGuestIntroHelpVisible,
    setGuestIntroRecord,
    setGuestIntroVisible,
    shouldRepeatGuestIntroOnEntry,
  ]);

  const handleGuestIntroDismiss = useCallback((): void => {
    const nextRecord = persistGuestIntroRecord('dismissed');
    setGuestIntroRecord(nextRecord);
    setGuestIntroVisible(false);
    setGuestIntroHelpVisible(false);
    trackKangurClientEvent('kangur_ai_tutor_guest_intro_dismissed');
  }, [setGuestIntroHelpVisible, setGuestIntroRecord, setGuestIntroVisible]);

  const handleGuestIntroAccept = useCallback((): void => {
    const nextRecord = persistGuestIntroRecord('accepted');
    setGuestIntroRecord(nextRecord);
    setGuestIntroVisible(false);
    setGuestIntroHelpVisible(false);
    trackKangurClientEvent('kangur_ai_tutor_guest_intro_accepted', {
      hasInteractiveTutor: enabled,
    });

    if (enabled) {
      handleOpenChat('toggle');
    }
  }, [enabled, handleOpenChat, setGuestIntroHelpVisible, setGuestIntroRecord, setGuestIntroVisible]);

  const handleGuestIntroHelpClose = useCallback((): void => {
    setGuestIntroHelpVisible(false);
  }, [setGuestIntroHelpVisible]);

  const startGuidedGuestLogin = useCallback(
    (
      authMode: GuidedTutorAuthMode,
      source: 'guest_intro' | 'chat_message' = 'guest_intro'
    ): void => {
      trackKangurClientEvent('kangur_ai_tutor_guest_intro_login_clicked', {
        authMode,
        guidance: 'guided_navigation',
        source,
      });
      if (selectionExplainTimeoutRef.current !== null) {
        window.clearTimeout(selectionExplainTimeoutRef.current);
        selectionExplainTimeoutRef.current = null;
      }
      if (isOpen) {
        handleCloseChat('toggle');
      }
      setGuidedTutorTarget({
        mode: 'auth',
        authMode,
        kind: getGuidedGuestTargetKind(authMode),
      });
      setHasNewMessage(false);
      suppressAvatarClickRef.current = false;
    },
    [
      handleCloseChat,
      isOpen,
      selectionExplainTimeoutRef,
      setGuidedTutorTarget,
      setHasNewMessage,
      suppressAvatarClickRef,
    ]
  );

  const handleGuestIntroLogin = useCallback((): void => {
    setGuestIntroHelpVisible(false);
    startGuidedGuestLogin('sign-in');
  }, [setGuestIntroHelpVisible, startGuidedGuestLogin]);

  const handleGuestIntroCreateAccount = useCallback((): void => {
    setGuestIntroHelpVisible(false);
    startGuidedGuestLogin('create-account');
  }, [setGuestIntroHelpVisible, startGuidedGuestLogin]);

  return {
    handleGuestIntroAccept,
    handleGuestIntroCreateAccount,
    handleGuestIntroDismiss,
    handleGuestIntroHelpClose,
    handleGuestIntroLogin,
    startGuidedGuestLogin,
  };
}

export function useKangurAiTutorHomeOnboardingFlow(input: {
  canStartHomeOnboardingManually: boolean;
  closeChat: () => void;
  guidedTutorTarget: GuidedTutorTarget | null;
  homeOnboardingEligibleContentId: string;
  homeOnboardingMode: string;
  homeOnboardingRecord: KangurAiTutorHomeOnboardingRecord | null;
  homeOnboardingShownForCurrentEntryRef: MutableRefObject<boolean>;
  homeOnboardingStep: TutorHomeOnboardingStep | null;
  homeOnboardingStepIndex: number | null;
  homeOnboardingStepsLength: number;
  isEligibleForHomeOnboarding: boolean;
  sessionContentId: string | null | undefined;
  setDraggedAvatarPoint: (value: { x: number; y: number } | null) => void;
  setHomeOnboardingRecord: (value: KangurAiTutorHomeOnboardingRecord | null) => void;
  setHomeOnboardingStepIndex: (value: number | null) => void;
  shouldRepeatHomeOnboardingOnEntry: boolean;
}) {
  const {
    canStartHomeOnboardingManually,
    closeChat,
    guidedTutorTarget,
    homeOnboardingEligibleContentId,
    homeOnboardingMode,
    homeOnboardingRecord,
    homeOnboardingShownForCurrentEntryRef,
    homeOnboardingStep,
    homeOnboardingStepIndex,
    homeOnboardingStepsLength,
    isEligibleForHomeOnboarding,
    sessionContentId,
    setDraggedAvatarPoint,
    setHomeOnboardingRecord,
    setHomeOnboardingStepIndex,
    shouldRepeatHomeOnboardingOnEntry,
  } = input;

  useEffect(() => {
    if (homeOnboardingStepIndex === null) {
      return;
    }

    if (homeOnboardingStepsLength === 0) {
      setHomeOnboardingStepIndex(null);
      return;
    }

    if (homeOnboardingStepIndex >= homeOnboardingStepsLength) {
      setHomeOnboardingStepIndex(homeOnboardingStepsLength - 1);
    }
  }, [homeOnboardingStepIndex, homeOnboardingStepsLength, setHomeOnboardingStepIndex]);

  useEffect(() => {
    if (!isEligibleForHomeOnboarding) {
      homeOnboardingShownForCurrentEntryRef.current = false;
      if (sessionContentId !== homeOnboardingEligibleContentId) {
        setHomeOnboardingStepIndex(null);
      }
      return;
    }

    if (homeOnboardingStepIndex !== null || guidedTutorTarget) {
      return;
    }

    if (homeOnboardingMode === 'off') {
      return;
    }

    if (
      !shouldRepeatHomeOnboardingOnEntry &&
      (homeOnboardingRecord?.status === 'completed' || homeOnboardingRecord?.status === 'dismissed')
    ) {
      return;
    }

    if (homeOnboardingShownForCurrentEntryRef.current) {
      return;
    }

    homeOnboardingShownForCurrentEntryRef.current = true;
    const nextRecord = persistHomeOnboardingRecord('shown');
    setHomeOnboardingRecord(nextRecord);
    setHomeOnboardingStepIndex(0);
    trackKangurClientEvent('kangur_ai_tutor_home_onboarding_shown', {
      stepCount: homeOnboardingStepsLength,
    });
  }, [
    guidedTutorTarget,
    homeOnboardingEligibleContentId,
    homeOnboardingMode,
    homeOnboardingRecord?.status,
    homeOnboardingShownForCurrentEntryRef,
    homeOnboardingStepIndex,
    homeOnboardingStepsLength,
    isEligibleForHomeOnboarding,
    sessionContentId,
    setHomeOnboardingRecord,
    setHomeOnboardingStepIndex,
    shouldRepeatHomeOnboardingOnEntry,
  ]);

  const handleHomeOnboardingBack = useCallback((): void => {
    if (homeOnboardingStepIndex === null || homeOnboardingStepIndex <= 0) {
      return;
    }

    setHomeOnboardingStepIndex(homeOnboardingStepIndex - 1);
  }, [homeOnboardingStepIndex, setHomeOnboardingStepIndex]);

  const handleStartHomeOnboarding = useCallback((): void => {
    if (!canStartHomeOnboardingManually) {
      return;
    }

    const nextRecord = persistHomeOnboardingRecord('shown');
    setHomeOnboardingRecord(nextRecord);
    setHomeOnboardingStepIndex(0);
    homeOnboardingShownForCurrentEntryRef.current = true;
    trackKangurClientEvent('kangur_ai_tutor_home_onboarding_started_manual', {
      stepCount: homeOnboardingStepsLength,
      mode: homeOnboardingMode,
      previousStatus: homeOnboardingRecord?.status ?? null,
    });
  }, [
    canStartHomeOnboardingManually,
    homeOnboardingMode,
    homeOnboardingRecord?.status,
    homeOnboardingShownForCurrentEntryRef,
    homeOnboardingStepsLength,
    setHomeOnboardingRecord,
    setHomeOnboardingStepIndex,
  ]);

  const finishHomeOnboarding = useCallback(
    (
      status: KangurAiTutorHomeOnboardingRecord['status']
    ): KangurAiTutorHomeOnboardingRecord | null => {
      const nextRecord = persistHomeOnboardingRecord(status);
      setDraggedAvatarPoint(null);
      clearPersistedTutorAvatarPosition();
      setHomeOnboardingStepIndex(null);
      closeChat();
      return nextRecord;
    },
    [closeChat, setDraggedAvatarPoint, setHomeOnboardingStepIndex]
  );

  const handleHomeOnboardingFinishEarly = useCallback((): void => {
    const nextRecord = finishHomeOnboarding('dismissed');
    setHomeOnboardingRecord(nextRecord);
    trackKangurClientEvent('kangur_ai_tutor_home_onboarding_dismissed', {
      stepId: homeOnboardingStep?.id ?? null,
      stepIndex: homeOnboardingStepIndex,
    });
  }, [
    finishHomeOnboarding,
    homeOnboardingStep?.id,
    homeOnboardingStepIndex,
    setHomeOnboardingRecord,
  ]);

  const handleHomeOnboardingAdvance = useCallback((): void => {
    if (homeOnboardingStepIndex === null) {
      return;
    }

    const nextIndex = homeOnboardingStepIndex + 1;
    if (nextIndex >= homeOnboardingStepsLength) {
      const nextRecord = finishHomeOnboarding('completed');
      setHomeOnboardingRecord(nextRecord);
      trackKangurClientEvent('kangur_ai_tutor_home_onboarding_completed', {
        stepCount: homeOnboardingStepsLength,
      });
      return;
    }

    setHomeOnboardingStepIndex(nextIndex);
  }, [
    finishHomeOnboarding,
    homeOnboardingStepIndex,
    homeOnboardingStepsLength,
    setHomeOnboardingRecord,
    setHomeOnboardingStepIndex,
  ]);

  return {
    handleHomeOnboardingAdvance,
    handleHomeOnboardingBack,
    handleHomeOnboardingFinishEarly,
    handleStartHomeOnboarding,
  };
}

export function useKangurAiTutorGuidedAuthHandoffEffect(input: {
  guidedTutorTarget: GuidedTutorTarget | null;
  loginModal: LoginModalState;
  setGuidedTutorTarget: Dispatch<SetStateAction<GuidedTutorTarget | null>>;
}): void {
  const { guidedTutorTarget, loginModal, setGuidedTutorTarget } = input;

  useEffect(() => {
    if (!isAuthGuidedTutorTarget(guidedTutorTarget)) {
      return;
    }

    const expectedAuthMode = guidedTutorTarget.authMode;
    const canGuideIntoForm =
      loginModal.isOpen &&
      loginModal.authMode === expectedAuthMode &&
      guidedTutorTarget.kind !== getGuidedGuestModalTargetKind();
    if (canGuideIntoForm) {
      setGuidedTutorTarget((current) => {
        if (!isAuthGuidedTutorTarget(current) || current.authMode !== expectedAuthMode) {
          return current;
        }
        if (current.kind === getGuidedGuestModalTargetKind()) {
          return current;
        }
        return {
          ...current,
          kind: getGuidedGuestModalTargetKind(),
        };
      });
      return;
    }

    const shouldGuideBackToNav =
      !loginModal.isOpen &&
      (guidedTutorTarget.kind === 'login_form' ||
        guidedTutorTarget.kind === getGuidedGuestModalTargetKind());
    if (shouldGuideBackToNav) {
      setGuidedTutorTarget((current) => {
        if (!isAuthGuidedTutorTarget(current)) {
          return current;
        }
        if (current.kind !== 'login_form' && current.kind !== getGuidedGuestModalTargetKind()) {
          return current;
        }
        return {
          ...current,
          kind: getGuidedGuestTargetKind(current.authMode),
        };
      });
    }
  }, [guidedTutorTarget, loginModal.authMode, loginModal.isOpen, setGuidedTutorTarget]);
}
