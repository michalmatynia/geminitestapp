import { describe, expect, it } from 'vitest';

import {
  buildBrainRoutingMasterNodes,
  createBrainRoutingCapabilityNodeMap,
  createBrainRoutingFeatureNodeMap,
  fromBrainRoutingCapabilityNodeId,
  fromBrainRoutingFeatureNodeId,
  ROUTING_GROUPS,
  toBrainRoutingCapabilityNodeId,
  toBrainRoutingFeatureNodeId,
} from '@/shared/lib/ai-brain/components/brain-routing-master-tree';

describe('brain routing master tree mapping', () => {
  it('maps feature groups to root folder nodes and capabilities to child file nodes', () => {
    const nodes = buildBrainRoutingMasterNodes();
    const featureNodes = nodes.filter((node) => node.type === 'folder');
    const capabilityNodes = nodes.filter((node) => node.type === 'file');
    const expectedCapabilityCount = ROUTING_GROUPS.reduce(
      (count, group) => count + group.capabilities.length,
      0
    );

    expect(featureNodes).toHaveLength(ROUTING_GROUPS.length);
    expect(capabilityNodes).toHaveLength(expectedCapabilityCount);
    expect(featureNodes.every((node) => node.parentId === null)).toBe(true);
    expect(capabilityNodes.every((node) => node.parentId !== null)).toBe(true);
  });

  it('keeps deterministic feature and capability node order', () => {
    const nodes = buildBrainRoutingMasterNodes();
    const firstFeature = ROUTING_GROUPS[0];
    const firstCapability = firstFeature?.capabilities[0];
    expect(nodes[0]?.id).toBe(firstFeature ? toBrainRoutingFeatureNodeId(firstFeature.key) : null);
    expect(nodes[1]?.id).toBe(
      firstCapability ? toBrainRoutingCapabilityNodeId(firstCapability) : null
    );
  });

  it('encodes and decodes feature and capability node ids', () => {
    const firstFeature = ROUTING_GROUPS[0];
    const firstCapability = firstFeature?.capabilities[0];
    expect(firstFeature).toBeTruthy();
    expect(firstCapability).toBeTruthy();

    const featureNodeId = toBrainRoutingFeatureNodeId(firstFeature!.key);
    const capabilityNodeId = toBrainRoutingCapabilityNodeId(firstCapability!);

    expect(fromBrainRoutingFeatureNodeId(featureNodeId)).toBe(firstFeature!.key);
    expect(fromBrainRoutingCapabilityNodeId(capabilityNodeId)).toBe(firstCapability!);
  });

  it('builds node lookup maps', () => {
    const featureMap = createBrainRoutingFeatureNodeMap();
    const capabilityMap = createBrainRoutingCapabilityNodeMap();
    const firstFeature = ROUTING_GROUPS[0];
    const firstCapability = firstFeature?.capabilities[0];

    expect(featureMap.get(toBrainRoutingFeatureNodeId(firstFeature!.key))?.key).toBe(
      firstFeature!.key
    );
    expect(capabilityMap.get(toBrainRoutingCapabilityNodeId(firstCapability!))).toBe(
      firstCapability!
    );
  });
});
