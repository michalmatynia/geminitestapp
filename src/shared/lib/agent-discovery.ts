/**
 * Agent Discovery Service
 * 
 * Utilities for discovering AI agent resources, capabilities, and approval gates.
 * Provides:
 * - Resource and capability filtering
 * - Capability manifest access
 * - Approval gate discovery
 * - Execution model and workflow summaries
 */

import { agentCapabilityManifest } from './agent-capability-manifest';
import {
  AgentCapabilityEffectSchema,
  AgentLeaseModeSchema,
} from '../contracts/agent-capabilities';

/**
 * Options for filtering agent resources.
 */
type ListAgentResourcesOptions = {
  /** Filter by lease mode (e.g., partitioned, append-only). */
  mode?: string | null;
  /** Filter by whether the resource requires a lease. */
  requiresLease?: boolean;
  /** Filter by resource type (e.g., runtime, job, workflow). */
  resourceType?: string | null;
};

/**
 * Options for filtering agent capabilities.
 */
type ListAgentCapabilitiesOptions = {
  /** Filter by capability effect (e.g., observe, propose, safe_write). */
  effect?: string | null;
  /** Filter by associated resource ID. */
  resourceId?: string | null;
};

/**
 * Options for filtering approval gates.
 */
type ListApprovalGatesOptions = {
  /** Filter by what the gate is required for. */
  requiredFor?: string | null;
};

/**
 * Lists agent resources based on the provided filters.
 * 
 * @param options - Filtering options for mode, lease requirement, and type.
 * @returns An array of matching resource descriptors.
 */
export function listAgentResources(options: ListAgentResourcesOptions = {}) {
  const parsedMode = options.mode
    ? AgentLeaseModeSchema.safeParse(options.mode)
    : null;

  return agentCapabilityManifest.resources.filter((resource) => {
    if (parsedMode && parsedMode.success && resource.mode !== parsedMode.data) {
      return false;
    }

    if (
      typeof options.requiresLease === 'boolean' &&
      resource.requiresLease !== options.requiresLease
    ) {
      return false;
    }

    if (
      options.resourceType &&
      resource.resourceType !== options.resourceType.trim()
    ) {
      return false;
    }

    return true;
  });
}

/**
 * Retrieves a specific agent resource by its ID.
 * 
 * @param resourceId - The ID of the resource to find.
 * @returns The resource descriptor or null if not found.
 */
export function getAgentResource(resourceId: string) {
  return (
    agentCapabilityManifest.resources.find(
      (resource) => resource.resourceId === resourceId,
    ) ?? null
  );
}

/**
 * Lists agent approval gates based on the provided filters.
 * 
 * @param options - Filtering options for requiredFor.
 * @returns An array of matching approval gate descriptors.
 */
export function listAgentApprovalGates(
  options: ListApprovalGatesOptions = {},
) {
  const needle = options.requiredFor?.trim().toLowerCase() ?? null;

  return agentCapabilityManifest.approvalGates.filter((gate) => {
    if (!needle) {
      return true;
    }

    return gate.requiredFor.some((item) =>
      item.toLowerCase().includes(needle),
    );
  });
}

/**
 * Retrieves a specific agent approval gate by its ID.
 * 
 * @param gateId - The ID of the gate to find.
 * @returns The approval gate descriptor or null if not found.
 */
export function getAgentApprovalGate(gateId: string) {
  return (
    agentCapabilityManifest.approvalGates.find((gate) => gate.id === gateId) ??
    null
  );
}

/**
 * Lists agent capabilities based on the provided filters.
 * 
 * @param options - Filtering options for effect and associated resource.
 * @returns An array of matching capability descriptors.
 */
export function listAgentCapabilities(
  options: ListAgentCapabilitiesOptions = {},
) {
  const parsedEffect = options.effect
    ? AgentCapabilityEffectSchema.safeParse(options.effect)
    : null;

  return agentCapabilityManifest.capabilities.filter((capability) => {
    if (
      parsedEffect &&
      parsedEffect.success &&
      !capability.effects.includes(parsedEffect.data)
    ) {
      return false;
    }

    if (
      options.resourceId &&
      !capability.resources.includes(options.resourceId.trim())
    ) {
      return false;
    }

    return true;
  });
}

/**
 * Retrieves a summary of agent discovery information, including the execution model and recommended workflow.
 * 
 * @returns An object containing discovery, executionModel, and recommendedWorkflow metadata.
 */
export function getAgentDiscoverySummary() {
  return {
    discovery: agentCapabilityManifest.discovery,
    executionModel: agentCapabilityManifest.executionModel,
    recommendedWorkflow: agentCapabilityManifest.recommendedWorkflow,
  };
}
