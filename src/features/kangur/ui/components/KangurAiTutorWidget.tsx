import { useReducedMotion } from 'framer-motion';
import { createPortal } from 'react-dom';

import { useKangurAiTutorContent } from '@/features/kangur/ui/context/KangurAiTutorContentContext';
import { useKangurAiTutor } from '@/features/kangur/ui/context/KangurAiTutorContext';
import { useOptionalKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { useKangurLoginModal } from '@/features/kangur/ui/context/KangurLoginModalContext';

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
  const prefersReducedMotion = useReducedMotion();
  const tutorContent = useKangurAiTutorContent();
  const tutorRuntime = useKangurAiTutor();
  const authState = useOptionalKangurAuth();
  const loginModal = useKangurLoginModal();
  const widgetState = useKangurAiTutorWidgetState();

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
