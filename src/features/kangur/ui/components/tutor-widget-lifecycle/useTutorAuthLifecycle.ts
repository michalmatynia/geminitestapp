'use client';

import { useEffect } from 'react';
import type { KangurAiTutorWidgetState } from '../KangurAiTutorWidget.state';
import { subscribeToTutorVisibilityChanges } from '../KangurAiTutorWidget.storage';

export function useTutorAuthLifecycle({
  authIsAuthenticated,
  widgetState,
}: {
  authIsAuthenticated: boolean | undefined;
  widgetState: KangurAiTutorWidgetState;
}) {
  const {
    setGuidedTutorTarget,
    setGuestIntroVisible,
    setGuestIntroHelpVisible,
    setHomeOnboardingStepIndex,
    setIsTutorHidden,
    setMounted,
  } = widgetState;

  useEffect(() => { setMounted(true); }, [setMounted]);

  useEffect(() => {
    if (authIsAuthenticated) {
      setGuidedTutorTarget(null);
      setGuestIntroVisible(false);
      setGuestIntroHelpVisible(false);
      return;
    }
    setHomeOnboardingStepIndex(null);
  }, [authIsAuthenticated, setGuestIntroHelpVisible, setGuestIntroVisible, setGuidedTutorTarget, setHomeOnboardingStepIndex]);

  useEffect(() => subscribeToTutorVisibilityChanges(setIsTutorHidden), [setIsTutorHidden]);
}
