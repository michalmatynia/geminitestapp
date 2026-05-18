'use client';

import { useMemo } from 'react';
import type { ChatbotSettingsDto as ChatbotSettingsPayload } from '@/shared/contracts/chatbot';
import { DEFAULT_CHATBOT_SETTINGS } from '@/shared/lib/ai/chatbot/constants';

export function useChatbotSettingsMemo({
  model,
  personaId,
  webSearchEnabled,
  useGlobalContext,
  useLocalContext,
  localContextMode,
  searchProvider,
  playwrightPersonaId,
  agentModeEnabled,
  agentBrowser,
  agentRunHeadless,
  agentIgnoreRobotsTxt,
  agentRequireHumanApproval,
  agentMaxSteps,
  agentMaxStepAttempts,
  agentMaxReplanCalls,
  agentReplanEverySteps,
  agentMaxSelfChecks,
  agentLoopGuardThreshold,
  agentLoopBackoffBaseMs,
  agentLoopBackoffMaxMs,
}: {
  model: string;
  personaId: string | null;
  webSearchEnabled: boolean;
  useGlobalContext: boolean;
  useLocalContext: boolean;
  localContextMode: 'override' | 'append';
  searchProvider: string;
  playwrightPersonaId: string | null;
  agentModeEnabled: boolean;
  agentBrowser: string;
  agentRunHeadless: boolean;
  agentIgnoreRobotsTxt: boolean;
  agentRequireHumanApproval: boolean;
  agentMaxSteps: number;
  agentMaxStepAttempts: number;
  agentMaxReplanCalls: number;
  agentReplanEverySteps: number;
  agentMaxSelfChecks: number;
  agentLoopGuardThreshold: number;
  agentLoopBackoffBaseMs: number;
  agentLoopBackoffMaxMs: number;
}): ChatbotSettingsPayload {
  return useMemo<ChatbotSettingsPayload>(
    () => ({
      model,
      temperature: DEFAULT_CHATBOT_SETTINGS.temperature,
      maxTokens: DEFAULT_CHATBOT_SETTINGS.maxTokens,
      systemPrompt: DEFAULT_CHATBOT_SETTINGS.systemPrompt,
      personaId,
      enableMemory: DEFAULT_CHATBOT_SETTINGS.enableMemory,
      enableContext: DEFAULT_CHATBOT_SETTINGS.enableContext,
      webSearchEnabled,
      useGlobalContext,
      useLocalContext,
      localContextMode,
      searchProvider,
      playwrightPersonaId,
      agentModeEnabled,
      agentBrowser,
      runHeadless: agentRunHeadless,
      ignoreRobotsTxt: agentIgnoreRobotsTxt,
      requireHumanApproval: agentRequireHumanApproval,
      maxSteps: agentMaxSteps,
      maxStepAttempts: agentMaxStepAttempts,
      maxReplanCalls: agentMaxReplanCalls,
      replanEverySteps: agentReplanEverySteps,
      maxSelfChecks: agentMaxSelfChecks,
      loopGuardThreshold: agentLoopGuardThreshold,
      loopBackoffBaseMs: agentLoopBackoffBaseMs,
      loopBackoffMaxMs: agentLoopBackoffMaxMs,
    }),
    [
      model, personaId, webSearchEnabled, useGlobalContext, useLocalContext, localContextMode,
      searchProvider, playwrightPersonaId, agentModeEnabled, agentBrowser, agentRunHeadless,
      agentIgnoreRobotsTxt, agentRequireHumanApproval, agentMaxSteps, agentMaxStepAttempts,
      agentMaxReplanCalls, agentReplanEverySteps, agentMaxSelfChecks, agentLoopGuardThreshold,
      agentLoopBackoffBaseMs, agentLoopBackoffMaxMs,
    ]
  );
}
