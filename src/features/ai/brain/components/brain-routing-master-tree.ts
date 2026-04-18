import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

import {
  BRAIN_CAPABILITY_KEYS,
  getBrainCapabilityDefinition,
  type AiBrainCapabilityKey,
  type AiBrainFeature,
} from '../settings';

export type BrainRoutingFeatureConfig = {
  key: AiBrainFeature;
  label: string;
  description: string;
};

export type BrainRoutingCapabilityGroup = BrainRoutingFeatureConfig & {
  capabilities: AiBrainCapabilityKey[];
  allowsAgentFallback: boolean;
};

const BRAIN_ROUTING_FEATURE_NODE_PREFIX = 'brain-routing-feature:';
const BRAIN_ROUTING_CAPABILITY_NODE_PREFIX = 'brain-routing-capability:';
const BRAIN_ROUTING_FEATURE_NODE_KIND = 'brain-routing-feature';
const BRAIN_ROUTING_CAPABILITY_NODE_KIND = 'brain-routing-capability';
const BRAIN_ROUTING_SORT_GAP = 1000;

const encodeNodeSegment = (value: string): string => encodeURIComponent(value);
const decodeNodeSegment = (value: string): string => decodeURIComponent(value);

export const ROUTING_FEATURES: BrainRoutingFeatureConfig[] = [
  {
    key: 'cms_builder',
    label: 'CMS Builder',
    description: 'Theme/style generation and design assistants inside the CMS Builder.',
  },
  {
    key: 'prompt_engine',
    label: 'Prompt Engine',
    description: 'Validation learning and prompt tooling shared across the app.',
  },
  {
    key: 'ai_paths',
    label: 'AI Paths',
    description: 'Default model routing for AI Path model nodes and graph actions.',
  },
  {
    key: 'chatbot',
    label: 'Chatbot',
    description: 'Authoritative AI routing for Chatbot message execution.',
  },
  {
    key: 'kangur_ai_tutor',
    label: 'StudiQ AI Tutor',
    description: 'Tutor chat routing for StudiQ, managed directly through Brain.',
  },
  {
    key: 'kangur_social',
    label: 'Kangur Social',
    description: 'Social post generation for Kangur updates and release notes.',
  },
  {
    key: 'products',
    label: 'Products',
    description: 'Product description, translation, and validation AI execution.',
  },
  {
    key: 'image_studio',
    label: 'Image Studio',
    description: 'Image Studio generation, extraction, and analysis runtimes.',
  },
  {
    key: 'case_resolver',
    label: 'Case Resolver',
    description: 'OCR and document extraction routed through Brain.',
  },
  {
    key: 'agent_runtime',
    label: 'Agent Runtime',
    description: 'Planner, memory, and tool-routing model defaults for agent execution.',
  },
  {
    key: 'agent_teaching',
    label: 'Agent Teaching',
    description: 'Teaching chat and embedding model routing.',
  },
  {
    key: 'playwright',
    label: 'Playwright',
    description: 'AI model routing for Playwright step sequencer evaluation and live scripter probe suggestions.',
  },
];

export const ROUTING_GROUPS: BrainRoutingCapabilityGroup[] = ROUTING_FEATURES.map(
  (feature): BrainRoutingCapabilityGroup => {
    const capabilities = BRAIN_CAPABILITY_KEYS.filter(
      (capability) => getBrainCapabilityDefinition(capability).feature === feature.key
    );
    return {
      ...feature,
      capabilities,
      allowsAgentFallback: capabilities.some(
        (capability) => getBrainCapabilityDefinition(capability).policy === 'agent-or-model'
      ),
    };
  }
).filter((feature) => feature.capabilities.length > 0);

export const toBrainRoutingFeatureNodeId = (feature: AiBrainFeature): string =>
  `${BRAIN_ROUTING_FEATURE_NODE_PREFIX}${encodeNodeSegment(feature)}`;

export const fromBrainRoutingFeatureNodeId = (nodeId: string): AiBrainFeature | null => {
  if (!nodeId.startsWith(BRAIN_ROUTING_FEATURE_NODE_PREFIX)) return null;
  const rawFeature = nodeId.slice(BRAIN_ROUTING_FEATURE_NODE_PREFIX.length).trim();
  if (!rawFeature) return null;
  const feature = decodeNodeSegment(rawFeature);
  if (!feature) return null;
  return feature as AiBrainFeature;
};

export const toBrainRoutingCapabilityNodeId = (capability: AiBrainCapabilityKey): string =>
  `${BRAIN_ROUTING_CAPABILITY_NODE_PREFIX}${encodeNodeSegment(capability)}`;

export const fromBrainRoutingCapabilityNodeId = (nodeId: string): AiBrainCapabilityKey | null => {
  if (!nodeId.startsWith(BRAIN_ROUTING_CAPABILITY_NODE_PREFIX)) return null;
  const rawCapability = nodeId.slice(BRAIN_ROUTING_CAPABILITY_NODE_PREFIX.length).trim();
  if (!rawCapability) return null;
  const capability = decodeNodeSegment(rawCapability);
  if (!capability) return null;
  return capability as AiBrainCapabilityKey;
};

export function buildBrainRoutingMasterNodes(): MasterTreeNode[] {
  const nodes: MasterTreeNode[] = [];

  ROUTING_GROUPS.forEach((group, featureIndex) => {
    const featureNodeId = toBrainRoutingFeatureNodeId(group.key);

    nodes.push({
      id: featureNodeId,
      type: 'folder',
      kind: BRAIN_ROUTING_FEATURE_NODE_KIND,
      parentId: null,
      name: group.label,
      path: group.key,
      sortOrder: (featureIndex + 1) * BRAIN_ROUTING_SORT_GAP,
      metadata: {
        brainRoutingFeature: {
          key: group.key,
          label: group.label,
        },
      },
    });

    group.capabilities.forEach((capability, capabilityIndex) => {
      const definition = getBrainCapabilityDefinition(capability);

      nodes.push({
        id: toBrainRoutingCapabilityNodeId(capability),
        type: 'file',
        kind: BRAIN_ROUTING_CAPABILITY_NODE_KIND,
        parentId: featureNodeId,
        name: definition.label,
        path: `${group.key}/${capability}`,
        sortOrder: (capabilityIndex + 1) * BRAIN_ROUTING_SORT_GAP,
        metadata: {
          brainRoutingCapability: {
            capability,
            feature: group.key,
            label: definition.label,
          },
        },
      });
    });
  });

  return nodes;
}

export const createBrainRoutingFeatureNodeMap = (): Map<string, BrainRoutingCapabilityGroup> =>
  new Map(ROUTING_GROUPS.map((group) => [toBrainRoutingFeatureNodeId(group.key), group] as const));

export const createBrainRoutingCapabilityNodeMap = (): Map<string, AiBrainCapabilityKey> =>
  new Map(
    ROUTING_GROUPS.flatMap((group) =>
      group.capabilities.map(
        (capability) => [toBrainRoutingCapabilityNodeId(capability), capability] as const
      )
    )
  );
