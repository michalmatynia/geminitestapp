'use client';

import React, { createContext, useContext, useState, ReactNode, useMemo } from 'react';

import { DEFAULT_AGENT_SETTINGS } from '@/features/ai/agentcreator/utils/constants';

// --- Granular Contexts ---

export interface AgentCreatorModes {
  agentModeEnabled: boolean;
  setAgentModeEnabled: (value: boolean) => void;
}
const ModesContext = createContext<AgentCreatorModes | null>(null);
export const useAgentCreatorModes = () => {
  const context = useContext(ModesContext);
  if (!context)
    throw new Error('useAgentCreatorModes must be used within AgentCreatorSettingsProvider');
  return context;
};

export interface AgentCreatorModels {
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
}
const ModelsContext = createContext<AgentCreatorModels | null>(null);
export const useAgentCreatorModels = () => {
  const context = useContext(ModelsContext);
  if (!context)
    throw new Error('useAgentCreatorModels must be used within AgentCreatorSettingsProvider');
  return context;
};

export interface AgentCreatorPerformance {
  agentMaxSteps: number | undefined;
  setAgentMaxSteps: (value: number | undefined) => void;
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
}
const PerformanceContext = createContext<AgentCreatorPerformance | null>(null);
export const useAgentCreatorPerformance = () => {
  const context = useContext(PerformanceContext);
  if (!context)
    throw new Error('useAgentCreatorPerformance must be used within AgentCreatorSettingsProvider');
  return context;
};

export interface AgentCreatorOperations {
  agentBrowser: string | undefined;
  setAgentBrowser: (value: string | undefined) => void;
  agentRunHeadless: boolean | undefined;
  setAgentRunHeadless: (value: boolean | undefined) => void;
  agentIgnoreRobotsTxt: boolean | undefined;
  setAgentIgnoreRobotsTxt: (value: boolean | undefined) => void;
  agentRequireHumanApproval: boolean | undefined;
  setAgentRequireHumanApproval: (value: boolean | undefined) => void;
}
const OperationsContext = createContext<AgentCreatorOperations | null>(null);
export const useAgentCreatorOperations = () => {
  const context = useContext(OperationsContext);
  if (!context)
    throw new Error('useAgentCreatorOperations must be used within AgentCreatorSettingsProvider');
  return context;
};

// --- Legacy Aggregator ---

type AgentCreatorSettingsContextType = AgentCreatorModes &
  AgentCreatorModels &
  AgentCreatorPerformance &
  AgentCreatorOperations;

const AgentCreatorSettingsContext = createContext<AgentCreatorSettingsContextType | null>(null);

export const useAgentCreatorSettingsContext = (): AgentCreatorSettingsContextType => {
  const context = useContext(AgentCreatorSettingsContext);
  if (!context) {
    throw new Error(
      'useAgentCreatorSettingsContext must be used within an AgentCreatorSettingsProvider'
    );
  }
  return context;
};

