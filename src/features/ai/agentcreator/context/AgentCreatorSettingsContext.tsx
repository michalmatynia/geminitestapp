'use client';

import React, { createContext, useContext, useState, ReactNode, useMemo } from 'react';

import { DEFAULT_AGENT_SETTINGS } from '@/features/ai/agentcreator/utils/constants';
import { DEFAULT_MODELS } from '@/features/ai/ai-paths/lib';
import { useChatbotModels } from '@/features/ai/chatbot/hooks/useChatbotQueries';

type AgentCreatorSettingsContextType = {
  agentModeEnabled: boolean;
  setAgentModeEnabled: (value: boolean) => void;
  agentBrowser: string | undefined;
  setAgentBrowser: (value: string | undefined) => void;
  agentMaxSteps: number | undefined;
  setAgentMaxSteps: (value: number | undefined) => void;
  agentRunHeadless: boolean | undefined;
  setAgentRunHeadless: (value: boolean | undefined) => void;
  agentIgnoreRobotsTxt: boolean | undefined;
  setAgentIgnoreRobotsTxt: (value: boolean | undefined) => void;
  agentRequireHumanApproval: boolean | undefined;
  setAgentRequireHumanApproval: (value: boolean | undefined) => void;
  agentMemoryValidationModel: string | null | undefined;
  setAgentMemoryValidationModel: (value: string | null | undefined) => void;
  agentPlannerModel: string | null | undefined;
  setAgentPlannerModel: (value: string | null | undefined) => void;
  agentSelfCheckModel: string | null | undefined;
  setAgentSelfCheckModel: (value: string | null | undefined) => void;
  agentExtractionValidationModel: string | null | undefined;
  setAgentExtractionValidationModel: (value: string | null | undefined) => void;
  agentToolRouterModel: string | null | undefined;
  setAgentToolRouterModel: (value: string | null | undefined) => void;
  agentLoopGuardModel: string | null | undefined;
  setAgentLoopGuardModel: (value: string | null | undefined) => void;
  agentApprovalGateModel: string | null | undefined;
  setAgentApprovalGateModel: (value: string | null | undefined) => void;
  agentMemorySummarizationModel: string | null | undefined;
  setAgentMemorySummarizationModel: (value: string | null | undefined) => void;
  agentSelectorInferenceModel: string | null | undefined;
  setAgentSelectorInferenceModel: (value: string | null | undefined) => void;
  agentOutputNormalizationModel: string | null | undefined;
  setAgentOutputNormalizationModel: (value: string | null | undefined) => void;
  agentMaxStepAttempts: number | undefined;
  setAgentMaxStepAttempts: (value: number | undefined) => void;
  agentMaxReplanCalls: number | undefined;
  setAgentMaxReplanCalls: (value: number | undefined) => void;
  agentReplanEverySteps: number | undefined;
  setAgentReplanEverySteps: (value: number | undefined) => void;
  agentMaxSelfChecks: number | undefined;
  setAgentMaxSelfChecks: (value: number | undefined) => void;
  agentLoopGuardThreshold: number | undefined;
  setAgentLoopGuardThreshold: (value: number | undefined) => void;
  agentLoopBackoffBaseMs: number | undefined;
  setAgentLoopBackoffBaseMs: (value: number | undefined) => void;
  agentLoopBackoffMaxMs: number | undefined;
  setAgentLoopBackoffMaxMs: (value: number | undefined) => void;
  modelOptions: string[];
  modelsLoading: boolean;
};

const AgentCreatorSettingsContext = createContext<AgentCreatorSettingsContextType | null>(null);

export const useAgentCreatorSettingsContext = (): AgentCreatorSettingsContextType => {
  const context = useContext(AgentCreatorSettingsContext);
  if (!context) {
    throw new Error('useAgentCreatorSettingsContext must be used within an AgentCreatorSettingsProvider');
  }
  return context;
};

