'use client';

import {
  createContext,
  useContext,
  type JSX,
  type ReactNode,
} from 'react';

import type { KangurAiTutorConversationContext } from '@/shared/contracts/kangur-ai-tutor';
import { internalError } from '@/shared/errors/app-error';

import {
  KangurAiTutorSessionRegistryContext,
  KangurAiTutorSessionSyncInner,
  type KangurAiTutorContextValue,
  type KangurAiTutorSessionSyncProps,
  useKangurAiTutorRuntime,
} from './KangurAiTutorRuntime.shared';

type Props = {
  learnerId?: string | null;
  sessionContext?: KangurAiTutorConversationContext | null;
  children: ReactNode;
};

const KangurAiTutorContext = createContext<KangurAiTutorContextValue | null>(null);

export function KangurAiTutorProvider({
  learnerId = undefined,
  sessionContext = undefined,
  children,
}: Props): JSX.Element {
  const { value, sessionRegistryValue } = useKangurAiTutorRuntime();

  return (
    <KangurAiTutorSessionRegistryContext.Provider value={sessionRegistryValue}>
      <KangurAiTutorContext.Provider value={value}>
        {learnerId !== undefined || sessionContext !== undefined ? (
          <KangurAiTutorSessionSyncInner
            learnerId={learnerId ?? null}
            sessionContext={sessionContext ?? null}
          />
        ) : null}
        {children}
      </KangurAiTutorContext.Provider>
    </KangurAiTutorSessionRegistryContext.Provider>
  );
}

export function KangurAiTutorSessionSync({
  learnerId,
  sessionContext,
}: KangurAiTutorSessionSyncProps): JSX.Element | null {
  return (
    <KangurAiTutorSessionSyncInner
      learnerId={learnerId}
      sessionContext={sessionContext ?? null}
    />
  );
}

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
