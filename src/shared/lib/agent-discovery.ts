import { agentCapabilityManifest } from './agent-capability-manifest';
import {
  AgentCapabilityEffectSchema,
  AgentLeaseModeSchema,
} from '../contracts/agent-capabilities';

type ListAgentResourcesOptions = {
  mode?: string | null;
  requiresLease?: boolean;
  resourceType?: string | null;
};

type ListAgentCapabilitiesOptions = {
  effect?: string | null;
  resourceId?: string | null;
};

type ListApprovalGatesOptions = {
  requiredFor?: string | null;
};

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

export function getAgentResource(resourceId: string) {
  return (
    agentCapabilityManifest.resources.find(
      (resource) => resource.resourceId === resourceId,
    ) ?? null
  );
}

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

export function getAgentApprovalGate(gateId: string) {
  return (
    agentCapabilityManifest.approvalGates.find((gate) => gate.id === gateId) ??
    null
  );
}

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

export function getAgentDiscoverySummary() {
  return {
    discovery: agentCapabilityManifest.discovery,
    executionModel: agentCapabilityManifest.executionModel,
    recommendedWorkflow: agentCapabilityManifest.recommendedWorkflow,
  };
}
