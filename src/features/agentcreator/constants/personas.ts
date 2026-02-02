import type { AgentPersonaSettings } from "@/features/agentcreator/types";

export const AGENT_PERSONA_SETTINGS_KEY = "agent_personas";

export const DEFAULT_AGENT_PERSONA_SETTINGS: AgentPersonaSettings = {
  executorModel: "",
  plannerModel: "",
  selfCheckModel: "",
  extractionValidationModel: "",
  toolRouterModel: "",
  memoryValidationModel: "",
  memorySummarizationModel: "",
  loopGuardModel: "",
  approvalGateModel: "",
  selectorInferenceModel: "",
  outputNormalizationModel: "",
};
