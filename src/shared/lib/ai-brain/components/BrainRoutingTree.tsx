'use client';

import React, { useCallback, useMemo } from 'react';

import {
  FolderTreeViewportV2,
  useMasterFolderTreeShell,
  type FolderTreeViewportRenderNodeInput,
} from '@/features/foldertree/v2';
import { internalError } from '@/shared/errors/app-error';

import { getBrainCapabilityDefinition } from '../settings';
import {
  buildBrainRoutingMasterNodes,
  createBrainRoutingCapabilityNodeMap,
  createBrainRoutingFeatureNodeMap,
  ROUTING_GROUPS,
  toBrainRoutingFeatureNodeId,
} from './brain-routing-master-tree';
import {
  BrainRoutingCapabilityNodeItem,
  BrainRoutingCapabilityNodeItemRuntimeContext,
} from './BrainRoutingCapabilityNodeItem';
import {
  useOptionalBrainRoutingActionsContext,
  useOptionalBrainRoutingStateContext,
} from './BrainRoutingContext';
import { BrainRoutingFeatureNodeItem } from './BrainRoutingFeatureNodeItem';

import type { AiBrainAssignment, AiBrainCapabilityKey, AiBrainSettings } from '../settings';

export interface BrainRoutingTreeProps {
  settings?: AiBrainSettings;
  effectiveCapabilityAssignments?: Record<AiBrainCapabilityKey, AiBrainAssignment>;
  onToggleEnabled?: (capability: AiBrainCapabilityKey, enabled: boolean) => void;
  onEdit?: (capability: AiBrainCapabilityKey) => void;
  isPending?: boolean;
}

export function BrainRoutingTree(props: BrainRoutingTreeProps): React.JSX.Element {
  const stateContext = useOptionalBrainRoutingStateContext();
  const actionsContext = useOptionalBrainRoutingActionsContext();

  const settings = props.settings ?? stateContext?.settings;
  const effectiveCapabilityAssignments =
    props.effectiveCapabilityAssignments ?? stateContext?.effectiveCapabilityAssignments;
  const onToggleEnabled = props.onToggleEnabled ?? actionsContext?.onToggleEnabled;
  const onEdit = props.onEdit ?? actionsContext?.onEdit;
  const isPending = props.isPending ?? stateContext?.isPending ?? false;

  if (!settings || !effectiveCapabilityAssignments || !onToggleEnabled || !onEdit) {
    throw internalError(
      'BrainRoutingTree must be used within BrainRoutingProvider or receive explicit routing props'
    );
  }

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
        />
      );
    },
    [
      capabilityByNodeId,
      effectiveCapabilityAssignments,
      featureByNodeId,
      isPending,
      onEdit,
      onToggleEnabled,
      settings.assignments,
      settings.capabilities,
    ]
  );
  const capabilityNodeRuntimeValue = useMemo(
    () => ({
      onToggleEnabled,
      onEdit,
      isPending,
    }),
    [isPending, onEdit, onToggleEnabled]
  );

  return (
    <BrainRoutingCapabilityNodeItemRuntimeContext.Provider value={capabilityNodeRuntimeValue}>
      <FolderTreeViewportV2
        controller={controller}
        scrollToNodeRef={scrollToNodeRef}
        rootDropUi={rootDropUi}
        renderNode={renderNode}
        enableDnd={false}
        emptyLabel='No routing capabilities'
      />
    </BrainRoutingCapabilityNodeItemRuntimeContext.Provider>
  );
}