export function AgentCreatorSettingsProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const { data: fetchedModels = [], isLoading: modelsLoading } = useChatbotModels();
  
  const modelOptions = useMemo(() => {
    const combined = [...fetchedModels, ...DEFAULT_MODELS];
    const seen = new Set<string>();
    return combined.filter((m: string) => {
      if (!m || seen.has(m)) return false;
      seen.add(m);
      return true;
    });
  }, [fetchedModels]);

  const [agentModeEnabled, setAgentModeEnabled] = useState(false);
  const [agentBrowser, setAgentBrowser] = useState(
    DEFAULT_AGENT_SETTINGS.agentBrowser
  );
  const [agentRunHeadless, setAgentRunHeadless] = useState(
    DEFAULT_AGENT_SETTINGS.runHeadless
  );
  const [agentIgnoreRobotsTxt, setAgentIgnoreRobotsTxt] = useState(
    DEFAULT_AGENT_SETTINGS.ignoreRobotsTxt
  );
  const [agentRequireHumanApproval, setAgentRequireHumanApproval] = useState(
    DEFAULT_AGENT_SETTINGS.requireHumanApproval
  );
  const [agentMemoryValidationModel, setAgentMemoryValidationModel] = useState<string | null | undefined>(
    DEFAULT_AGENT_SETTINGS.memoryValidationModel
  );
  const [agentPlannerModel, setAgentPlannerModel] = useState<string | null | undefined>(
    DEFAULT_AGENT_SETTINGS.plannerModel
  );
  const [agentSelfCheckModel, setAgentSelfCheckModel] = useState<string | null | undefined>(
    DEFAULT_AGENT_SETTINGS.selfCheckModel
  );
  const [agentExtractionValidationModel, setAgentExtractionValidationModel] =
    useState<string | null | undefined>(DEFAULT_AGENT_SETTINGS.extractionValidationModel);
  const [agentToolRouterModel, setAgentToolRouterModel] = useState<string | null | undefined>(
    DEFAULT_AGENT_SETTINGS.toolRouterModel
  );
  const [agentLoopGuardModel, setAgentLoopGuardModel] = useState<string | null | undefined>(
    DEFAULT_AGENT_SETTINGS.loopGuardModel
  );
  const [agentApprovalGateModel, setAgentApprovalGateModel] = useState<string | null | undefined>(
    DEFAULT_AGENT_SETTINGS.approvalGateModel
  );
  const [agentMemorySummarizationModel, setAgentMemorySummarizationModel] =
    useState<string | null | undefined>(DEFAULT_AGENT_SETTINGS.memorySummarizationModel);
  const [agentSelectorInferenceModel, setAgentSelectorInferenceModel] =
    useState<string | null | undefined>(DEFAULT_AGENT_SETTINGS.selectorInferenceModel);
  const [agentOutputNormalizationModel, setAgentOutputNormalizationModel] =
    useState<string | null | undefined>(DEFAULT_AGENT_SETTINGS.outputNormalizationModel);
  const [agentMaxSteps, setAgentMaxSteps] = useState(
    DEFAULT_AGENT_SETTINGS.maxSteps
  );
  const [agentMaxStepAttempts, setAgentMaxStepAttempts] = useState(
    DEFAULT_AGENT_SETTINGS.maxStepAttempts
  );
  const [agentMaxReplanCalls, setAgentMaxReplanCalls] = useState(
    DEFAULT_AGENT_SETTINGS.maxReplanCalls
  );
  const [agentReplanEverySteps, setAgentReplanEverySteps] = useState(
    DEFAULT_AGENT_SETTINGS.replanEverySteps
  );
  const [agentMaxSelfChecks, setAgentMaxSelfChecks] = useState(
    DEFAULT_AGENT_SETTINGS.maxSelfChecks
  );
  const [agentLoopGuardThreshold, setAgentLoopGuardThreshold] = useState(
    DEFAULT_AGENT_SETTINGS.loopGuardThreshold
  );
  const [agentLoopBackoffBaseMs, setAgentLoopBackoffBaseMs] = useState(
    DEFAULT_AGENT_SETTINGS.loopBackoffBaseMs
  );
  const [agentLoopBackoffMaxMs, setAgentLoopBackoffMaxMs] = useState(
    DEFAULT_AGENT_SETTINGS.loopBackoffMaxMs
  );

  const value: AgentCreatorSettingsContextType = useMemo(() => ({
    agentModeEnabled,
    setAgentModeEnabled,
    agentBrowser,
    setAgentBrowser,
    agentRunHeadless,
    setAgentRunHeadless,
    agentIgnoreRobotsTxt,
    setAgentIgnoreRobotsTxt,
    agentRequireHumanApproval,
    setAgentRequireHumanApproval,
    agentMemoryValidationModel,
    setAgentMemoryValidationModel: setAgentMemoryValidationModel as (value: string | null | undefined) => void,
    agentPlannerModel,
    setAgentPlannerModel: setAgentPlannerModel as (value: string | null | undefined) => void,
    agentSelfCheckModel,
    setAgentSelfCheckModel: setAgentSelfCheckModel as (value: string | null | undefined) => void,
    agentExtractionValidationModel,
    setAgentExtractionValidationModel: setAgentExtractionValidationModel as (value: string | null | undefined) => void,
    agentToolRouterModel,
    setAgentToolRouterModel: setAgentToolRouterModel as (value: string | null | undefined) => void,
    agentLoopGuardModel,
    setAgentLoopGuardModel: setAgentLoopGuardModel as (value: string | null | undefined) => void,
    agentApprovalGateModel,
    setAgentApprovalGateModel: setAgentApprovalGateModel as (value: string | null | undefined) => void,
    agentMemorySummarizationModel,
    setAgentMemorySummarizationModel: setAgentMemorySummarizationModel as (value: string | null | undefined) => void,
    agentSelectorInferenceModel,
    setAgentSelectorInferenceModel: setAgentSelectorInferenceModel as (value: string | null | undefined) => void,
    agentOutputNormalizationModel,
    setAgentOutputNormalizationModel: setAgentOutputNormalizationModel as (value: string | null | undefined) => void,
    agentMaxSteps,
    setAgentMaxSteps,
    agentMaxStepAttempts,
    setAgentMaxStepAttempts,
    agentMaxReplanCalls,
    setAgentMaxReplanCalls,
    agentReplanEverySteps,
    setAgentReplanEverySteps,
    agentMaxSelfChecks,
    setAgentMaxSelfChecks,
    agentLoopGuardThreshold,
    setAgentLoopGuardThreshold,
    agentLoopBackoffBaseMs,
    setAgentLoopBackoffBaseMs,
    agentLoopBackoffMaxMs,
    setAgentLoopBackoffMaxMs,
    modelOptions,
    modelsLoading,
  }), [
    agentModeEnabled,
    agentBrowser,
    agentRunHeadless,
    agentIgnoreRobotsTxt,
    agentRequireHumanApproval,
    agentMemoryValidationModel,
    agentPlannerModel,
    agentSelfCheckModel,
    agentExtractionValidationModel,
    agentToolRouterModel,
    agentLoopGuardModel,
    agentApprovalGateModel,
    agentMemorySummarizationModel,
    agentSelectorInferenceModel,
    agentOutputNormalizationModel,
    agentMaxSteps,
    agentMaxStepAttempts,
    agentMaxReplanCalls,
    agentReplanEverySteps,
    agentMaxSelfChecks,
    agentLoopGuardThreshold,
    agentLoopBackoffBaseMs,
    agentLoopBackoffMaxMs,
    modelOptions,
    modelsLoading,
  ]);

  return (
    <AgentCreatorSettingsContext.Provider value={value}>
      {children}
    </AgentCreatorSettingsContext.Provider>
  );
}
