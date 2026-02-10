// DTO type exports
export type {
  AgentDto,
  AgentRunDto,
  AgentLogDto,
  AgentPersonaDto,
  CreateAgentDto,
  UpdateAgentDto,
  ExecuteAgentDto
} from '@/shared/dtos';

export type AgentPersonaSettings = {
  executorModel: string | null;
  plannerModel: string | null;
  selfCheckModel: string | null;
  extractionValidationModel: string | null;
  toolRouterModel: string | null;
  memoryValidationModel: string | null;
  memorySummarizationModel: string | null;
  loopGuardModel: string | null;
  approvalGateModel: string | null;
  selectorInferenceModel: string | null;
  outputNormalizationModel: string | null;
};

export type AgentPersona = {
  id: string;
  name: string;
  description?: string | null;
  settings: AgentPersonaSettings;
  createdAt: string;
  updatedAt: string;
};
