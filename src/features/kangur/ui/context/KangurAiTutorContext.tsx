'use client';

import {
  createContext,
  useContext,
  type JSX,
  type ReactNode,
} from 'react';

import type { KangurAiTutorConversationContext } from '@/features/kangur/shared/contracts/kangur-ai-tutor';
import { internalError } from '@/features/kangur/shared/errors/app-error';

import {
  KangurAiTutorSessionRegistryContext,
  KangurAiTutorSessionSyncInner,
  type KangurAiTutorContextValue,
  type KangurAiTutorSessionSyncProps,
  useKangurAiTutorRuntime,
  useKangurAiTutorSessionSync,
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
  const shouldRenderSessionSync = learnerId !== undefined || sessionContext !== undefined;
  const syncLearnerId = learnerId ?? null;
  const syncSessionContext = sessionContext ?? null;

  return (
    <KangurAiTutorSessionRegistryContext.Provider value={sessionRegistryValue}>
      <KangurAiTutorContext.Provider value={value}>
        {shouldRenderSessionSync ? (
          <KangurAiTutorSessionSyncInner
            learnerId={syncLearnerId}
            sessionContext={syncSessionContext}
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
  useKangurAiTutorSessionSync({
    learnerId,
    sessionContext: sessionContext ?? null,
  });

  return null;
}

export { useKangurAiTutorSessionSync };

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
