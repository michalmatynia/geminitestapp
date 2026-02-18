import type {
  AgentDecisionDto,
  PlanStepDto,
  PlannerCritiqueDto,
  PlannerAlternativeDto,
  PlannerMetaDto,
  AgentPlanSettingsDto,
  AgentPlanPreferencesDto,
  AgentCheckpointDto,
  LoopSignalDto,
  ApprovalRequestDto,
  PlanHierarchyDto,
  AgentToolRequestDto,
  AgentToolResultDto,
  AgentRunStatusTypeDto,
  AgentAuditLogRecordDto,
  AgentExecutionContextDto,
} from '@/shared/contracts/agent-runtime';

export type AgentDecision = AgentDecisionDto;

export type PlanStep = PlanStepDto;

export type PlannerCritique = PlannerCritiqueDto;

export type PlannerAlternative = PlannerAlternativeDto;

export type PlannerMeta = PlannerMetaDto;

export type AgentPlanSettings = AgentPlanSettingsDto;

export type AgentPlanPreferences = AgentPlanPreferencesDto;

export type AgentCheckpoint = AgentCheckpointDto;

export type LoopSignal = LoopSignalDto;

export type ApprovalRequest = Omit<ApprovalRequestDto, 'requestedAt' | 'decidedAt'> & {
  requestedAt: Date;
  decidedAt?: Date;
};

export type AuditLevel = 'info' | 'warning' | 'error';

export type PlanHierarchy = PlanHierarchyDto;

export type MemoryScope = 'session' | 'longterm';

export type AgentToolRequest = AgentToolRequestDto;

export type AgentToolResult = AgentToolResultDto;

export type AgentRunStatusType = AgentRunStatusTypeDto;

export type AgentAuditLogRecord = Omit<AgentAuditLogRecordDto, 'createdAt'> & {
  createdAt: Date;
};

export type AgentExecutionContext = AgentExecutionContextDto;
