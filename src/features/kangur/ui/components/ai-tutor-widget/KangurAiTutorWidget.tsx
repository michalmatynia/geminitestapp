import { useReducedMotion } from 'framer-motion';
import { useMemo } from 'react';
import { createPortal } from 'react-dom';

import {
  useActivateKangurAiTutorContent,
  useKangurAiTutorContent,
} from '@/features/kangur/ui/context/KangurAiTutorContentContext';
import {
  KangurAiTutorRuntimeScope,
  useKangurAiTutorDeferredActivationBridge,
} from '@/features/kangur/ui/context/KangurAiTutorContext';
import {
  useOptionalKangurAuthSessionState,
  useOptionalKangurAuthStatusState,
} from '@/features/kangur/ui/context/KangurAuthContext';
import {
  useKangurLoginModalActions,
  useKangurLoginModalState,
} from '@/features/kangur/ui/context/KangurLoginModalContext';

import { useKangurAiTutorRuntime } from '../../context/KangurAiTutorRuntime.hook';

import {
  KangurAiTutorPortalContent,
  KangurAiTutorPortalProvider,
} from '../KangurAiTutorPortalContent';
import { useKangurAiTutorWidgetCoordinator } from './KangurAiTutorWidget.coordinator';
import { useKangurAiTutorWidgetEnvironment } from './KangurAiTutorWidget.environment';
import {
  KangurAiTutorWidgetStateProvider,
  useKangurAiTutorWidgetState,
} from './KangurAiTutorWidget.state';

export function KangurAiTutorWidget(): React.JSX.Element | null {
  const { value: tutorRuntime, sessionRegistryValue } = useKangurAiTutorRuntime();
  useActivateKangurAiTutorContent(tutorRuntime.isOpen);
  const prefersReducedMotion = useReducedMotion();
  const tutorContent = useKangurAiTutorContent();
  const authSessionState = useOptionalKangurAuthSessionState();
  const authStatusState = useOptionalKangurAuthStatusState();
  const loginModalState = useKangurLoginModalState();
  const { openLoginModal } = useKangurLoginModalActions();
  const widgetState = useKangurAiTutorWidgetState();
  const tutorAppSettings = tutorRuntime.appSettings ?? {};
  const authState = useMemo(() => {
    if (!authSessionState && !authStatusState) {
      return null;
    }

    return {
      isAuthenticated: authSessionState?.isAuthenticated,
      isLoadingAuth: authStatusState?.isLoadingAuth,
      user: authSessionState?.user ?? null,
    };
  }, [authSessionState, authStatusState]);

  useKangurAiTutorDeferredActivationBridge({
    runtimeValue: tutorRuntime,
    sessionRegistryValue,
  });

  const environment = useKangurAiTutorWidgetEnvironment({
    authState,
    guestIntroMode: tutorAppSettings.guestIntroMode ?? 'first_visit',
    highlightedText: tutorRuntime.highlightedText,
    homeOnboardingMode: tutorAppSettings.homeOnboardingMode ?? 'first_visit',
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
      authMode: loginModalState.authMode,
      isOpen: loginModalState.isOpen,
      openLoginModal,
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
    <KangurAiTutorRuntimeScope value={tutorRuntime}>
      <KangurAiTutorWidgetStateProvider value={widgetState}>
        <KangurAiTutorPortalProvider value={portalContentValue}>
          <KangurAiTutorPortalContent />
        </KangurAiTutorPortalProvider>
      </KangurAiTutorWidgetStateProvider>
    </KangurAiTutorRuntimeScope>,
    document.body
  );
}
