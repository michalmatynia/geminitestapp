/**
 * Feature-layer entry point for the node handler registry.
 *
 * The authoritative source lives at `@/shared/lib/ai-paths/core/node-handler-registry`
 * because the runtime kernel (in `core/`) and feature services (here) both consume it.
 */
export {
  NODE_HANDLER_REGISTRY,
  getDefaultSideEffectPolicy,
  isEffectNodeType,
  type NodeHandlerMetadata,
  type NodeSideEffectPolicy,
} from '@/shared/lib/ai-paths/core/node-handler-registry';
