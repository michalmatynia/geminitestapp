import type {
  AgentRunStatusTypeDto,
  AgentExecutionContextDto,
  AgentDecisionDto,
  AgentAuditLogRecordDto,
} from '../../contracts/agent-runtime';

export type {
  AgentRunStatusTypeDto as AgentRuntimeStatusDto,
  AgentExecutionContextDto as AgentRuntimeStateDto,
  AgentDecisionDto as AgentRuntimeActionDto,
  AgentAuditLogRecordDto as AgentRuntimeLogDto,
};

export type AgentRuntimeStatus = AgentRunStatusTypeDto;

export type AgentRuntimeState = AgentExecutionContextDto;

export type AgentRuntimeAction = AgentDecisionDto;

export type AgentRuntimeLog = AgentAuditLogRecordDto;
