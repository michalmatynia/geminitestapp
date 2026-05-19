/**
 * Agent Runtime Feature - Server Entry Point
 *
 * This module serves as the server-only entry point for the Agent Runtime feature.
 * It exports audit trails, core execution engine, and tool definitions.
 *
 * Boundary Warning: This module must only be imported into server-side code.
 *
 * Exported members:
 * - Audit: Tracking and logging of agent execution activities
 * - Core Engine: Primary runtime execution logic and state management
 * - Tools: Tool definitions and implementations for agent actions
 *
 * Example usage:
 * import { AgentExecutionEngine } from '@/features/ai/agent-runtime/server';
 */

import 'server-only';

export * from './audit';
export * from './core/engine';
export * from './tools';
