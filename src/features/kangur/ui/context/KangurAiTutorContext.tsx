'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type JSX,
  type ReactNode,
  type SetStateAction,
} from 'react';

import { DEFAULT_KANGUR_AI_TUTOR_APP_SETTINGS } from '@/features/kangur/ai-tutor/settings';
import { internalError } from '@/features/kangur/shared/errors/app-error';

import {
  KangurAiTutorSessionRegistryContext,
  KangurAiTutorSessionSyncInner,
  useKangurAiTutorSessionSync,
} from './KangurAiTutorRuntime.session';
import { useKangurAiTutorRuntime } from './KangurAiTutorRuntime.hook';
import type {
  KangurAiTutorContextValue,
  KangurAiTutorSessionSyncInput,
  KangurAiTutorSessionRegistryContextValue,
  KangurAiTutorSessionSyncProps,
} from './KangurAiTutorRuntime.types';
import {
  areSessionRegistrationsEqual,
  type KangurAiTutorSessionRegistration,
  type KangurAiTutorSessionRegistrationSetter,
} from './kangur-ai-tutor-runtime.helpers';

// ---------------------------------------------------------------------------
// Contexts
// ---------------------------------------------------------------------------

const KangurAiTutorContext = createContext<KangurAiTutorContextValue | null>(null);
type KangurAiTutorControllerValue = Pick<KangurAiTutorContextValue, 'enabled' | 'openChat'>;
const KangurAiTutorControllerContext =
  createContext<KangurAiTutorControllerValue | null>(null);

/**
 * Activation context — allows the dynamically-loaded AI tutor widget to push
 * the real runtime value into the provider tree without the heavy hook being
 * part of the shell bundle.
 */
type KangurAiTutorActivationContextValue = {
  activateRuntimeValue: Dispatch<SetStateAction<KangurAiTutorContextValue | null>>;
  pendingSessionRegistration: KangurAiTutorSessionRegistration | null;
};

export const KangurAiTutorActivationContext =
  createContext<KangurAiTutorActivationContextValue | null>(null);

export function useKangurAiTutorDeferredActivationBridge(input: {
  runtimeValue: KangurAiTutorContextValue;
  sessionRegistryValue: KangurAiTutorSessionRegistryContextValue;
}): void {
  const activation = useContext(KangurAiTutorActivationContext);

  useEffect(() => {
    if (!activation) {
      return undefined;
    }

    activation.activateRuntimeValue(
      createKangurAiTutorDeferredShellValue(input.runtimeValue)
    );
    return () => {
      activation.activateRuntimeValue(null);
    };
  }, [activation, input.runtimeValue]);

  useEffect(() => {
    if (!activation) {
      return;
    }

    input.sessionRegistryValue.setRegistration(activation.pendingSessionRegistration);
  }, [activation, input.sessionRegistryValue]);
}

// ---------------------------------------------------------------------------
// Dormant context value — returned until the widget chunk activates
// ---------------------------------------------------------------------------

const NOOP = (): void => {};
const NOOP_ASYNC = async (): Promise<void> => {};
const DORMANT_CONTROLLER_VALUE: KangurAiTutorControllerValue = Object.freeze({
  enabled: false,
  openChat: NOOP,
});

const DORMANT_VALUE: KangurAiTutorContextValue = Object.freeze({
  enabled: false,
  appSettings: DEFAULT_KANGUR_AI_TUTOR_APP_SETTINGS,
  tutorSettings: null,
  tutorPersona: null,
  tutorName: '',
  tutorMoodId: 'neutral' as KangurAiTutorContextValue['tutorMoodId'],
  tutorBehaviorMoodId: 'neutral' as KangurAiTutorContextValue['tutorBehaviorMoodId'],
  tutorBehaviorMoodLabel: '',
  tutorBehaviorMoodDescription: '',
  tutorAvatarSvg: null,
  tutorAvatarImageUrl: null,
  sessionContext: null,
  learnerMemory: null,
  isOpen: false,
  messages: [],
  isLoading: false,
  isUsageLoading: false,
  highlightedText: null,
  usageSummary: null,
  openChat: NOOP,
  closeChat: NOOP,
  sendMessage: NOOP_ASYNC,
  setHighlightedText: NOOP,
});

const createKangurAiTutorDeferredShellValue = (
  runtimeValue: KangurAiTutorContextValue
): KangurAiTutorContextValue => ({
  ...DORMANT_VALUE,
  enabled: runtimeValue.enabled,
  appSettings: runtimeValue.appSettings,
  tutorSettings: runtimeValue.tutorSettings,
  tutorPersona: runtimeValue.tutorPersona,
  tutorName: runtimeValue.tutorName,
  tutorMoodId: runtimeValue.tutorMoodId,
  tutorBehaviorMoodId: runtimeValue.tutorBehaviorMoodId,
  tutorBehaviorMoodLabel: runtimeValue.tutorBehaviorMoodLabel,
  tutorBehaviorMoodDescription: runtimeValue.tutorBehaviorMoodDescription,
  tutorAvatarSvg: runtimeValue.tutorAvatarSvg,
  tutorAvatarImageUrl: runtimeValue.tutorAvatarImageUrl,
  isOpen: runtimeValue.isOpen,
  isLoading: runtimeValue.isLoading,
  highlightedText: runtimeValue.highlightedText,
  openChat: runtimeValue.openChat,
  closeChat: runtimeValue.closeChat,
  sendMessage: runtimeValue.sendMessage,
  setHighlightedText: runtimeValue.setHighlightedText,
  recordFollowUpCompletion: runtimeValue.recordFollowUpCompletion,
  requestSelectionExplain: runtimeValue.requestSelectionExplain,
  selectionExplainRequest: runtimeValue.selectionExplainRequest,
});

