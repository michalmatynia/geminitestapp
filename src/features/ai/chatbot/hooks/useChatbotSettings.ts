'use client';

import { useCallback, type MutableRefObject } from 'react';
import { useToast } from '@/shared/ui/primitives.public';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';
import {
  parseChatbotSettingsPayload,
  type CreateChatbotSettingsDto as ChatbotSettingsPayload,
} from '@/shared/contracts/chatbot';
import { CHATBOT_SETTINGS_KEY, DEFAULT_CHATBOT_SETTINGS } from '@/shared/lib/ai/chatbot/constants';
import * as chatbotApi from '../api';

interface ChatbotSettingsParams {
  setWebSearchEnabled: (e: boolean) => void; setUseGlobalContext: (e: boolean) => void;
  setUseLocalContext: (e: boolean) => void; setLocalContextMode: (m: 'override' | 'append') => void;
  setSearchProvider: (p: string) => void; setPersonaId: (id: string | null) => void;
  setPlaywrightPersonaId: (id: string | null) => void; setAgentModeEnabled: (e: boolean) => void;
  setAgentBrowser: (b: string) => void; setAgentRunHeadless: (h: boolean) => void;
  setAgentIgnoreRobotsTxt: (i: boolean) => void; setAgentRequireHumanApproval: (r: boolean) => void;
  setAgentMaxSteps: (s: number) => void; setAgentMaxStepAttempts: (a: number) => void;
  setAgentMaxReplanCalls: (c: number) => void; setAgentReplanEverySteps: (s: number) => void;
  setAgentMaxSelfChecks: (c: number) => void; setAgentLoopGuardThreshold: (t: number) => void;
  setAgentLoopBackoffBaseMs: (m: number) => void; setAgentLoopBackoffMaxMs: (m: number) => void;
  setSettingsSnapshot: (s: ChatbotSettingsPayload) => void; setSettingsDirty: (d: boolean) => void;
  setSettingsSaving: (s: boolean) => void; settingsSaving: boolean;
  currentSettings: ChatbotSettingsPayload; settingsLoadedRef: MutableRefObject<boolean>;
}

interface ChatbotSettingsResult {
  loadChatbotSettings: () => Promise<void>;
  saveChatbotSettings: () => Promise<void>;
}

export function useChatbotSettings(params: ChatbotSettingsParams): ChatbotSettingsResult {
  const { toast } = useToast();

  const applyCore = useCallback((r: ChatbotSettingsPayload): void => {
    params.setWebSearchEnabled(Boolean(r.webSearchEnabled));
    params.setUseGlobalContext(Boolean(r.useGlobalContext));
    params.setUseLocalContext(Boolean(r.useLocalContext));
    params.setLocalContextMode(r.localContextMode === 'append' ? 'append' : 'override');
    params.setSearchProvider(r.searchProvider ?? 'serpapi');
    params.setPersonaId(r.personaId ?? null);
    params.setPlaywrightPersonaId(r.playwrightPersonaId ?? null);
  }, [params]);

  const applyAgentCore = useCallback((r: ChatbotSettingsPayload): void => {
    params.setAgentModeEnabled(Boolean(r.agentModeEnabled));
    params.setAgentBrowser(r.agentBrowser ?? DEFAULT_CHATBOT_SETTINGS.agentBrowser ?? 'chromium');
    params.setAgentRunHeadless(Boolean(r.runHeadless));
    params.setAgentIgnoreRobotsTxt(Boolean(r.ignoreRobotsTxt));
    params.setAgentRequireHumanApproval(Boolean(r.requireHumanApproval));
  }, [params]);

  const applyAgentLimits = useCallback((r: ChatbotSettingsPayload): void => {
    params.setAgentMaxSteps(r.maxSteps ?? 10);
    params.setAgentMaxStepAttempts(r.maxStepAttempts ?? 3);
    params.setAgentMaxReplanCalls(r.maxReplanCalls ?? 3);
    params.setAgentReplanEverySteps(r.replanEverySteps ?? 5);
    params.setAgentMaxSelfChecks(r.maxSelfChecks ?? 3);
  }, [params]);

  const applyAgentLoop = useCallback((r: ChatbotSettingsPayload): void => {
    params.setAgentLoopGuardThreshold(r.loopGuardThreshold ?? 3);
    params.setAgentLoopBackoffBaseMs(r.loopBackoffBaseMs ?? 1000);
    params.setAgentLoopBackoffMaxMs(r.loopBackoffMaxMs ?? 5000);
  }, [params]);

  const loadChatbotSettings = useCallback(async (): Promise<void> => {
    try {
      const data = await chatbotApi.fetchChatbotSettings(CHATBOT_SETTINGS_KEY, 5000);
      if (!data.settings?.settings) return;
      const stored = parseChatbotSettingsPayload(data.settings.settings);
      const res: ChatbotSettingsPayload = { ...DEFAULT_CHATBOT_SETTINGS, ...stored };
      const { model: unusedM, temperature: unusedT, maxTokens: unusedMt, systemPrompt: unusedS, ...rest } = res;
      void unusedM; void unusedT; void unusedMt; void unusedS;
      applyCore(res); applyAgentCore(res); applyAgentLimits(res); applyAgentLoop(res);
      params.setSettingsSnapshot(rest); params.setSettingsDirty(false);
    } catch (e) {
      logClientCatch(e, { source: 'useChatbotSettings.loadChatbotSettings', key: CHATBOT_SETTINGS_KEY });
      toast(e instanceof Error ? e.message : 'Invalid settings.', { variant: 'error' });
    }
  }, [params, toast, applyCore, applyAgentCore, applyAgentLimits, applyAgentLoop]);

  const saveChatbotSettings = useCallback(async (): Promise<void> => {
    if (params.settingsSaving) return;
    params.setSettingsSaving(true);
    try {
      await chatbotApi.saveChatbotSettings(CHATBOT_SETTINGS_KEY, params.currentSettings, 5000);
      params.setSettingsDirty(false); params.setSettingsSnapshot(params.currentSettings);
      toast('Chatbot settings saved.', { variant: 'success' });
    } catch (e: unknown) {
      logClientCatch(e, { source: 'useChatbotSettings.saveChatbotSettings' });
      toast(e instanceof Error ? e.message : 'Failed to save.', { variant: 'error' });
    } finally { params.setSettingsSaving(false); }
  }, [params, toast]);

  return { loadChatbotSettings, saveChatbotSettings };
}
