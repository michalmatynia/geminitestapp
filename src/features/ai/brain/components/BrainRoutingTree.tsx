/**
 * Brain Routing Tree Component
 * 
 * Manages the hierarchical routing and capability mapping for the AI Brain.
 * Provides a specialized view that combines feature-based grouping with
 * individual AI capability assignments.
 * 
 * Features:
 * - Hierarchical Visualization: Displays Brain features grouped by domain,
 *   with drill-down capabilities for specific features and model assignments.
 * - Interaction: Provides toggles for enabling/disabling capabilities and
 *   hooks for editing assignment details.
 * - Contextual State: Uses `BrainRoutingProvider` to synchronize routing settings
 *   across the AI configuration workspace.
 * 
 * Usage:
 * Embedded in the main AI Brain management page to allow admins to define
 * complex routing logic across different system capabilities.
 */

'use client';

import React, { useCallback, useMemo } from 'react';

import {
  MasterFolderTreeViewport,
  useMasterFolderTreeViewModel,
  type FolderTreeViewportRenderNodeInput,
} from '@/shared/lib/foldertree/public';
import { internalError } from '@/shared/errors/app-error';

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
  type BrainRoutingCapabilityNodeItemProps,
} from './BrainRoutingCapabilityNodeItem';
import {
  useOptionalBrainRoutingActionsContext,
  useOptionalBrainRoutingStateContext,
} from './BrainRoutingContext';
import { BrainRoutingFeatureNodeItem } from './BrainRoutingFeatureNodeItem';

import { getBrainCapabilityDefinition } from '../settings';
import type { AiBrainAssignment, AiBrainCapabilityKey, AiBrainSettings } from '../settings';
import type { AiBrainFeature } from '../settings';

const hasAssignmentApiKeyOverride = (assignment: AiBrainAssignment): boolean =>
  typeof assignment.apiKey === 'string' && assignment.apiKey.trim().length > 0;

/** Props for the BrainRoutingTree component. */
export interface BrainRoutingTreeProps {
  /** Global AI Brain settings. */
  settings?: AiBrainSettings;
  /** Effective assignment state for features. */
  effectiveAssignments?: Record<AiBrainFeature, AiBrainAssignment>;
  /** Effective assignment state for specific capabilities. */
  effectiveCapabilityAssignments?: Record<AiBrainCapabilityKey, AiBrainAssignment>;
  /** Callback for toggling feature-level activation. */
  onToggleFeatureEnabled?: (feature: AiBrainFeature, enabled: boolean) => void;
  /** Callback for toggling capability-level activation. */
  onToggleEnabled?: (capability: AiBrainCapabilityKey, enabled: boolean) => void;
  /** Callback to trigger editing for a specific capability. */
  onEdit?: (capability: AiBrainCapabilityKey) => void;
  /** UI pending state indicator. */
  isPending?: boolean;
}

type RoutingStateContext = ReturnType<typeof useOptionalBrainRoutingStateContext>;
type RoutingActionsContext = ReturnType<typeof useOptionalBrainRoutingActionsContext>;

/** Resolved set of properties required for routing tree operations. */
type ResolvedBrainRoutingTreeProps = Required<
  Pick<
    BrainRoutingTreeProps,
    | 'effectiveAssignments'
    | 'effectiveCapabilityAssignments'
    | 'onEdit'
    | 'onToggleEnabled'
    | 'onToggleFeatureEnabled'
    | 'settings'
  >
> & {
  isPending: boolean;
};

/** Arguments for node rendering functions. */
type BrainRoutingNodeRendererProps = {
  capabilityByNodeId: Map<string, AiBrainCapabilityKey>;
  featureByNodeId: Map<string, (typeof ROUTING_GROUPS)[number]>;
  input: FolderTreeViewportRenderNodeInput;
  runtime: ResolvedBrainRoutingTreeProps;
};

