'use client';

import { useState, useEffect, useRef } from 'react';

import { useAgentCreatorSettings } from '@/features/ai/agentcreator';
import type { ChatbotSettingsDto as ChatbotSettingsPayload } from '@/shared/contracts/chatbot';
import { CHATBOT_SETTINGS_KEY, DEFAULT_CHATBOT_SETTINGS } from '@/shared/lib/ai/chatbot/constants';
import { useBrainAssignment } from '@/shared/lib/ai-brain/hooks/useBrainAssignment';

import { useChatbotSettings } from './useChatbotQueries';
import { useChatbotSettingsMemo } from './useChatbotSettingsState.utils';
import { useChatbotSettingsHandlers } from './useChatbotSettingsState.handlers';

export interface UseChatbotSettingsStateReturn {
  model: string;
  setModel: React.Dispatch<React.SetStateAction<string>>;
  personaId: string | null;
  setPersonaId: (id: string | null) => void;
  webSearchEnabled: boolean;
  setWebSearchEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  useGlobalContext: boolean;
  setUseGlobalContext: React.Dispatch<React.SetStateAction<boolean>>;
  useLocalContext: boolean;
  setUseLocalContext: React.Dispatch<React.SetStateAction<boolean>>;
  searchProvider: string;
  setSearchProvider: React.Dispatch<React.SetStateAction<string>>;
  playwrightPersonaId: string | null;
  setPlaywrightPersonaId: (id: string | null) => void;
  globalContext: string;
  setGlobalContext: React.Dispatch<React.SetStateAction<string>>;
  localContext: string;
  setLocalContext: React.Dispatch<React.SetStateAction<string>>;
  localContextMode: 'override' | 'append';
  setLocalContextMode: React.Dispatch<React.SetStateAction<'override' | 'append'>>;
  settingsDirty: boolean;
  setSettingsDirty: React.Dispatch<React.SetStateAction<boolean>>;
  settingsSaving: boolean;
  setSettingsSaving: React.Dispatch<React.SetStateAction<boolean>>;
  loadChatbotSettings: () => Promise<void>;
  saveChatbotSettings: () => Promise<void>;

  // Agent Mode
  agentModeEnabled: boolean;
  setAgentModeEnabled: (enabled: boolean) => void;
  agentRunHeadless: boolean;
  setAgentRunHeadless: (headless: boolean) => void;
  agentBrowser: string;
  setAgentBrowser: (browser: string) => void;
  agentIgnoreRobotsTxt: boolean;
  setAgentIgnoreRobotsTxt: (ignore: boolean) => void;
  agentRequireHumanApproval: boolean;
  setAgentRequireHumanApproval: (require: boolean) => void;

  // Agent Settings
  agentMaxSteps: number;
  setAgentMaxSteps: (steps: number) => void;
  agentMaxStepAttempts: number;
  setAgentMaxStepAttempts: (attempts: number) => void;
  agentMaxReplanCalls: number;
  setAgentMaxReplanCalls: (calls: number) => void;
  agentReplanEverySteps: number;
  setAgentReplanEverySteps: (steps: number) => void;
  agentMaxSelfChecks: number;
  setAgentMaxSelfChecks: (checks: number) => void;
  agentLoopGuardThreshold: number;
  setAgentLoopGuardThreshold: (threshold: number) => void;
  agentLoopBackoffBaseMs: number;
  setAgentLoopBackoffBaseMs: (ms: number) => void;
  agentLoopBackoffMaxMs: number;
  setAgentLoopBackoffMaxMs: (ms: number) => void;
}

type NormalizedAgentSettings = Pick<
  UseChatbotSettingsStateReturn,
  | 'agentModeEnabled'
  | 'agentBrowser'
  | 'agentRunHeadless'
  | 'agentIgnoreRobotsTxt'
  | 'agentRequireHumanApproval'
  | 'agentMaxSteps'
  | 'agentMaxStepAttempts'
  | 'agentMaxReplanCalls'
  | 'agentReplanEverySteps'
  | 'agentMaxSelfChecks'
  | 'agentLoopGuardThreshold'
  | 'agentLoopBackoffBaseMs'
  | 'agentLoopBackoffMaxMs'
>;

const stringOrDefault = (value: string | undefined, fallback: string): string =>
  typeof value === 'string' && value.length > 0 ? value : fallback;

const numberOrDefault = (value: number | undefined, fallback: number): number =>
  typeof value === 'number' ? value : fallback;

