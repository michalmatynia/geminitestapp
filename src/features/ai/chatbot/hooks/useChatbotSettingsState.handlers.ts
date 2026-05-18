'use client';

import { useCallback } from 'react';
import { useToast } from '@/shared/ui/primitives.public';
import { logClientCatch, logClientError } from '@/shared/utils/observability/client-error-logger';
import { CHATBOT_SETTINGS_KEY, DEFAULT_CHATBOT_SETTINGS } from '@/shared/lib/ai/chatbot/constants';
import { parseChatbotSettingsPayload, type ChatbotSettingsDto as ChatbotSettingsPayload } from '@/shared/contracts/chatbot';
import { useSaveChatbotSettings } from './useChatbotMutations';

export function useChatbotSettingsHandlers({
  settingsQuery,
  currentSettings,
  setSettingsSnapshot,
  setSettingsDirty,
  actions,
}: {
  settingsQuery: any;
  currentSettings: ChatbotSettingsPayload;
  setSettingsSnapshot: React.Dispatch<React.SetStateAction<ChatbotSettingsPayload | null>>;
  setSettingsDirty: React.Dispatch<React.SetStateAction<boolean>>;
  actions: {
    setModel: (val: string) => void;
    setWebSearchEnabled: (val: boolean) => void;
    setUseGlobalContext: (val: boolean) => void;
    setUseLocalContext: (val: boolean) => void;
    setLocalContextMode: (val: 'append' | 'override') => void;
    setSearchProvider: (val: string) => void;
    setPersonaId: (val: string | null) => void;
    setPlaywrightPersonaId: (val: string | null) => void;
    setAgentModeEnabled: (val: boolean) => void;
    setAgentBrowser: (val: string) => void;
    setAgentRunHeadless: (val: boolean) => void;
    setAgentIgnoreRobotsTxt: (val: boolean) => void;
    setAgentRequireHumanApproval: (val: boolean) => void;
    setAgentMaxSteps: (val: number) => void;
    setAgentMaxStepAttempts: (val: number) => void;
    setAgentMaxReplanCalls: (val: number) => void;
    setAgentReplanEverySteps: (val: number) => void;
    setAgentMaxSelfChecks: (val: number) => void;
    setAgentLoopGuardThreshold: (val: number) => void;
    setAgentLoopBackoffBaseMs: (val: number) => void;
    setAgentLoopBackoffMaxMs: (val: number) => void;
  };
}) {
  const { toast } = useToast();
  const saveMutation = useSaveChatbotSettings();

  const loadChatbotSettings = useCallback(async (): Promise<void> => {
    if (settingsQuery.data?.settings?.settings === undefined) return;

    try {
      const stored = parseChatbotSettingsPayload(settingsQuery.data.settings.settings);
      const res: ChatbotSettingsPayload = { ...DEFAULT_CHATBOT_SETTINGS, ...stored };

      if (typeof res.model === 'string' && res.model !== '') actions.setModel(res.model);
      actions.setWebSearchEnabled(Boolean(res.webSearchEnabled));
      actions.setUseGlobalContext(Boolean(res.useGlobalContext));
      actions.setUseLocalContext(Boolean(res.useLocalContext));
      actions.setLocalContextMode((res.localContextMode as 'append' | 'override') ?? 'override');
      actions.setSearchProvider(res.searchProvider ?? 'serpapi');
      actions.setPersonaId(res.personaId ?? null);
      actions.setPlaywrightPersonaId(res.playwrightPersonaId ?? null);

      actions.setAgentModeEnabled(Boolean(res.agentModeEnabled));
      actions.setAgentBrowser(res.agentBrowser ?? DEFAULT_CHATBOT_SETTINGS.agentBrowser ?? 'chromium');
      actions.setAgentRunHeadless(Boolean(res.runHeadless));
      actions.setAgentIgnoreRobotsTxt(Boolean(res.ignoreRobotsTxt));
      actions.setAgentRequireHumanApproval(Boolean(res.requireHumanApproval));
      actions.setAgentMaxSteps(res.maxSteps ?? 10);
      actions.setAgentMaxStepAttempts(res.maxStepAttempts ?? 3);
      actions.setAgentMaxReplanCalls(res.maxReplanCalls ?? 3);
      actions.setAgentReplanEverySteps(res.replanEverySteps ?? 5);
      actions.setAgentMaxSelfChecks(res.maxSelfChecks ?? 3);
      actions.setAgentLoopGuardThreshold(res.loopGuardThreshold ?? 3);
      actions.setAgentLoopBackoffBaseMs(res.loopBackoffBaseMs ?? 1000);
      actions.setAgentLoopBackoffMaxMs(res.loopBackoffMaxMs ?? 5000);

      setSettingsSnapshot(res);
      setSettingsDirty(false);
    } catch (err: unknown) {
      logClientCatch(err, { source: 'useChatbotSettingsState.loadChatbotSettings', key: CHATBOT_SETTINGS_KEY });
      toast(err instanceof Error ? err.message : 'Invalid chatbot settings payload.', { variant: 'error' });
    }
  }, [settingsQuery.data, actions, setSettingsSnapshot, setSettingsDirty, toast]);

  const saveChatbotSettings = useCallback(async (): Promise<void> => {
    try {
      await saveMutation.mutateAsync({
        key: CHATBOT_SETTINGS_KEY,
        settings: currentSettings,
      });
      setSettingsDirty(false);
      setSettingsSnapshot(currentSettings);
      toast('Chatbot settings saved.', { variant: 'success' });
    } catch (err: unknown) {
      logClientError(err);
      toast(err instanceof Error ? err.message : 'Failed to save settings.', { variant: 'error' });
    }
  }, [currentSettings, saveMutation, setSettingsDirty, setSettingsSnapshot, toast]);

  return { loadChatbotSettings, saveChatbotSettings, saveMutation };
}