export function AgentCreatorSettingsProvider({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  const [agentModeEnabled, setAgentModeEnabled] = useState(false);
  const [agentBrowser, setAgentBrowser] = useState(DEFAULT_AGENT_SETTINGS.agentBrowser);
  const [agentRunHeadless, setAgentRunHeadless] = useState(DEFAULT_AGENT_SETTINGS.runHeadless);
  const [agentIgnoreRobotsTxt, setAgentIgnoreRobotsTxt] = useState(
    DEFAULT_AGENT_SETTINGS.ignoreRobotsTxt
  );
  const [agentRequireHumanApproval, setAgentRequireHumanApproval] = useState(
    DEFAULT_AGENT_SETTINGS.requireHumanApproval
  );
  const [agentMemoryValidationModel, setAgentMemoryValidationModel] = useState<
    string | null | undefined
  >(DEFAULT_AGENT_SETTINGS.memoryValidationModel);
  const [agentPlannerModel, setAgentPlannerModel] = useState<string | null | undefined>(
    DEFAULT_AGENT_SETTINGS.plannerModel
  );
  const [agentSelfCheckModel, setAgentSelfCheckModel] = useState<string | null | undefined>(
    DEFAULT_AGENT_SETTINGS.selfCheckModel
  );
  const [agentExtractionValidationModel, setAgentExtractionValidationModel] = useState<
    string | null | undefined
  >(DEFAULT_AGENT_SETTINGS.extractionValidationModel);
  const [agentToolRouterModel, setAgentToolRouterModel] = useState<string | null | undefined>(
    DEFAULT_AGENT_SETTINGS.toolRouterModel
  );
  const [agentLoopGuardModel, setAgentLoopGuardModel] = useState<string | null | undefined>(
    DEFAULT_AGENT_SETTINGS.loopGuardModel
  );
  const [agentApprovalGateModel, setAgentApprovalGateModel] = useState<string | null | undefined>(
    DEFAULT_AGENT_SETTINGS.approvalGateModel
  );
  const [agentMemorySummarizationModel, setAgentMemorySummarizationModel] = useState<
    string | null | undefined
  >(DEFAULT_AGENT_SETTINGS.memorySummarizationModel);
  const [agentSelectorInferenceModel, setAgentSelectorInferenceModel] = useState<
    string | null | undefined
  >(DEFAULT_AGENT_SETTINGS.selectorInferenceModel);
  const [agentOutputNormalizationModel, setAgentOutputNormalizationModel] = useState<
    string | null | undefined
  >(DEFAULT_AGENT_SETTINGS.outputNormalizationModel);
  const [agentMaxSteps, setAgentMaxSteps] = useState(DEFAULT_AGENT_SETTINGS.maxSteps);
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

  const modesValue = useMemo<AgentCreatorModes>(
    () => ({
      agentModeEnabled,
      setAgentModeEnabled,
    }),
    [agentModeEnabled]
  );

  const modelsValue = useMemo<AgentCreatorModels>(
    () => ({
      agentMemoryValidationModel,
      setAgentMemoryValidationModel,
      agentPlannerModel,
      setAgentPlannerModel,
      agentSelfCheckModel,
      setAgentSelfCheckModel,
      agentExtractionValidationModel,
      setAgentExtractionValidationModel,
      agentToolRouterModel,
      setAgentToolRouterModel,
      agentLoopGuardModel,
      setAgentLoopGuardModel,
      agentApprovalGateModel,
      setAgentApprovalGateModel,
      agentMemorySummarizationModel,
      setAgentMemorySummarizationModel,
      agentSelectorInferenceModel,
      setAgentSelectorInferenceModel,
      agentOutputNormalizationModel,
      setAgentOutputNormalizationModel,
    }),
    [
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
    ]
  );

  const performanceValue = useMemo<AgentCreatorPerformance>(
    () => ({
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
    }),
    [
      agentMaxSteps,
      agentMaxStepAttempts,
      agentMaxReplanCalls,
      agentReplanEverySteps,
      agentMaxSelfChecks,
      agentLoopGuardThreshold,
      agentLoopBackoffBaseMs,
      agentLoopBackoffMaxMs,
    ]
  );

  const operationsValue = useMemo<AgentCreatorOperations>(
    () => ({
      agentBrowser,
      setAgentBrowser,
      agentRunHeadless,
      setAgentRunHeadless,
      agentIgnoreRobotsTxt,
      setAgentIgnoreRobotsTxt,
      agentRequireHumanApproval,
      setAgentRequireHumanApproval,
    }),
    [agentBrowser, agentRunHeadless, agentIgnoreRobotsTxt, agentRequireHumanApproval]
  );

  const aggregatedValue = useMemo<AgentCreatorSettingsContextType>(
    () => ({
      ...modesValue,
      ...modelsValue,
      ...performanceValue,
      ...operationsValue,
    }),
    [modesValue, modelsValue, performanceValue, operationsValue]
  );

  return (
    <ModesContext.Provider value={modesValue}>
      <ModelsContext.Provider value={modelsValue}>
        <PerformanceContext.Provider value={performanceValue}>
          <OperationsContext.Provider value={operationsValue}>
            <AgentCreatorSettingsContext.Provider value={aggregatedValue}>
              {children}
            </AgentCreatorSettingsContext.Provider>
          </OperationsContext.Provider>
        </PerformanceContext.Provider>
      </ModelsContext.Provider>
    </ModesContext.Provider>
  );
}
