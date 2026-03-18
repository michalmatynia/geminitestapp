'use client';

import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  type JSX,
} from 'react';

import { buildKangurAiTutorContextRegistryRefs } from '@/features/kangur/context-registry/refs';
import type { KangurAiTutorConversationContext } from '@/features/kangur/shared/contracts/kangur-ai-tutor';
import { DEFAULT_KANGUR_AI_TUTOR_CONTENT } from '@/features/kangur/shared/contracts/kangur-ai-tutor-content';
import { useRegisterContextRegistryPageSource } from '@/shared/lib/ai-context-registry/page-context';

import { useKangurAiTutorContent } from './KangurAiTutorContentContext';
import {
  buildSessionKey,
  omitUndefinedFields,
  type KangurAiTutorSessionRegistration,
} from './kangur-ai-tutor-runtime.helpers';
import type {
  KangurAiTutorSessionRegistryContextValue,
  KangurAiTutorSessionSyncProps,
} from './KangurAiTutorRuntime.types';

// ---------------------------------------------------------------------------
// Session registry context
// ---------------------------------------------------------------------------

export const KangurAiTutorSessionRegistryContext =
  createContext<KangurAiTutorSessionRegistryContextValue | null>(null);

// ---------------------------------------------------------------------------
// Session sync hook + component
// ---------------------------------------------------------------------------

export const useKangurAiTutorSessionSync = ({
  learnerId,
  sessionContext,
}: KangurAiTutorSessionSyncProps): void => {
  const tutorContent = useKangurAiTutorContent() ?? DEFAULT_KANGUR_AI_TUTOR_CONTENT;
  const registry = useContext(KangurAiTutorSessionRegistryContext);
  const tokenRef = useRef(Symbol('kangur-ai-tutor-session'));
  const setRegistration = registry?.setRegistration;
  const normalizedSessionContext = useMemo<KangurAiTutorConversationContext | null>(() => {
    if (!sessionContext) {
      return null;
    }

    return omitUndefinedFields({
      surface: sessionContext.surface,
      contentId: sessionContext.contentId,
      title: sessionContext.title,
      description: sessionContext.description,
      masterySummary: sessionContext.masterySummary,
      assignmentSummary: sessionContext.assignmentSummary,
      questionId: sessionContext.questionId,
      selectedChoiceLabel: sessionContext.selectedChoiceLabel,
      selectedChoiceText: sessionContext.selectedChoiceText,
      selectedText: sessionContext.selectedText,
      currentQuestion: sessionContext.currentQuestion,
      questionProgressLabel: sessionContext.questionProgressLabel,
      answerRevealed: sessionContext.answerRevealed,
      promptMode: sessionContext.promptMode,
      focusKind: sessionContext.focusKind,
      focusId: sessionContext.focusId,
      focusLabel: sessionContext.focusLabel,
      assignmentId: sessionContext.assignmentId,
      knowledgeReference: sessionContext.knowledgeReference,
      interactionIntent: sessionContext.interactionIntent,
    });
  }, [
    sessionContext?.answerRevealed,
    sessionContext?.assignmentId,
    sessionContext?.assignmentSummary,
    sessionContext?.contentId,
    sessionContext?.currentQuestion,
    sessionContext?.description,
    sessionContext?.focusId,
    sessionContext?.focusKind,
    sessionContext?.focusLabel,
    sessionContext?.interactionIntent,
    sessionContext?.knowledgeReference?.sourceCollection,
    sessionContext?.knowledgeReference?.sourcePath,
    sessionContext?.knowledgeReference?.sourceRecordId,
    sessionContext?.masterySummary,
    sessionContext?.promptMode,
    sessionContext?.questionProgressLabel,
    sessionContext?.questionId,
    sessionContext?.selectedChoiceLabel,
    sessionContext?.selectedChoiceText,
    sessionContext?.selectedText,
    sessionContext?.surface,
    sessionContext?.title,
  ]);
  const sessionKey = useMemo(
    () => buildSessionKey(learnerId, normalizedSessionContext),
    [learnerId, normalizedSessionContext]
  );
  const registrySource = useMemo(
    () =>
      registry && learnerId && normalizedSessionContext
        ? {
          label: tutorContent.common.sessionRegistryLabel,
          refs: buildKangurAiTutorContextRegistryRefs({
            learnerId,
            context: normalizedSessionContext,
          }),
        }
        : null,
    [learnerId, normalizedSessionContext, registry, tutorContent.common.sessionRegistryLabel]
  );

  useRegisterContextRegistryPageSource('kangur-ai-tutor-session', registrySource);

  useLayoutEffect(() => {
    if (!setRegistration) {
      return undefined;
    }

    const registration: KangurAiTutorSessionRegistration | null =
      sessionKey === null
        ? null
        : {
          token: tokenRef.current,
          learnerId,
          sessionContext: normalizedSessionContext,
          sessionKey,
        };

    setRegistration(registration);

    return () => {
      setRegistration((current) => (current?.token === tokenRef.current ? null : current));
    };
  }, [learnerId, normalizedSessionContext, sessionKey, setRegistration]);
};

export function KangurAiTutorSessionSyncInner({
  learnerId,
  sessionContext,
}: KangurAiTutorSessionSyncProps): JSX.Element | null {
  useKangurAiTutorSessionSync({
    learnerId,
    sessionContext,
  });

  return null;
}
