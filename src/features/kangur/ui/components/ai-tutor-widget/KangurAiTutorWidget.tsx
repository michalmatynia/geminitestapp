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

type KangurAiTutorWidgetAuthState = {
  isAuthenticated: boolean | undefined;
  isLoadingAuth: boolean | undefined;
  user: {
    ownerEmailVerified?: boolean;
  } | null;
} | null;

const resolveKangurAiTutorWidgetAuthState = ({
  authSessionState,
  authStatusState,
}: {
  authSessionState: ReturnType<typeof useOptionalKangurAuthSessionState>;
  authStatusState: ReturnType<typeof useOptionalKangurAuthStatusState>;
}): KangurAiTutorWidgetAuthState => {
  if (!authSessionState && !authStatusState) {
    return null;
  }

  return {
    isAuthenticated: authSessionState?.isAuthenticated,
    isLoadingAuth: authStatusState?.isLoadingAuth,
    user: authSessionState?.user ?? null,
  };
};

const resolveKangurAiTutorWidgetAppModes = (
  tutorRuntime: ReturnType<typeof useKangurAiTutorRuntime>['value']
): {
  guestIntroMode: 'every_visit' | 'first_visit';
  homeOnboardingMode: 'every_visit' | 'first_visit';
} => {
  const tutorAppSettings = tutorRuntime.appSettings as
    | Partial<typeof tutorRuntime.appSettings>
    | undefined;

  return {
    guestIntroMode: tutorAppSettings?.guestIntroMode ?? 'first_visit',
    homeOnboardingMode: tutorAppSettings?.homeOnboardingMode ?? 'first_visit',
  };
};

function KangurAiTutorWidgetPortal({
  children,
  tutorRuntime,
  widgetState,
}: {
  children: React.ReactNode;
  tutorRuntime: ReturnType<typeof useKangurAiTutorRuntime>['value'];
  widgetState: ReturnType<typeof useKangurAiTutorWidgetState>;
}): React.JSX.Element {
  return (
    <KangurAiTutorRuntimeScope value={tutorRuntime}>
      <KangurAiTutorWidgetStateProvider value={widgetState}>
        {children}
      </KangurAiTutorWidgetStateProvider>
    </KangurAiTutorRuntimeScope>
  );
}

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
  const { guestIntroMode, homeOnboardingMode } =
    resolveKangurAiTutorWidgetAppModes(tutorRuntime);
  const authState = useMemo(
    () =>
      resolveKangurAiTutorWidgetAuthState({
        authSessionState,
        authStatusState,
      }),
    [authSessionState, authStatusState]
  );

  useKangurAiTutorDeferredActivationBridge({ runtimeValue: tutorRuntime, sessionRegistryValue });

  const environment = useKangurAiTutorWidgetEnvironment({
    authState,
    guestIntroMode,
    highlightedText: tutorRuntime.highlightedText,
    homeOnboardingMode,
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
    prefersReducedMotion,
    tutorContent,
    tutorRuntime,
    widgetState,
  });
  if (!shouldRender) {
    return null;
  }

  return createPortal(
    <KangurAiTutorWidgetPortal tutorRuntime={tutorRuntime} widgetState={widgetState}>
      <KangurAiTutorPortalProvider value={portalContentValue}>
        <KangurAiTutorPortalContent />
      </KangurAiTutorPortalProvider>
    </KangurAiTutorWidgetPortal>,
    document.body
  );
}