const missingRoutingTreeContextError = (): never => {
  throw internalError(
    'BrainRoutingTree must be used within BrainRoutingProvider or receive explicit routing props'
  );
};

const requireRoutingValue = <T,>(value: T | undefined): T =>
  value ?? missingRoutingTreeContextError();

const resolveRoutingSettings = (
  props: BrainRoutingTreeProps,
  stateContext: RoutingStateContext
): AiBrainSettings => requireRoutingValue(props.settings ?? stateContext?.settings);

const resolveEffectiveAssignments = (
  props: BrainRoutingTreeProps,
  stateContext: RoutingStateContext
): Record<AiBrainFeature, AiBrainAssignment> =>
  requireRoutingValue(props.effectiveAssignments ?? stateContext?.effectiveAssignments);

const resolveEffectiveCapabilityAssignments = (
  props: BrainRoutingTreeProps,
  stateContext: RoutingStateContext
): Record<AiBrainCapabilityKey, AiBrainAssignment> =>
  requireRoutingValue(
    props.effectiveCapabilityAssignments ?? stateContext?.effectiveCapabilityAssignments
  );
const resolveToggleFeatureEnabled = (
  props: BrainRoutingTreeProps,
  actionsContext: RoutingActionsContext
): (feature: AiBrainFeature, enabled: boolean) => void =>
  requireRoutingValue(props.onToggleFeatureEnabled ?? actionsContext?.onToggleFeatureEnabled);

const resolveToggleEnabled = (
  props: BrainRoutingTreeProps,
  actionsContext: RoutingActionsContext
): (capability: AiBrainCapabilityKey, enabled: boolean) => void =>
  requireRoutingValue(props.onToggleEnabled ?? actionsContext?.onToggleEnabled);

const resolveEditRoute = (
  props: BrainRoutingTreeProps,
  actionsContext: RoutingActionsContext
): (capability: AiBrainCapabilityKey) => void =>
  requireRoutingValue(props.onEdit ?? actionsContext?.onEdit);

const resolveRoutingRuntime = (
  props: BrainRoutingTreeProps,
  stateContext: RoutingStateContext,
  actionsContext: RoutingActionsContext
): ResolvedBrainRoutingTreeProps => ({
  settings: resolveRoutingSettings(props, stateContext),
  effectiveAssignments: resolveEffectiveAssignments(props, stateContext),
  effectiveCapabilityAssignments: resolveEffectiveCapabilityAssignments(props, stateContext),
  onToggleFeatureEnabled: resolveToggleFeatureEnabled(props, actionsContext),
  onToggleEnabled: resolveToggleEnabled(props, actionsContext),
  onEdit: resolveEditRoute(props, actionsContext),
  isPending: props.isPending ?? stateContext?.isPending ?? false,
});

const resolveCapabilityAssignment = (
  runtime: ResolvedBrainRoutingTreeProps,
  capability: AiBrainCapabilityKey
): AiBrainAssignment => {
  const override = runtime.settings.capabilities[capability];
  return override ?? runtime.effectiveCapabilityAssignments[capability];
};

const resolveRouteSourceLabel = (
  runtime: ResolvedBrainRoutingTreeProps,
  capability: AiBrainCapabilityKey
): BrainRoutingCapabilityNodeItemProps['sourceLabel'] => {
  const definition = getBrainCapabilityDefinition(capability);
  if (!runtime.effectiveAssignments[definition.feature].enabled) return 'Feature disabled';
  if (runtime.settings.capabilities[capability] !== undefined) return 'Capability override';
  if (runtime.settings.assignments[definition.feature] !== undefined) return 'Feature fallback';
  return 'Global defaults';
};

function BrainRoutingNodeRenderer(props: BrainRoutingNodeRendererProps): React.JSX.Element | null {
  const { capabilityByNodeId, featureByNodeId, input, runtime } = props;
  const featureGroup = featureByNodeId.get(input.node.id);
  if (featureGroup !== undefined) {
    return (
      <BrainRoutingFeatureNodeItemRenderer featureGroup={featureGroup} input={input} runtime={runtime} />
    );
  }
  const capability = capabilityByNodeId.get(input.node.id);
  if (capability === undefined) return null;
  return (
    <BrainRoutingCapabilityNodeRenderer capability={capability} input={input} runtime={runtime} />
  );
}