const normalizeAgentSettings = (
  agent: ReturnType<typeof useAgentCreatorSettings>
): NormalizedAgentSettings => ({
  agentModeEnabled: Boolean(agent.agentModeEnabled),
  agentBrowser: stringOrDefault(agent.agentBrowser, DEFAULT_CHATBOT_SETTINGS.agentBrowser ?? 'chromium'),
  agentRunHeadless: Boolean(agent.agentRunHeadless),
  agentIgnoreRobotsTxt: Boolean(agent.agentIgnoreRobotsTxt),
  agentRequireHumanApproval: Boolean(agent.agentRequireHumanApproval),
  agentMaxSteps: numberOrDefault(agent.agentMaxSteps, 10),
  agentMaxStepAttempts: numberOrDefault(agent.agentMaxStepAttempts, 3),
  agentMaxReplanCalls: numberOrDefault(agent.agentMaxReplanCalls, 3),
  agentReplanEverySteps: numberOrDefault(agent.agentReplanEverySteps, 5),
  agentMaxSelfChecks: numberOrDefault(agent.agentMaxSelfChecks, 3),
  agentLoopGuardThreshold: numberOrDefault(agent.agentLoopGuardThreshold, 3),
  agentLoopBackoffBaseMs: numberOrDefault(agent.agentLoopBackoffBaseMs, 1000),
  agentLoopBackoffMaxMs: numberOrDefault(agent.agentLoopBackoffMaxMs, 5000),
});

export function useChatbotSettingsState(): UseChatbotSettingsStateReturn {
  // Base settings
  const [model, setModel] = useState<string>('');
  const [personaId, setPersonaId] = useState<string | null>(null);
  const [webSearchEnabled, setWebSearchEnabled] = useState<boolean>(false);
  const [useGlobalContext, setUseGlobalContext] = useState<boolean>(false);
  const [useLocalContext, setUseLocalContext] = useState<boolean>(false);
  const [searchProvider, setSearchProvider] = useState<string>('serpapi');
  const [playwrightPersonaId, setPlaywrightPersonaId] = useState<string | null>(null);

  // Context settings
  const [globalContext, setGlobalContext] = useState<string>('');
  const [localContext, setLocalContext] = useState<string>('');
  const [localContextMode, setLocalContextMode] = useState<'override' | 'append'>('override');

  // Internal state
  const [settingsDirty, setSettingsDirty] = useState<boolean>(false);
  const [settingsSaving, setSettingsSaving] = useState<boolean>(false);
  const [settingsSnapshot, setSettingsSnapshot] = useState<ChatbotSettingsPayload | null>(null);
  const settingsLoadedRef = useRef<boolean>(false);

  // External settings & data
  const brainAssignment = useBrainAssignment({ feature: 'chatbot' });
  const settingsQuery = useChatbotSettings(CHATBOT_SETTINGS_KEY);

  useEffect((): void => {
    const nextModel = brainAssignment.effectiveModelId.trim();
    if (nextModel === '' || nextModel === model) return;
    setModel(nextModel);
  }, [brainAssignment.effectiveModelId, model]);

  const agent = useAgentCreatorSettings();
  const normalizedAgent = normalizeAgentSettings(agent);

  const currentSettings = useChatbotSettingsMemo({
    model, personaId, webSearchEnabled, useGlobalContext, useLocalContext, localContextMode,
    searchProvider, playwrightPersonaId,
    ...normalizedAgent,
  });

  const handlers = useChatbotSettingsHandlers({
    settingsQuery, currentSettings, setSettingsSnapshot, setSettingsDirty,
    actions: {
      setModel, setWebSearchEnabled, setUseGlobalContext, setUseLocalContext, setLocalContextMode,
      setSearchProvider, setPersonaId, setPlaywrightPersonaId, ...agent,
    },
  });

  useEffect((): void => {
    if (settingsLoadedRef.current || !settingsQuery.isSuccess) return;
    settingsLoadedRef.current = true;
    void handlers.loadChatbotSettings();
  }, [settingsQuery.isSuccess, handlers]);

  useEffect((): void => {
    if (settingsSnapshot === null) {
      setSettingsSnapshot(currentSettings);
      return;
    }
    setSettingsDirty(JSON.stringify(settingsSnapshot) !== JSON.stringify(currentSettings));
  }, [currentSettings, settingsSnapshot]);

  return {
    model, setModel, personaId, setPersonaId, webSearchEnabled, setWebSearchEnabled,
    useGlobalContext, setUseGlobalContext, useLocalContext, setUseLocalContext,
    searchProvider, setSearchProvider, playwrightPersonaId, setPlaywrightPersonaId,
    globalContext, setGlobalContext, localContext, setLocalContext,
    localContextMode, setLocalContextMode, settingsDirty, setSettingsDirty,
    settingsSaving, setSettingsSaving, ...handlers,
    ...agent,
    ...normalizedAgent,
  };
}
