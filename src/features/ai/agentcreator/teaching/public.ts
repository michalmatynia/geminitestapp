/**
 * Agent Teaching Feature - Public Entry Point
 *
 * This is the public client-safe entry point for the Agent Teaching feature.
 * It exports components and utilities for teaching agents through collections and chat.
 *
 * Exported members:
 * - AgentTeachingAgentsPage: Admin page for managing teaching agents
 * - AgentTeachingChatPage: Page for interactive agent teaching sessions
 * - AgentTeachingCollectionsPage: Page for viewing and managing teaching collections
 * - AgentTeachingCollectionDetailPage: Detail view for a single collection
 * - AgentTeachingProvider: Context provider for teaching state and operations
 *
 * Example usage:
 * import { AgentTeachingProvider, AgentTeachingChatPage } from '@/features/ai/agentcreator/teaching/public';
 */

export { AgentTeachingAgentsPage } from './pages/AgentTeachingAgentsPage';
export { AgentTeachingChatPage } from './pages/AgentTeachingChatPage';
export { AgentTeachingCollectionsPage } from './pages/AgentTeachingCollectionsPage';
export { AgentTeachingCollectionDetailPage } from './pages/AgentTeachingCollectionDetailPage';
export { AgentTeachingProvider } from './context/AgentTeachingContext';
