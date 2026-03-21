import { useReducedMotion } from 'framer-motion';
import { useContext, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

import {
  useActivateKangurAiTutorContent,
  useKangurAiTutorContent,
} from '@/features/kangur/ui/context/KangurAiTutorContentContext';
import { KangurAiTutorActivationContext } from '@/features/kangur/ui/context/KangurAiTutorContext';
import { useOptionalKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { useKangurLoginModal } from '@/features/kangur/ui/context/KangurLoginModalContext';

import { useKangurAiTutorRuntime } from '../context/KangurAiTutorRuntime.hook';

import {
  KangurAiTutorPortalContent,
  KangurAiTutorPortalProvider,
} from './KangurAiTutorPortalContent';
import { useKangurAiTutorWidgetCoordinator } from './KangurAiTutorWidget.coordinator';
import { useKangurAiTutorWidgetEnvironment } from './KangurAiTutorWidget.environment';
import {
  KangurAiTutorWidgetStateProvider,
  useKangurAiTutorWidgetState,
} from './KangurAiTutorWidget.state';

export function KangurAiTutorWidget(): React.JSX.Element | null {
  useActivateKangurAiTutorContent();
  const prefersReducedMotion = useReducedMotion();
  const tutorContent = useKangurAiTutorContent();
  const { value: tutorRuntime } = useKangurAiTutorRuntime();
  const activateRuntime = useContext(KangurAiTutorActivationContext);
  const authState = useOptionalKangurAuth();
  const loginModal = useKangurLoginModal();
  const widgetState = useKangurAiTutorWidgetState();

  // Push the real runtime value into the deferred provider so sibling
  // consumers (Navigation, ParentDashboard, etc.) see live state.
  useLayoutEffect(() => {
    activateRuntime?.(tutorRuntime);
    return () => {
      activateRuntime?.(null);
    };
  }, [activateRuntime, tutorRuntime]);

  const environment = useKangurAiTutorWidgetEnvironment({
    authState,
    guestIntroMode: tutorRuntime.appSettings?.guestIntroMode ?? 'first_visit',
    highlightedText: tutorRuntime.highlightedText,
    homeOnboardingMode: tutorRuntime.appSettings?.homeOnboardingMode ?? 'first_visit',
    mounted: widgetState.mounted,
    sessionContext: tutorRuntime.sessionContext,
    tutorContent,
    tutorSettings: tutorRuntime.tutorSettings,
    usageSummary: tutorRuntime.usageSummary,
    widgetState,
  });

  const { portalContentValue, shouldRender } = useKangurAiTutorWidgetCoordinator({
    authState,
    environment,
    loginModal: {
      authMode: loginModal.authMode,
      isOpen: loginModal.isOpen,
      openLoginModal: loginModal.openLoginModal,
    },
    prefersReducedMotion: prefersReducedMotion ?? undefined,
    tutorContent,
    tutorRuntime,
    widgetState,
  });
  if (!shouldRender) {
    return null;
  }

  return createPortal(
    <KangurAiTutorWidgetStateProvider value={widgetState}>
      <KangurAiTutorPortalProvider value={portalContentValue}>
        <KangurAiTutorPortalContent />
      </KangurAiTutorPortalProvider>
    </KangurAiTutorWidgetStateProvider>,
    document.body
  );
}
