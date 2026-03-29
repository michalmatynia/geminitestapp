'use client';

import { useMemo } from 'react';

import {
  KANGUR_AI_TUTOR_APP_SETTINGS_KEY,
  KANGUR_AI_TUTOR_SETTINGS_KEY,
  getKangurAiTutorSettingsForLearner,
  parseKangurAiTutorSettings,
  resolveKangurAiTutorAppSettings,
  resolveKangurAiTutorAvailability,
  type KangurAiTutorAppSettings,
  type KangurAiTutorLearnerSettings,
} from '@/features/kangur/ai-tutor/settings';
import {
  DEFAULT_AGENT_PERSONA_MOOD_ID,
  type AgentPersona,
  type AgentPersonaMoodId,
} from '@/shared/contracts/agents';
import type { KangurAiTutorConversationContext } from '@/features/kangur/shared/contracts/kangur-ai-tutor';
import { useAgentPersonaVisuals } from '@/shared/hooks/useAgentPersonaVisuals';
import { resolveAgentPersonaMood } from '@/shared/lib/agent-personas';
import { useSettingsStore } from '@/features/kangur/shared/providers/SettingsStoreProvider';

import { buildLearnerMemoryKey } from './kangur-ai-tutor-runtime.helpers';

// ---------------------------------------------------------------------------
// useKangurTutorSettingsState
// ---------------------------------------------------------------------------

type TutorSettingsStateInput = {
  settingsStore: ReturnType<typeof useSettingsStore>;
  activeLearnerId: string | null;
  activeSessionContext: KangurAiTutorConversationContext | null;
  authUserOwnerEmailVerified: boolean | undefined;
};

type TutorSettingsStateResult = {
  appSettings: KangurAiTutorAppSettings;
  tutorSettings: KangurAiTutorLearnerSettings | null;
  enabled: boolean;
  allowCrossPagePersistence: boolean;
  allowLearnerMemory: boolean;
  allowSelectedTextSupport: boolean;
  showSources: boolean;
  activeLearnerMemoryKey: string | null;
};

export function useKangurTutorSettingsState({
  settingsStore,
  activeLearnerId,
  activeSessionContext,
  authUserOwnerEmailVerified,
}: TutorSettingsStateInput): TutorSettingsStateResult {
  const rawSettings = settingsStore.get(KANGUR_AI_TUTOR_SETTINGS_KEY);
  const rawAppSettings = settingsStore.get(KANGUR_AI_TUTOR_APP_SETTINGS_KEY);
  const parsedSettings = useMemo(() => parseKangurAiTutorSettings(rawSettings), [rawSettings]);
  const appSettings = useMemo(
    () => resolveKangurAiTutorAppSettings(rawAppSettings, parsedSettings),
    [parsedSettings, rawAppSettings]
  );
  const tutorSettings = useMemo(
    () =>
      activeLearnerId
        ? getKangurAiTutorSettingsForLearner(parsedSettings, activeLearnerId, appSettings)
        : null,
    [activeLearnerId, appSettings, parsedSettings]
  );
  const availability = useMemo(
    () =>
      resolveKangurAiTutorAvailability(tutorSettings, activeSessionContext, {
        ownerEmailVerified: authUserOwnerEmailVerified,
      }),
    [activeSessionContext, authUserOwnerEmailVerified, tutorSettings]
  );
  const enabled = availability.allowed;
  const allowCrossPagePersistence = tutorSettings?.allowCrossPagePersistence ?? true;
  const allowLearnerMemory =
    allowCrossPagePersistence && (tutorSettings?.rememberTutorContext ?? true);
  const allowSelectedTextSupport = tutorSettings?.allowSelectedTextSupport ?? true;
  const showSources = tutorSettings?.showSources ?? true;
  const activeLearnerMemoryKey = useMemo(
    () => buildLearnerMemoryKey(activeLearnerId, activeSessionContext),
    [activeLearnerId, activeSessionContext]
  );

  return {
    appSettings,
    tutorSettings,
    enabled,
    allowCrossPagePersistence,
    allowLearnerMemory,
    allowSelectedTextSupport,
    showSources,
    activeLearnerMemoryKey,
  };
}

// ---------------------------------------------------------------------------
// useKangurTutorPersonaVisuals
// ---------------------------------------------------------------------------

