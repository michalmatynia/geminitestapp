"use client";

import { useState } from "react";
import { DEFAULT_AGENT_SETTINGS } from "@/features/agentcreator/utils/constants";

export const useAgentCreatorSettings = () => {
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
  const [agentMemoryValidationModel, setAgentMemoryValidationModel] = useState(
    DEFAULT_AGENT_SETTINGS.memoryValidationModel
  );
  const [agentPlannerModel, setAgentPlannerModel] = useState(
    DEFAULT_AGENT_SETTINGS.plannerModel
  );
  const [agentSelfCheckModel, setAgentSelfCheckModel] = useState(
    DEFAULT_AGENT_SETTINGS.selfCheckModel
  );
  const [agentExtractionValidationModel, setAgentExtractionValidationModel] =
    useState(DEFAULT_AGENT_SETTINGS.extractionValidationModel);
  const [agentLoopGuardModel, setAgentLoopGuardModel] = useState(
    DEFAULT_AGENT_SETTINGS.loopGuardModel
  );
  const [agentApprovalGateModel, setAgentApprovalGateModel] = useState(
    DEFAULT_AGENT_SETTINGS.approvalGateModel
  );
  const [agentMemorySummarizationModel, setAgentMemorySummarizationModel] =
    useState(DEFAULT_AGENT_SETTINGS.memorySummarizationModel);
  const [agentSelectorInferenceModel, setAgentSelectorInferenceModel] =
    useState(DEFAULT_AGENT_SETTINGS.selectorInferenceModel);
  const [agentOutputNormalizationModel, setAgentOutputNormalizationModel] =
    useState(DEFAULT_AGENT_SETTINGS.outputNormalizationModel);
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

  return {
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
    setAgentMemoryValidationModel,
    agentPlannerModel,
    setAgentPlannerModel,
    agentSelfCheckModel,
    setAgentSelfCheckModel,
    agentExtractionValidationModel,
    setAgentExtractionValidationModel,
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
  };
};
