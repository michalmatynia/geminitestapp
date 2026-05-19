/**
 * Agent Creator Feature - Server Entry Point
 *
 * This module serves as the server-only entry point for the Agent Creator feature.
 * It exports API route handlers, repositories, services, and persona management utilities.
 *
 * Boundary Warning: This module must only be imported into server-side code.
 *
 * Exported members:
 * - API route handlers: GET, POST, DELETE, and control operations for agents
 * - Persona memory service: Management of agent personas and embeddings
 * - Teaching & embedding services: Repository, retrieval, and chat utilities
 *
 * Example usage:
 * import { AgentCreatorAgentGET, PersonaMemoryService } from '@/features/ai/agentcreator/server';
 */

import 'server-only';

export {
  GET as AgentCreatorAgentGET,
  POST as AgentCreatorAgentPOST,
  DELETE as AgentCreatorAgentDELETE,
} from './api/agent/route';
export { GET as AgentCreatorAgentSnapshotGET } from './api/agent/snapshots/[snapshotId]/route';
export {
  GET as AgentCreatorAgentRunGET,
  POST as AgentCreatorAgentRunPOST,
  DELETE as AgentCreatorAgentRunDELETE,
} from './api/agent/[runId]/route';
export { GET as AgentCreatorAgentRunLogsGET } from './api/agent/[runId]/logs/route';
export { POST as AgentCreatorAgentRunControlsPOST } from './api/agent/[runId]/controls/route';
export { GET as AgentCreatorAgentRunAuditsGET } from './api/agent/[runId]/audits/route';
export { GET as AgentCreatorAgentRunSnapshotsGET } from './api/agent/[runId]/snapshots/route';
export { GET as AgentCreatorAgentRunStreamGET } from './api/agent/[runId]/stream/route';
export { GET as AgentCreatorAgentRunAssetsGET } from './api/agent/[runId]/assets/[file]/route';
export * from './server/persona-memory';

// Teaching & Embedding services
export * from './teaching/server/repository';
export * from './teaching/server/embeddings';
export * from './teaching/server/retrieval';
export * from './teaching/server/chat';