function BrainRoutingFeatureNodeItemRenderer(props: {
  featureGroup: (typeof ROUTING_GROUPS)[number];
  input: FolderTreeViewportRenderNodeInput;
  runtime: ResolvedBrainRoutingTreeProps;
}): React.JSX.Element {
  const { featureGroup, input, runtime } = props;
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
      enabled={runtime.effectiveAssignments[featureGroup.key].enabled}
      isPending={runtime.isPending}
      onToggleEnabled={runtime.onToggleFeatureEnabled}
    />
  );
}

function BrainRoutingCapabilityNodeRenderer(props: {
  capability: AiBrainCapabilityKey;
  input: FolderTreeViewportRenderNodeInput;
  runtime: ResolvedBrainRoutingTreeProps;
}): React.JSX.Element {
  const { capability, input, runtime } = props;
  const definition = getBrainCapabilityDefinition(capability);
  const featureEnabled = runtime.effectiveAssignments[definition.feature].enabled;
  const assignment = resolveCapabilityAssignment(runtime, capability);
  return (
    <BrainRoutingCapabilityNodeItem
      node={input.node}
      capability={capability}
      depth={input.depth}
      isSelected={input.isSelected}
      isDragging={input.isDragging}
      select={input.select}
      enabled={featureEnabled ? assignment.enabled : false}
      sourceLabel={resolveRouteSourceLabel(runtime, capability)}
      hasApiKeyOverride={hasAssignmentApiKeyOverride(assignment)}
      toggleDisabled={!featureEnabled}
    />
  );
}

export function BrainRoutingTree(props: BrainRoutingTreeProps): React.JSX.Element {
  const stateContext = useOptionalBrainRoutingStateContext();
  const actionsContext = useOptionalBrainRoutingActionsContext();
  const runtime = resolveRoutingRuntime(props, stateContext, actionsContext);

  const masterNodes = useMemo(() => buildBrainRoutingMasterNodes(), []);
  const featureByNodeId = useMemo(() => createBrainRoutingFeatureNodeMap(), []);
  const capabilityByNodeId = useMemo(() => createBrainRoutingCapabilityNodeMap(), []);
  const initialExpandedNodeIds = useMemo(
    () => ROUTING_GROUPS.map((group) => toBrainRoutingFeatureNodeId(group.key)),
    []
  );

  const tree = useMasterFolderTreeViewModel({
    instance: 'brain_routing_tree',
    nodes: masterNodes,
    initiallyExpandedNodeIds: initialExpandedNodeIds,
  });

  const renderNode = useCallback(
    (input: FolderTreeViewportRenderNodeInput): React.ReactNode => (
      <BrainRoutingNodeRenderer
        capabilityByNodeId={capabilityByNodeId}
        featureByNodeId={featureByNodeId}
        input={input}
        runtime={runtime}
      />
    ),
    [capabilityByNodeId, featureByNodeId, runtime]
  );

  const capabilityNodeRuntimeValue = useMemo(
    () => ({
      onToggleEnabled: runtime.onToggleEnabled,
      onEdit: runtime.onEdit,
      isPending: runtime.isPending,
    }),
    [runtime.isPending, runtime.onEdit, runtime.onToggleEnabled]
  );

  return (
    <BrainRoutingCapabilityNodeItemRuntimeContext.Provider value={capabilityNodeRuntimeValue}>
      <MasterFolderTreeViewport
        tree={tree}
        renderNode={renderNode}
        enableDnd={false}
        emptyLabel='No routing capabilities'
      />
    </BrainRoutingCapabilityNodeItemRuntimeContext.Provider>
  );
}
