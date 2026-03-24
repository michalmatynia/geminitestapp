'use client';

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type Dispatch,
  type JSX,
  type ReactNode,
  type SetStateAction,
} from 'react';

import { DEFAULT_KANGUR_AI_TUTOR_APP_SETTINGS } from '@/features/kangur/settings-ai-tutor';
import { internalError } from '@/features/kangur/shared/errors/app-error';

import {
  KangurAiTutorSessionRegistryContext,
  KangurAiTutorSessionSyncInner,
  useKangurAiTutorSessionSync,
} from './KangurAiTutorRuntime.session';
import { useKangurAiTutorRuntime } from './KangurAiTutorRuntime.hook';
import type {
  KangurAiTutorContextValue,
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

  useLayoutEffect(() => {
    if (!activation) {
      return undefined;
    }

    activation.activateRuntimeValue(input.runtimeValue);
    return () => {
      activation.activateRuntimeValue(null);
    };
  }, [activation, input.runtimeValue]);

  useLayoutEffect(() => {
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
        <KangurAiTutorContext.Provider value={contextValue}>
          {children}
        </KangurAiTutorContext.Provider>
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

  return (
    <KangurAiTutorActivationContext.Provider value={null}>
      <KangurAiTutorSessionRegistryContext.Provider value={sessionRegistryValue}>
        <KangurAiTutorContext.Provider value={value}>
          {learnerId || sessionContext ? (
            <KangurAiTutorSessionSyncInner
              learnerId={learnerId ?? null}
              sessionContext={sessionContext ?? null}
            />
          ) : null}
          {children}
        </KangurAiTutorContext.Provider>
      </KangurAiTutorSessionRegistryContext.Provider>
    </KangurAiTutorActivationContext.Provider>
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
