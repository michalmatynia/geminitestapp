'use client';

import React, { useState, ReactNode, useMemo } from 'react';

import { DEFAULT_AGENT_SETTINGS } from '@/features/ai/agentcreator/utils/constants';
import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

// --- Granular Contexts ---

export interface AgentCreatorModes {
  agentModeEnabled: boolean;
  setAgentModeEnabled: (value: boolean) => void;
}
const { Context: ModesContext, useStrictContext: useAgentCreatorModes } =
  createStrictContext<AgentCreatorModes>({
    hookName: 'useAgentCreatorModes',
    providerName: 'AgentCreatorSettingsProvider',
    displayName: 'AgentCreatorModesContext',
    errorFactory: internalError,
  });
export { useAgentCreatorModes };

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
const { Context: PerformanceContext, useStrictContext: useAgentCreatorPerformance } =
  createStrictContext<AgentCreatorPerformance>({
    hookName: 'useAgentCreatorPerformance',
    providerName: 'AgentCreatorSettingsProvider',
    displayName: 'AgentCreatorPerformanceContext',
    errorFactory: internalError,
  });
export { useAgentCreatorPerformance };

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
const { Context: OperationsContext, useStrictContext: useAgentCreatorOperations } =
  createStrictContext<AgentCreatorOperations>({
    hookName: 'useAgentCreatorOperations',
    providerName: 'AgentCreatorSettingsProvider',
    displayName: 'AgentCreatorOperationsContext',
    errorFactory: internalError,
  });
export { useAgentCreatorOperations };

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

  return (
    <ModesContext.Provider value={modesValue}>
      <PerformanceContext.Provider value={performanceValue}>
        <OperationsContext.Provider value={operationsValue}>{children}</OperationsContext.Provider>
      </PerformanceContext.Provider>
    </ModesContext.Provider>
  );
}
