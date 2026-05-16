'use client';

import { useEffect, useMemo, useCallback } from 'react';
import { useAgentCreatorSettings } from '@/features/ai/agentcreator';
import { useOptionalContextRegistryPageEnvelope } from '@/features/ai/ai-context-registry/context/page-context';
import type { CreateChatbotSettingsDto as ChatbotSettingsPayload } from '@/shared/contracts/chatbot';
import { DEFAULT_CHATBOT_SETTINGS } from '@/shared/lib/ai/chatbot/constants';
import { useBrainAssignment } from '@/shared/lib/ai-brain/hooks/useBrainAssignment';
import { useChatbotState } from './useChatbotState';
import { useChatbotSessions } from './useChatbotSessions';
import { useChatbotSettings } from './useChatbotSettings';
import { useChatbotMessaging } from './useChatbotMessaging';
import type { UseChatbotLogicReturn } from './useChatbotLogic.types';

export type { UseChatbotLogicReturn };

export const useChatbotLogic = (): UseChatbotLogicReturn => {
  const contextRegistry = useOptionalContextRegistryPageEnvelope();
  const state = useChatbotState();
  const agent = useAgentCreatorSettings();
  const brain = useBrainAssignment({ feature: 'chatbot' });

  const currentSettings = useMemo<ChatbotSettingsPayload>(() => ({
    enableMemory: DEFAULT_CHATBOT_SETTINGS.enableMemory, enableContext: DEFAULT_CHATBOT_SETTINGS.enableContext,
    personaId: state.personaId, webSearchEnabled: state.webSearchEnabled, useGlobalContext: state.useGlobalContext,
    useLocalContext: state.useLocalContext, localContextMode: state.localContextMode, searchProvider: state.searchProvider,
    playwrightPersonaId: state.playwrightPersonaId, agentModeEnabled: agent.agentModeEnabled, agentBrowser: agent.agentBrowser,
    runHeadless: agent.agentRunHeadless, ignoreRobotsTxt: agent.agentIgnoreRobotsTxt, requireHumanApproval: agent.agentRequireHumanApproval,
    maxSteps: agent.agentMaxSteps, maxStepAttempts: agent.agentMaxStepAttempts, maxReplanCalls: agent.agentMaxReplanCalls,
    replanEverySteps: agent.agentReplanEverySteps, maxSelfChecks: agent.agentMaxSelfChecks, loopGuardThreshold: agent.agentLoopGuardThreshold,
    loopBackoffBaseMs: agent.agentLoopBackoffBaseMs, loopBackoffMaxMs: agent.agentLoopBackoffMaxMs,
  }), [state, agent]);

  const sessions = useChatbotSessions({ ...state, currentSettings, setCurrentSessionId: state.setCurrentSessionId });
  const settings = useChatbotSettings({ ...state, ...agent, currentSettings });
  const messaging = useChatbotMessaging({ ...state, sessionId: sessions.sessionId, contextRegistry });

  useEffect(() => {
    const next = brain.effectiveModelId.trim();
    if (next !== '' && next !== state.model) state.setModelState(next);
  }, [brain.effectiveModelId, state.model, state.setModelState]);

  useEffect(() => { void sessions.fetchSessions(); }, [sessions.fetchSessions]);
  useEffect(() => {
    if (sessions.sessionId !== null) void sessions.loadSessionMessages(sessions.sessionId);
    else state.setMessages([]);
  }, [sessions.sessionId, sessions.loadSessionMessages, state.setMessages]);

  useEffect(() => {
    if (state.settingsLoadedRef.current) return;
    state.settingsLoadedRef.current = true;
    void settings.loadChatbotSettings();
  }, [settings.loadChatbotSettings, state.settingsLoadedRef]);

  useEffect(() => {
    if (!state.settingsSnapshot) { state.setSettingsSnapshot(currentSettings); return; }
    state.setSettingsDirty(JSON.stringify(state.settingsSnapshot) !== JSON.stringify(currentSettings));
  }, [currentSettings, state.settingsSnapshot, state.setSettingsSnapshot, state.setSettingsDirty]);

  return {
    ...state, ...agent, ...sessions, ...settings, ...messaging,
    setModel: useCallback(() => {}, []), selectSession: state.setCurrentSessionId,
  } as unknown as UseChatbotLogicReturn;
};