const createKangurAiTutorControllerValue = (
  runtimeValue: KangurAiTutorContextValue
): KangurAiTutorControllerValue => ({
  enabled: runtimeValue.enabled,
  openChat: runtimeValue.openChat,
});

// ---------------------------------------------------------------------------
// Deferred provider — lightweight shell, heavy runtime activates later
// ---------------------------------------------------------------------------

export function KangurAiTutorDeferredProvider({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const [activeRuntimeValue, setActiveRuntimeValue] =
    useState<KangurAiTutorContextValue | null>(null);
  const [pendingSessionRegistration, setPendingSessionRegistration] =
    useState<KangurAiTutorSessionRegistration | null>(null);

  const setRegistration = useCallback(
    (registration: KangurAiTutorSessionRegistrationSetter): void => {
      setPendingSessionRegistration((current) => {
        const next =
          typeof registration === 'function' ? registration(current) : registration;
        return areSessionRegistrationsEqual(current, next) ? current : next;
      });
    },
    []
  );

  const sessionRegistryValue = useMemo<KangurAiTutorSessionRegistryContextValue>(
    () => ({ setRegistration }),
    [setRegistration]
  );

  const contextValue = activeRuntimeValue ?? DORMANT_VALUE;
  const controllerValue = useMemo<KangurAiTutorControllerValue>(
    () =>
      activeRuntimeValue
        ? createKangurAiTutorControllerValue(activeRuntimeValue)
        : DORMANT_CONTROLLER_VALUE,
    [activeRuntimeValue]
  );
  const activationValue = useMemo<KangurAiTutorActivationContextValue>(
    () => ({
      activateRuntimeValue: setActiveRuntimeValue,
      pendingSessionRegistration,
    }),
    [pendingSessionRegistration]
  );

  return (
    <KangurAiTutorActivationContext.Provider value={activationValue}>
      <KangurAiTutorSessionRegistryContext.Provider value={sessionRegistryValue}>
        <KangurAiTutorControllerContext.Provider value={controllerValue}>
          <KangurAiTutorContext.Provider value={contextValue}>
            {children}
          </KangurAiTutorContext.Provider>
        </KangurAiTutorControllerContext.Provider>
      </KangurAiTutorSessionRegistryContext.Provider>
    </KangurAiTutorActivationContext.Provider>
  );
}

type KangurAiTutorProviderProps = {
  children: ReactNode;
  learnerId?: KangurAiTutorSessionSyncProps['learnerId'];
  sessionContext?: KangurAiTutorSessionSyncProps['sessionContext'];
};

export function KangurAiTutorProvider({
  children,
  learnerId,
  sessionContext,
}: KangurAiTutorProviderProps): JSX.Element {
  const { value, sessionRegistryValue } = useKangurAiTutorRuntime();
  const controllerValue = useMemo<KangurAiTutorControllerValue>(
    () => createKangurAiTutorControllerValue(value),
    [value.enabled, value.openChat]
  );
  const shouldSyncSession = learnerId !== undefined || sessionContext !== undefined;
  const sessionSync = useMemo<KangurAiTutorSessionSyncInput>(
    () => ({
      learnerId: learnerId ?? null,
      sessionContext: sessionContext ?? null,
    }),
    [learnerId, sessionContext]
  );

  return (
    <KangurAiTutorActivationContext.Provider value={null}>
      <KangurAiTutorSessionRegistryContext.Provider value={sessionRegistryValue}>
        <KangurAiTutorControllerContext.Provider value={controllerValue}>
          <KangurAiTutorContext.Provider value={value}>
            {shouldSyncSession ? <KangurAiTutorSessionSyncInner sync={sessionSync} /> : null}
            {children}
          </KangurAiTutorContext.Provider>
        </KangurAiTutorControllerContext.Provider>
      </KangurAiTutorSessionRegistryContext.Provider>
    </KangurAiTutorActivationContext.Provider>
  );
}

export function KangurAiTutorRuntimeScope({
  children,
  value,
}: {
  children: ReactNode;
  value: KangurAiTutorContextValue;
}): JSX.Element {
  const controllerValue = useMemo<KangurAiTutorControllerValue>(
    () => createKangurAiTutorControllerValue(value),
    [value.enabled, value.openChat]
  );

  return (
    <KangurAiTutorControllerContext.Provider value={controllerValue}>
      <KangurAiTutorContext.Provider value={value}>{children}</KangurAiTutorContext.Provider>
    </KangurAiTutorControllerContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Session sync (re-export unchanged)
// ---------------------------------------------------------------------------

export function KangurAiTutorSessionSync({
  learnerId,
  sessionContext,
}: KangurAiTutorSessionSyncProps): JSX.Element | null {
  useKangurAiTutorSessionSync({
    learnerId,
    sessionContext: sessionContext ?? null,
  });

  return null;
}

export { useKangurAiTutorSessionSync };

// ---------------------------------------------------------------------------
// Consumer hooks
// ---------------------------------------------------------------------------

export function useKangurAiTutor(): KangurAiTutorContextValue {
  const ctx = useContext(KangurAiTutorContext);
  if (!ctx) {
    throw internalError('useKangurAiTutor must be used within a KangurAiTutorProvider');
  }

  return ctx;
}

export function useOptionalKangurAiTutor(): KangurAiTutorContextValue | null {
  return useContext(KangurAiTutorContext);
}

export function useOptionalKangurAiTutorController(): KangurAiTutorControllerValue | null {
  return useContext(KangurAiTutorControllerContext);
}
