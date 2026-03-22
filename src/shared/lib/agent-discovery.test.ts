import { describe, expect, it } from 'vitest';

import { agentCapabilityManifest } from './agent-capability-manifest';
import {
  getAgentApprovalGate,
  getAgentDiscoverySummary,
  getAgentResource,
  listAgentApprovalGates,
  listAgentCapabilities,
  listAgentResources,
} from './agent-discovery';

describe('agent-discovery', () => {
  it('filters resources by mode, lease requirement, and trimmed resource type', () => {
    expect(
      listAgentResources({
        mode: 'partitioned',
        requiresLease: true,
        resourceType: ' runtime ',
      }),
    ).toEqual([
      expect.objectContaining({
        resourceId: 'testing.playwright.runtime-broker',
      }),
    ]);
  });

  it('ignores invalid mode and still applies the remaining filters', () => {
    expect(
      listAgentResources({
        mode: 'not-a-real-mode',
        requiresLease: false,
      }).map((resource) => resource.resourceId),
    ).toEqual(['ai-paths.run.queue', 'repository.forward-only-mutation']);
  });

  it('returns resources and approval gates by id, or null when missing', () => {
    expect(getAgentResource('integrations.base-import.run')).toEqual(
      expect.objectContaining({
        name: 'Base import run lease',
      }),
    );
    expect(getAgentResource('missing-resource')).toBeNull();

    expect(getAgentApprovalGate('secret-access')).toEqual(
      expect.objectContaining({
        name: 'Secret and credential access',
      }),
    );
    expect(getAgentApprovalGate('missing-gate')).toBeNull();
  });

  it('filters approval gates case-insensitively using trimmed partial matches', () => {
    expect(
      listAgentApprovalGates({
        requiredFor: '  credential  ',
      }).map((gate) => gate.id),
    ).toEqual(['secret-access']);
  });

  it('filters capabilities by effect and trimmed resource id while ignoring invalid effects', () => {
    expect(
      listAgentCapabilities({
        effect: 'leased_mutation',
        resourceId: ' ai-paths.run.execution ',
      }).map((capability) => capability.id),
    ).toEqual(['shared-lease-service']);

    expect(
      listAgentCapabilities({
        effect: 'invalid-effect',
        resourceId: 'integrations.base-import.run',
      }).map((capability) => capability.id),
    ).toEqual(['shared-lease-service', 'base-import-run-leasing']);
  });

  it('returns the manifest discovery summary fields unchanged', () => {
    expect(getAgentDiscoverySummary()).toEqual({
      discovery: agentCapabilityManifest.discovery,
      executionModel: agentCapabilityManifest.executionModel,
      recommendedWorkflow: agentCapabilityManifest.recommendedWorkflow,
    });
  });
});
