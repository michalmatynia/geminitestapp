'use client';

import React, { useCallback, useMemo } from 'react';

import {
  FolderTreeViewportV2,
  useMasterFolderTreeShell,
  type FolderTreeViewportRenderNodeInput,
} from '@/features/foldertree/v2';

import { getBrainCapabilityDefinition } from '../settings';
import type {
  AiBrainAssignment,
  AiBrainCapabilityKey,
  AiBrainSettings,
} from '../settings';
import { BrainRoutingCapabilityNodeItem } from './BrainRoutingCapabilityNodeItem';
import { BrainRoutingFeatureNodeItem } from './BrainRoutingFeatureNodeItem';
import {
  buildBrainRoutingMasterNodes,
  createBrainRoutingCapabilityNodeMap,
  createBrainRoutingFeatureNodeMap,
  ROUTING_GROUPS,
  toBrainRoutingFeatureNodeId,
} from './brain-routing-master-tree';

export interface BrainRoutingTreeProps {
  settings: AiBrainSettings;
  effectiveCapabilityAssignments: Record<AiBrainCapabilityKey, AiBrainAssignment>;
  onToggleEnabled: (capability: AiBrainCapabilityKey, enabled: boolean) => void;
  onEdit: (capability: AiBrainCapabilityKey) => void;
  isPending?: boolean;
}

export function BrainRoutingTree({
  settings,
  effectiveCapabilityAssignments,
  onToggleEnabled,
  onEdit,
  isPending = false,
}: BrainRoutingTreeProps): React.JSX.Element {
  const masterNodes = useMemo(() => buildBrainRoutingMasterNodes(), []);
  const featureByNodeId = useMemo(() => createBrainRoutingFeatureNodeMap(), []);
  const capabilityByNodeId = useMemo(() => createBrainRoutingCapabilityNodeMap(), []);
  const initialExpandedNodeIds = useMemo(
    () => ROUTING_GROUPS.map((group) => toBrainRoutingFeatureNodeId(group.key)),
    []
  );

  const {
    appearance: { rootDropUi },
    controller,
    viewport: { scrollToNodeRef },
  } = useMasterFolderTreeShell({
    instance: 'brain_routing_tree',
    nodes: masterNodes,
    initiallyExpandedNodeIds: initialExpandedNodeIds,
  });

  const renderNode = useCallback(
    (input: FolderTreeViewportRenderNodeInput): React.ReactNode => {
      const featureGroup = featureByNodeId.get(input.node.id);
      if (featureGroup) {
        return (
          <BrainRoutingFeatureNodeItem
            node={input.node}
            group={featureGroup}
            depth={input.depth}
            hasChildren={input.hasChildren}
            isExpanded={input.isExpanded}
            isSelected={input.isSelected}
            isDragging={input.isDragging}
            select={input.select}
            toggleExpand={input.toggleExpand}
          />
        );
      }

      const capability = capabilityByNodeId.get(input.node.id);
      if (!capability) return null;

      const definition = getBrainCapabilityDefinition(capability);
      const capabilityOverrideEnabled = Boolean(settings.capabilities[capability]);
      const assignment = capabilityOverrideEnabled
        ? (settings.capabilities[capability] ?? effectiveCapabilityAssignments[capability])
        : effectiveCapabilityAssignments[capability];
      const sourceLabel = capabilityOverrideEnabled
        ? 'Capability override'
        : settings.assignments[definition.feature]
          ? 'Feature fallback'
          : 'Global defaults';

      return (
        <BrainRoutingCapabilityNodeItem
          node={input.node}
          capability={capability}
          depth={input.depth}
          isSelected={input.isSelected}
          isDragging={input.isDragging}
          select={input.select}
          enabled={assignment.enabled}
          sourceLabel={sourceLabel}
          onToggleEnabled={(enabled: boolean) => onToggleEnabled(capability, enabled)}
          onEdit={() => onEdit(capability)}
          isPending={isPending}
        />
      );
    },
    [capabilityByNodeId, effectiveCapabilityAssignments, featureByNodeId, isPending, onEdit, onToggleEnabled, settings.assignments, settings.capabilities]
  );

  return (
    <FolderTreeViewportV2
      controller={controller}
      scrollToNodeRef={scrollToNodeRef}
      rootDropUi={rootDropUi}
      renderNode={renderNode}
      enableDnd={false}
      emptyLabel='No routing capabilities'
    />
  );
}
