'use client';

import React, { createContext, useContext, useState, ReactNode, useMemo } from 'react';

import { DEFAULT_AGENT_SETTINGS } from '@/features/ai/agentcreator/utils/constants';
import { useChatbotModels } from '@/features/ai/chatbot/hooks/useChatbotQueries';

type AgentCreatorSettingsContextType = {
  agentModeEnabled: boolean;
  setAgentModeEnabled: (value: boolean) => void;
  agentBrowser: string;
  setAgentBrowser: (value: string) => void;
  agentMaxSteps: number;
  setAgentMaxSteps: (value: number) => void;
  agentRunHeadless: boolean;
  setAgentRunHeadless: (value: boolean) => void;
  agentIgnoreRobotsTxt: boolean;
  setAgentIgnoreRobotsTxt: (value: boolean) => void;
  agentRequireHumanApproval: boolean;
  setAgentRequireHumanApproval: (value: boolean) => void;
  agentMemoryValidationModel: string | null;
  setAgentMemoryValidationModel: (value: string | null) => void;
  agentPlannerModel: string | null;
  setAgentPlannerModel: (value: string | null) => void;
  agentSelfCheckModel: string | null;
  setAgentSelfCheckModel: (value: string | null) => void;
  agentExtractionValidationModel: string | null;
  setAgentExtractionValidationModel: (value: string | null) => void;
  agentToolRouterModel: string | null;
  setAgentToolRouterModel: (value: string | null) => void;
  agentLoopGuardModel: string | null;
  setAgentLoopGuardModel: (value: string | null) => void;
  agentApprovalGateModel: string | null;
  setAgentApprovalGateModel: (value: string | null) => void;
  agentMemorySummarizationModel: string | null;
  setAgentMemorySummarizationModel: (value: string | null) => void;
  agentSelectorInferenceModel: string | null;
  setAgentSelectorInferenceModel: (value: string | null) => void;
  agentOutputNormalizationModel: string | null;
  setAgentOutputNormalizationModel: (value: string | null) => void;
  agentMaxStepAttempts: number;
  setAgentMaxStepAttempts: (value: number) => void;
  agentMaxReplanCalls: number;
  setAgentMaxReplanCalls: (value: number) => void;
  agentReplanEverySteps: number;
  setAgentReplanEverySteps: (value: number) => void;
  agentMaxSelfChecks: number;
  setAgentMaxSelfChecks: (value: number) => void;
  agentLoopGuardThreshold: number;
  setAgentLoopGuardThreshold: (value: number) => void;
  agentLoopBackoffBaseMs: number;
  setAgentLoopBackoffBaseMs: (value: number) => void;
  agentLoopBackoffMaxMs: number;
  setAgentLoopBackoffMaxMs: (value: number) => void;
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
  const { data: modelOptions = [], isLoading: modelsLoading } = useChatbotModels();
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
  const [agentMemoryValidationModel, setAgentMemoryValidationModel] = useState<string | null>(
    DEFAULT_AGENT_SETTINGS.memoryValidationModel
  );
  const [agentPlannerModel, setAgentPlannerModel] = useState<string | null>(
    DEFAULT_AGENT_SETTINGS.plannerModel
  );
  const [agentSelfCheckModel, setAgentSelfCheckModel] = useState<string | null>(
    DEFAULT_AGENT_SETTINGS.selfCheckModel
  );
  const [agentExtractionValidationModel, setAgentExtractionValidationModel] =
    useState<string | null>(DEFAULT_AGENT_SETTINGS.extractionValidationModel);
  const [agentToolRouterModel, setAgentToolRouterModel] = useState<string | null>(
    DEFAULT_AGENT_SETTINGS.toolRouterModel
  );
  const [agentLoopGuardModel, setAgentLoopGuardModel] = useState<string | null>(
    DEFAULT_AGENT_SETTINGS.loopGuardModel
  );
  const [agentApprovalGateModel, setAgentApprovalGateModel] = useState<string | null>(
    DEFAULT_AGENT_SETTINGS.approvalGateModel
  );
  const [agentMemorySummarizationModel, setAgentMemorySummarizationModel] =
    useState<string | null>(DEFAULT_AGENT_SETTINGS.memorySummarizationModel);
  const [agentSelectorInferenceModel, setAgentSelectorInferenceModel] =
    useState<string | null>(DEFAULT_AGENT_SETTINGS.selectorInferenceModel);
  const [agentOutputNormalizationModel, setAgentOutputNormalizationModel] =
    useState<string | null>(DEFAULT_AGENT_SETTINGS.outputNormalizationModel);
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
    setAgentMemoryValidationModel: setAgentMemoryValidationModel as (value: string | null) => void,
    agentPlannerModel,
    setAgentPlannerModel: setAgentPlannerModel as (value: string | null) => void,
    agentSelfCheckModel,
    setAgentSelfCheckModel: setAgentSelfCheckModel as (value: string | null) => void,
    agentExtractionValidationModel,
    setAgentExtractionValidationModel: setAgentExtractionValidationModel as (value: string | null) => void,
    agentToolRouterModel,
    setAgentToolRouterModel: setAgentToolRouterModel as (value: string | null) => void,
    agentLoopGuardModel,
    setAgentLoopGuardModel: setAgentLoopGuardModel as (value: string | null) => void,
    agentApprovalGateModel,
    setAgentApprovalGateModel: setAgentApprovalGateModel as (value: string | null) => void,
    agentMemorySummarizationModel,
    setAgentMemorySummarizationModel: setAgentMemorySummarizationModel as (value: string | null) => void,
    agentSelectorInferenceModel,
    setAgentSelectorInferenceModel: setAgentSelectorInferenceModel as (value: string | null) => void,
    agentOutputNormalizationModel,
    setAgentOutputNormalizationModel: setAgentOutputNormalizationModel as (value: string | null) => void,
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
