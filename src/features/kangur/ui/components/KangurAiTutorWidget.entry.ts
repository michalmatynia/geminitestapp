'use client';

import {
  useCallback,
  useEffect,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react';

import { trackKangurClientEvent } from '@/features/kangur/observability/client';
import type { KangurAuthMode } from '@/features/kangur/shared/contracts/kangur-auth';

import { isAuthGuidedTutorTarget } from './KangurAiTutorWidget.helpers';
import {
  clearPersistedTutorAvatarPosition,
  persistGuestIntroRecord,
  persistHomeOnboardingRecord,
} from './KangurAiTutorWidget.storage';

import type {
  GuidedTutorAuthKind,
  GuidedTutorTarget,
  KangurAiTutorGuestIntroRecord,
  KangurAiTutorHomeOnboardingRecord,
  PendingSelectionResponse,
  TutorHomeOnboardingStep,
} from './KangurAiTutorWidget.types';

const AUTO_START_HOME_ONBOARDING_ON_FIRST_VISIT = false;

export const getGuidedGuestTargetKind = (authMode: KangurAuthMode): GuidedTutorAuthKind => {
  return authMode === 'create-account' ? 'create_account_action' : 'login_action';
};

export const getGuidedGuestModalTargetKind = (): GuidedTutorAuthKind => 'login_identifier_field';

type AuthState = {
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
} | null;

type LoginModalState = {
  authMode: KangurAuthMode;
  isOpen: boolean;
};

type GuestIntroEntryAction =
  | 'hide_guest_surfaces'
  | 'hide_surfaces'
  | 'mark_intro_check_started'
  | 'show_repeat_badge'
  | 'show_unseen_badge'
  | 'wait';

type HomeOnboardingEntryAction = 'start' | 'wait';

const hideGuestIntroPanels = ({
  setGuestAuthFormVisible,
  setGuestIntroHelpVisible,
  setGuestIntroVisible,
}: {
  setGuestAuthFormVisible: (value: boolean) => void;
  setGuestIntroHelpVisible: (value: boolean) => void;
  setGuestIntroVisible: (value: boolean) => void;
}): void => {
  setGuestIntroVisible(false);
  setGuestIntroHelpVisible(false);
  setGuestAuthFormVisible(false);
};

const hideGuestIntroSurfaces = ({
  setCanonicalTutorModalVisible,
  setGuestAuthFormVisible,
  setGuestIntroHelpVisible,
  setGuestIntroVisible,
}: {
  setCanonicalTutorModalVisible: (value: boolean) => void;
  setGuestAuthFormVisible: (value: boolean) => void;
  setGuestIntroHelpVisible: (value: boolean) => void;
  setGuestIntroVisible: (value: boolean) => void;
}): void => {
  setCanonicalTutorModalVisible(false);
  hideGuestIntroPanels({
    setGuestAuthFormVisible,
    setGuestIntroHelpVisible,
    setGuestIntroVisible,
  });
};

const isGuestIntroAuthPending = ({
  authState,
  mounted,
}: {
  authState: AuthState;
  mounted: boolean;
}): boolean => !mounted || !authState || authState.isLoadingAuth;

const shouldHideGuestIntroPanels = ({
  authState,
  hasContextualTakeover,
}: {
  authState: AuthState;
  hasContextualTakeover: boolean;
}): boolean => Boolean(authState?.isAuthenticated) || hasContextualTakeover;

const hasVisibleGuestIntroPanels = ({
  guestAuthFormVisible,
  guestIntroHelpVisible,
  guestIntroVisible,
}: {
  guestAuthFormVisible: boolean;
  guestIntroHelpVisible: boolean;
  guestIntroVisible: boolean;
}): boolean => guestIntroVisible || guestIntroHelpVisible || guestAuthFormVisible;

const shouldShowUnseenGuestIntroBadge = ({
  guestIntroCheckStarted,
  guestIntroRecord,
}: {
  guestIntroCheckStarted: boolean;
  guestIntroRecord: KangurAiTutorGuestIntroRecord | null;
}): boolean => !guestIntroRecord && !guestIntroCheckStarted;

const resolveGuestIntroPostAuthAction = ({
  canonicalTutorModalVisible,
  guestAuthFormVisible,
  guestIntroCheckStarted,
  guestIntroHelpVisible,
  guestIntroRecord,
  guestIntroVisible,
  isOpen,
  shouldRepeatGuestIntroOnEntry,
}: {
  canonicalTutorModalVisible: boolean;
  guestAuthFormVisible: boolean;
  guestIntroCheckStarted: boolean;
  guestIntroHelpVisible: boolean;
  guestIntroRecord: KangurAiTutorGuestIntroRecord | null;
  guestIntroVisible: boolean;
  isOpen: boolean;
  shouldRepeatGuestIntroOnEntry: boolean;
}): GuestIntroEntryAction => {
  if (canonicalTutorModalVisible) {
    return 'wait';
  }
  if (
    hasVisibleGuestIntroPanels({
      guestAuthFormVisible,
      guestIntroHelpVisible,
      guestIntroVisible,
    })
  ) {
    return 'wait';
  }
  if (isOpen) {
    return guestIntroRecord ? 'wait' : 'mark_intro_check_started';
  }
  if (shouldRepeatGuestIntroOnEntry) {
    return 'show_repeat_badge';
  }
  return shouldShowUnseenGuestIntroBadge({
    guestIntroCheckStarted,
    guestIntroRecord,
  })
    ? 'show_unseen_badge'
    : 'wait';
};

const resolveGuestIntroEntryAction = ({
  authState,
  canonicalTutorModalVisible,
  guestAuthFormVisible,
  guestIntroCheckStarted,
  guestIntroHelpVisible,
  guestIntroRecord,
  guestIntroVisible,
  hasContextualTakeover,
  isOpen,
  isTutorHidden,
  mounted,
  shouldRepeatGuestIntroOnEntry,
}: {
  authState: AuthState;
  canonicalTutorModalVisible: boolean;
  guestAuthFormVisible: boolean;
  guestIntroCheckStarted: boolean;
  guestIntroHelpVisible: boolean;
  guestIntroRecord: KangurAiTutorGuestIntroRecord | null;
  guestIntroVisible: boolean;
  hasContextualTakeover: boolean;
  isOpen: boolean;
  isTutorHidden: boolean;
  mounted: boolean;
  shouldRepeatGuestIntroOnEntry: boolean;
}): GuestIntroEntryAction => {
  if (isTutorHidden) {
    return 'hide_surfaces';
  }
  if (isGuestIntroAuthPending({ authState, mounted })) {
    return 'wait';
  }
  if (shouldHideGuestIntroPanels({ authState, hasContextualTakeover })) {
    return 'hide_guest_surfaces';
  }
  return resolveGuestIntroPostAuthAction({
    canonicalTutorModalVisible,
    guestAuthFormVisible,
    guestIntroCheckStarted,
    guestIntroHelpVisible,
    guestIntroRecord,
    guestIntroVisible,
    isOpen,
    shouldRepeatGuestIntroOnEntry,
  });
};

const hasCompletedHomeOnboardingStatus = (
  status: KangurAiTutorHomeOnboardingRecord['status'] | null | undefined
): boolean => status === 'completed' || status === 'dismissed';

const hasBlockedHomeOnboardingStep = ({
  guidedTutorTarget,
  homeOnboardingMode,
  homeOnboardingStepIndex,
}: {
  guidedTutorTarget: GuidedTutorTarget | null;
  homeOnboardingMode: string;
  homeOnboardingStepIndex: number | null;
}): boolean =>
  homeOnboardingStepIndex !== null || guidedTutorTarget !== null || homeOnboardingMode === 'off';

const shouldWaitForHomeOnboardingAutoStart = ({
  homeOnboardingRecord,
  shouldRepeatHomeOnboardingOnEntry,
}: {
  homeOnboardingRecord: KangurAiTutorHomeOnboardingRecord | null;
  shouldRepeatHomeOnboardingOnEntry: boolean;
}): boolean => {
  if (!shouldRepeatHomeOnboardingOnEntry && !AUTO_START_HOME_ONBOARDING_ON_FIRST_VISIT) {
    return true;
  }
  return (
    !shouldRepeatHomeOnboardingOnEntry &&
    hasCompletedHomeOnboardingStatus(homeOnboardingRecord?.status)
  );
};

const resolveHomeOnboardingEntryAction = ({
  guidedTutorTarget,
  homeOnboardingMode,
  homeOnboardingRecord,
  homeOnboardingShownForCurrentEntry,
  homeOnboardingStepIndex,
  shouldRepeatHomeOnboardingOnEntry,
}: {
  guidedTutorTarget: GuidedTutorTarget | null;
  homeOnboardingMode: string;
  homeOnboardingRecord: KangurAiTutorHomeOnboardingRecord | null;
  homeOnboardingShownForCurrentEntry: boolean;
  homeOnboardingStepIndex: number | null;
  shouldRepeatHomeOnboardingOnEntry: boolean;
}): HomeOnboardingEntryAction => {
  if (
    hasBlockedHomeOnboardingStep({
      guidedTutorTarget,
      homeOnboardingMode,
      homeOnboardingStepIndex,
    })
  ) {
    return 'wait';
  }
  if (
    shouldWaitForHomeOnboardingAutoStart({
      homeOnboardingRecord,
      shouldRepeatHomeOnboardingOnEntry,
    })
  ) {
    return 'wait';
  }
  return homeOnboardingShownForCurrentEntry ? 'wait' : 'start';
};

export function useKangurAiTutorGuestIntroFlow(input: {
  authState: AuthState;
  canonicalTutorModalVisible: boolean;
  enabled: boolean;
  guestIntroCheckStartedRef: MutableRefObject<boolean>;
  guestAuthFormVisible: boolean;
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
  selectionGuidanceHandoffText: string | null;
  selectionExplainTimeoutRef: MutableRefObject<number | null>;
  selectionResponsePending: PendingSelectionResponse | null;
  setCanonicalTutorModalVisible: (value: boolean) => void;
  setGuestAuthFormVisible: (value: boolean) => void;
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
    canonicalTutorModalVisible,
    enabled,
    guestIntroCheckStartedRef,
    guestAuthFormVisible,
    guestIntroHelpVisible,
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
    selectionGuidanceHandoffText,
    selectionExplainTimeoutRef,
    selectionResponsePending,
    setCanonicalTutorModalVisible,
    setGuestAuthFormVisible,
    setGuidedTutorTarget,
    setGuestIntroHelpVisible,
    setGuestIntroRecord,
    setGuestIntroVisible,
    setHasNewMessage,
    shouldRepeatGuestIntroOnEntry,
    suppressAvatarClickRef,
  } = input;
  const hasContextualTakeover =
    contextualTutorMode !== null ||
    guidedTutorTarget !== null ||
    selectionGuidanceHandoffText !== null ||
    selectionResponsePending !== null;

  useEffect(() => {
    const entryAction = resolveGuestIntroEntryAction({
      authState,
      canonicalTutorModalVisible,
      guestAuthFormVisible,
      guestIntroCheckStarted: guestIntroCheckStartedRef.current,
      guestIntroHelpVisible,
      guestIntroRecord,
      guestIntroVisible,
      hasContextualTakeover,
      isOpen,
      isTutorHidden,
      mounted,
      shouldRepeatGuestIntroOnEntry,
    });

    if (entryAction === 'hide_surfaces') {
      hideGuestIntroSurfaces({
        setCanonicalTutorModalVisible,
        setGuestAuthFormVisible,
        setGuestIntroHelpVisible,
        setGuestIntroVisible,
      });
      return;
    }

    if (entryAction === 'hide_guest_surfaces') {
      hideGuestIntroPanels({
        setGuestAuthFormVisible,
        setGuestIntroHelpVisible,
        setGuestIntroVisible,
      });
      return;
    }

    if (entryAction === 'mark_intro_check_started') {
      guestIntroCheckStartedRef.current = true;
      return;
    }

    if (entryAction === 'show_repeat_badge') {
      if (guestIntroShownForCurrentEntryRef.current) {
        return;
      }
      guestIntroShownForCurrentEntryRef.current = true;
      setHasNewMessage(true);
      trackKangurClientEvent('kangur_ai_tutor_guest_intro_shown', {
        reason: 'admin_every_visit_badge',
      });
      return;
    }

    if (entryAction === 'show_unseen_badge') {
      setHasNewMessage(true);
    }
  }, [
    authState,
    guestIntroCheckStartedRef,
    guestIntroHelpVisible,
    guestIntroRecord,
    guestIntroShownForCurrentEntryRef,
    guestIntroVisible,
    guestAuthFormVisible,
    canonicalTutorModalVisible,
    contextualTutorMode,
    guidedTutorTarget,
    isTutorHidden,
    isOpen,
    mounted,
    selectionGuidanceHandoffText,
    selectionResponsePending,
    setCanonicalTutorModalVisible,
    setGuestAuthFormVisible,
    setGuestIntroHelpVisible,
    setGuestIntroVisible,
    setHasNewMessage,
    shouldRepeatGuestIntroOnEntry,
  ]);

  const handleGuestIntroClose = useCallback((): void => {
    const nextRecord = persistGuestIntroRecord('dismissed');
    setCanonicalTutorModalVisible(false);
    setGuestIntroRecord(nextRecord);
    setGuestIntroVisible(false);
    setGuestIntroHelpVisible(false);
    setGuestAuthFormVisible(false);
    trackKangurClientEvent('kangur_ai_tutor_guest_intro_dismissed');
  }, [
    setCanonicalTutorModalVisible,
    setGuestAuthFormVisible,
    setGuestIntroHelpVisible,
    setGuestIntroRecord,
    setGuestIntroVisible,
  ]);

  const handleGuestIntroDismiss = useCallback((): void => {
    const nextRecord = persistGuestIntroRecord('dismissed');
    setGuestIntroRecord(nextRecord);
    trackKangurClientEvent('kangur_ai_tutor_guest_intro_dismissed');
  }, [
    setGuestIntroRecord,
  ]);

  const handleGuestIntroHelpClose = useCallback((): void => {
    setGuestIntroHelpVisible(false);
  }, [setGuestIntroHelpVisible]);

  const startGuidedGuestLogin = useCallback(
    (
      authMode: KangurAuthMode,
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
      setCanonicalTutorModalVisible(false);
      setGuestAuthFormVisible(false);
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
      setCanonicalTutorModalVisible,
      setGuestAuthFormVisible,
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

  const finalizeGuestIntroAccept = useCallback(
    (options?: { openChat?: boolean }): void => {
      const shouldOpenChat = options?.openChat ?? true;
      const nextRecord = persistGuestIntroRecord('accepted');
      setCanonicalTutorModalVisible(false);
      setGuestIntroRecord(nextRecord);
      setGuestIntroVisible(false);
      setGuestIntroHelpVisible(false);
      trackKangurClientEvent('kangur_ai_tutor_guest_intro_accepted', {
        hasInteractiveTutor: enabled,
      });
      if (!shouldOpenChat && isOpen) {
        handleCloseChat('toggle');
      }
      if (shouldOpenChat && !isOpen) {
        handleOpenChat('toggle');
      }
    },
    [
      enabled,
      handleCloseChat,
      handleOpenChat,
      isOpen,
      setCanonicalTutorModalVisible,
      setGuestIntroHelpVisible,
      setGuestIntroRecord,
      setGuestIntroVisible,
    ]
  );

  const handleGuestIntroAccept = useCallback((): void => {
    finalizeGuestIntroAccept({ openChat: true });
  }, [finalizeGuestIntroAccept]);

  const handleGuestIntroAcceptSilent = useCallback((): void => {
    finalizeGuestIntroAccept({ openChat: false });
  }, [finalizeGuestIntroAccept]);

  return {
    handleGuestIntroAccept,
    handleGuestIntroAcceptSilent,
    handleGuestIntroClose,
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

    if (
      resolveHomeOnboardingEntryAction({
        guidedTutorTarget,
        homeOnboardingMode,
        homeOnboardingRecord,
        homeOnboardingShownForCurrentEntry: homeOnboardingShownForCurrentEntryRef.current,
        homeOnboardingStepIndex,
        shouldRepeatHomeOnboardingOnEntry,
      }) !== 'start'
    ) {
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