type TutorPersonaVisualsInput = {
  tutorSettings: KangurAiTutorLearnerSettings | null;
  appSettings: KangurAiTutorAppSettings;
  defaultTutorName: string;
  isLoading: boolean;
  suggestedMoodId: AgentPersonaMoodId | null;
  lastMessageRole: 'user' | 'assistant' | null;
};

type TutorPersonaVisualsResult = {
  tutorPersona: AgentPersona | null;
  tutorName: string;
  tutorMoodId: AgentPersonaMoodId;
  tutorAvatarSvg: string | null;
  tutorAvatarImageUrl: string | null;
};

export function useKangurTutorPersonaVisuals({
  tutorSettings,
  appSettings,
  defaultTutorName,
  isLoading,
  suggestedMoodId,
  lastMessageRole,
}: TutorPersonaVisualsInput): TutorPersonaVisualsResult {
  const effectiveTutorPersonaId = tutorSettings?.agentPersonaId ?? appSettings.agentPersonaId;
  const { data: agentPersonas = [] } = useAgentPersonaVisuals(effectiveTutorPersonaId);
  const tutorPersona = useMemo<AgentPersona | null>(() => {
    const personaId = effectiveTutorPersonaId;
    if (!personaId) {
      return null;
    }

    return agentPersonas.find((persona) => persona.id === personaId) ?? null;
  }, [agentPersonas, effectiveTutorPersonaId]);
  const tutorName = tutorPersona?.name ?? defaultTutorName;
  const requestedTutorMoodId = useMemo<AgentPersonaMoodId>(() => {
    if (isLoading) {
      return 'thinking';
    }

    if (suggestedMoodId) {
      return suggestedMoodId;
    }

    if (lastMessageRole === 'assistant') {
      return 'encouraging';
    }

    return DEFAULT_AGENT_PERSONA_MOOD_ID;
  }, [isLoading, lastMessageRole, suggestedMoodId]);
  const resolvedTutorMood = useMemo(
    () => resolveAgentPersonaMood(tutorPersona, requestedTutorMoodId),
    [requestedTutorMoodId, tutorPersona]
  );
  const defaultTutorMood = useMemo(() => resolveAgentPersonaMood(tutorPersona), [tutorPersona]);
  const resolvedTutorMoodVisuals = useMemo(() => {
    const resolvedThumbnail =
      resolvedTutorMood.useEmbeddedThumbnail === true
        ? resolvedTutorMood.avatarThumbnailDataUrl?.trim() || null
        : null;
    if (resolvedThumbnail) {
      return { tutorAvatarImageUrl: resolvedThumbnail, tutorAvatarSvg: null };
    }

    const resolvedImage = resolvedTutorMood.avatarImageUrl?.trim() || null;
    const resolvedSvg = resolvedTutorMood.svgContent.trim() || null;

    if (resolvedImage) {
      return { tutorAvatarImageUrl: resolvedImage, tutorAvatarSvg: null };
    }

    if (resolvedSvg) {
      return { tutorAvatarImageUrl: null, tutorAvatarSvg: resolvedSvg };
    }

    const fallbackThumbnail =
      defaultTutorMood.useEmbeddedThumbnail === true
        ? defaultTutorMood.avatarThumbnailDataUrl?.trim() || null
        : null;
    if (fallbackThumbnail) {
      return { tutorAvatarImageUrl: fallbackThumbnail, tutorAvatarSvg: null };
    }

    const fallbackImage = defaultTutorMood.avatarImageUrl?.trim() || null;
    if (fallbackImage) {
      return { tutorAvatarImageUrl: fallbackImage, tutorAvatarSvg: null };
    }

    return {
      tutorAvatarImageUrl: null,
      tutorAvatarSvg: defaultTutorMood.svgContent.trim() || null,
    };
  }, [
    defaultTutorMood.avatarThumbnailDataUrl,
    defaultTutorMood.avatarImageUrl,
    defaultTutorMood.svgContent,
    defaultTutorMood.useEmbeddedThumbnail,
    resolvedTutorMood.avatarThumbnailDataUrl,
    resolvedTutorMood.avatarImageUrl,
    resolvedTutorMood.svgContent,
    resolvedTutorMood.useEmbeddedThumbnail,
  ]);

  return {
    tutorPersona,
    tutorName,
    tutorMoodId: resolvedTutorMood.id,
    tutorAvatarSvg: resolvedTutorMoodVisuals.tutorAvatarSvg,
    tutorAvatarImageUrl: resolvedTutorMoodVisuals.tutorAvatarImageUrl,
  };
}
