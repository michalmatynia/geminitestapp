"use client";

/**
 * CanvasSidebarMigrated - Example of partial context migration.
 *
 * This demonstrates the migration pattern for larger components:
 * 1. State is read from contexts (useGraphState, useSelectionState, usePresetsState)
 * 2. Callbacks remain as props (for actions that involve multiple concerns)
 * 3. Props that duplicate context state are removed
 *
 * BEFORE: 17 props
 * ```tsx
 * <CanvasSidebar
 *   palette={palette}
 *   paletteCollapsed={paletteCollapsed}
 *   expandedPaletteGroups={expandedPaletteGroups}
 *   selectedNode={selectedNode}
 *   nodes={nodes}
 *   edges={edges}
 *   selectedEdgeId={selectedEdgeId}
 *   ... 10 more callback props
 * />
 * ```
 *
 * AFTER: 10 props (only callbacks)
 * ```tsx
 * <CanvasSidebarMigrated
 *   palette={palette}
 *   onTogglePaletteCollapsed={...}
 *   onTogglePaletteGroup={...}
 *   onDragStart={...}
 *   ... 7 more callback props
 * />
 * ```
 *
 * State props eliminated: selectedNode, nodes, edges, selectedEdgeId,
 *   paletteCollapsed, expandedPaletteGroups (6 props removed, 35% reduction)
 */

import { useMemo } from "react";
import { Button, Input, Label, SectionPanel } from "@/shared/ui";
import { useGraphState, useSelectionState, usePresetsState } from "../../context";
import type { AiNode, Edge, NodeDefinition } from "@/features/ai/ai-paths/lib";

// Reduced props - only palette and callbacks
type CanvasSidebarMigratedProps = {
  palette: NodeDefinition[];
  onTogglePaletteCollapsed: () => void;
  onTogglePaletteGroup: (group: string) => void;
  onDragStart: (event: React.DragEvent<HTMLDivElement>, node: NodeDefinition) => void;
  onSelectEdge: (edgeId: string | null) => void;
  onFireTrigger: (node: AiNode, event?: React.MouseEvent<HTMLButtonElement>) => void;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Available for future use
  onFireTriggerPersistent?: ((node: AiNode, event?: React.MouseEvent<HTMLButtonElement>) => void) | undefined;
  onOpenSimulation: (nodeId: string) => void;
  onUpdateSelectedNode: (patch: Partial<AiNode>, options?: { nodeId?: string }) => void;
  onOpenNodeConfig: () => void;
  onDeleteSelectedNode: () => void;
  onRemoveEdge: (edgeId: string) => void;
  onClearWires: () => void;
};

export function CanvasSidebarMigrated({
  palette,
  onTogglePaletteCollapsed,
  onTogglePaletteGroup,
  onDragStart,
  onSelectEdge,
  onFireTrigger,
  onFireTriggerPersistent: _onFireTriggerPersistent,
  onOpenSimulation,
  onUpdateSelectedNode,
  onOpenNodeConfig,
  onDeleteSelectedNode,
  onRemoveEdge,
  onClearWires,
}: CanvasSidebarMigratedProps): React.JSX.Element {
  // Note: _onFireTriggerPersistent is available but not shown in this simplified example
  void _onFireTriggerPersistent;
  // Read state from contexts instead of props
  const { nodes, edges } = useGraphState();
  const { selectedNodeId, selectedEdgeId } = useSelectionState();
  const { paletteCollapsed, expandedPaletteGroups } = usePresetsState();

  // Derive selectedNode from context state
  const selectedNode = useMemo<AiNode | null>(() => {
    if (!selectedNodeId) return null;
    return nodes.find((node) => node.id === selectedNodeId) ?? null;
  }, [nodes, selectedNodeId]);

  const selectedIsScheduledTrigger =
    selectedNode?.type === "trigger" && selectedNode.config?.trigger?.event === "scheduled_run";

  return (
    <div className="space-y-4">
      {/* Node Palette Section */}
      <SectionPanel variant="subtle" className="p-4" data-edge-panel>
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-white">Node Palette</span>
          <button
            type="button"
            className="rounded border px-2 py-1 text-[10px] text-gray-300 hover:bg-muted/60"
            onClick={onTogglePaletteCollapsed}
          >
            {paletteCollapsed ? "Expand" : "Collapse"}
          </button>
        </div>

        {paletteCollapsed ? (
          <div className="rounded-md border border-dashed border-border/60 px-3 py-2 text-[11px] text-gray-500">
            Palette collapsed. Expand to add nodes.
          </div>
        ) : (
          <PaletteGroups
            palette={palette}
            expandedPaletteGroups={expandedPaletteGroups}
            onTogglePaletteGroup={onTogglePaletteGroup}
            onDragStart={onDragStart}
          />
        )}
      </SectionPanel>

      {/* Inspector Section (when no edge selected) */}
      {!selectedEdgeId && (
        <SectionPanel variant="subtle" className="p-4">
          <div className="mb-3 text-sm font-semibold text-white">Inspector</div>
          {selectedNode ? (
            <NodeInspector
              selectedNode={selectedNode}
              selectedIsScheduledTrigger={selectedIsScheduledTrigger}
              onFireTrigger={onFireTrigger}
              onOpenSimulation={onOpenSimulation}
              onUpdateSelectedNode={onUpdateSelectedNode}
              onOpenNodeConfig={onOpenNodeConfig}
              onDeleteSelectedNode={onDeleteSelectedNode}
            />
          ) : (
            <div className="text-xs text-gray-500">
              Select a node to inspect inputs, outputs, and configuration.
            </div>
          )}
        </SectionPanel>
      )}

      {/* Connections Section */}
      <SectionPanel variant="subtle" className="p-4">
        <div className="mb-3 text-sm font-semibold text-white">Connections</div>
        <ConnectionsPanel
          nodes={nodes}
          edges={edges}
          selectedEdgeId={selectedEdgeId}
          onSelectEdge={onSelectEdge}
          onRemoveEdge={onRemoveEdge}
          onClearWires={onClearWires}
        />
      </SectionPanel>
    </div>
  );
}

// Sub-components (would be in separate files in production)

function PaletteGroups({
  palette,
  expandedPaletteGroups,
  onTogglePaletteGroup,
  onDragStart,
}: {
  palette: NodeDefinition[];
  expandedPaletteGroups: Set<string>;
  onTogglePaletteGroup: (group: string) => void;
  onDragStart: (event: React.DragEvent<HTMLDivElement>, node: NodeDefinition) => void;
}): React.JSX.Element {
  const groups = [
    { title: "Triggers", types: ["trigger"], icon: "⚡" },
    { title: "Simulation", types: ["simulation"], icon: "🧪" },
    // ... rest of groups
  ];

  return (
    <div className="max-h-[520px] space-y-1 overflow-y-auto pr-1">
      {groups.map((group) => {
        const items = palette.filter((node) => group.types.includes(node.type));
        if (items.length === 0) return null;
        const isExpanded = expandedPaletteGroups.has(group.title);

        return (
          <div key={group.title} className="rounded-md border border-border/60">
            <button
              type="button"
              onClick={() => onTogglePaletteGroup(group.title)}
              className="flex w-full items-center justify-between px-3 py-2 text-left"
            >
              <span className="text-[11px] font-medium uppercase">{group.title}</span>
            </button>
            {isExpanded && (
              <div className="space-y-2 px-3 pb-3">
                {items.map((node) => (
                  <div
                    key={node.title}
                    draggable
                    onDragStart={(e) => onDragStart(e, node)}
                    className="cursor-grab rounded border p-2 text-xs"
                  >
                    {node.title}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function NodeInspector({
  selectedNode,
  selectedIsScheduledTrigger,
  onFireTrigger,
  onOpenSimulation,
  onUpdateSelectedNode,
  onOpenNodeConfig,
  onDeleteSelectedNode,
}: {
  selectedNode: AiNode;
  selectedIsScheduledTrigger: boolean;
  onFireTrigger: (node: AiNode, event?: React.MouseEvent<HTMLButtonElement>) => void;
  onOpenSimulation: (nodeId: string) => void;
  onUpdateSelectedNode: (patch: Partial<AiNode>) => void;
  onOpenNodeConfig: () => void;
  onDeleteSelectedNode: () => void;
}): React.JSX.Element {
  return (
    <div className="space-y-3 text-xs text-gray-300">
      <div className="text-[10px] uppercase text-gray-500">
        Type: {selectedNode.type}
        {selectedIsScheduledTrigger && " (Scheduled)"}
      </div>

      {selectedNode.type === "trigger" && (
        <Button
          className="w-full text-xs"
          onClick={(e) => onFireTrigger(selectedNode, e)}
        >
          Fire Trigger
        </Button>
      )}

      {selectedNode.type === "simulation" && (
        <Button
          className="w-full text-xs"
          onClick={() => onOpenSimulation(selectedNode.id)}
        >
          Open Simulation
        </Button>
      )}

      <div>
        <Label className="text-[10px] uppercase text-gray-500">Title</Label>
        <Input
          className="mt-2 w-full text-xs"
          value={selectedNode.title}
          onChange={(e) => onUpdateSelectedNode({ title: e.target.value })}
        />
      </div>

      <Button className="w-full text-xs" onClick={onOpenNodeConfig}>
        Open Node Config
      </Button>

      <Button
        className="w-full text-xs text-rose-200"
        onClick={onDeleteSelectedNode}
      >
        Remove Node
      </Button>
    </div>
  );
}

function ConnectionsPanel({
  nodes,
  edges,
  selectedEdgeId,
  onSelectEdge,
  onRemoveEdge,
  onClearWires,
}: {
  nodes: AiNode[];
  edges: Edge[];
  selectedEdgeId: string | null;
  onSelectEdge: (edgeId: string | null) => void;
  onRemoveEdge: (edgeId: string) => void;
  onClearWires: () => void;
}): React.JSX.Element {
  return (
    <div className="space-y-2 text-xs text-gray-400">
      <div>Active wires: {edges.length}</div>

      {selectedEdgeId && (
        <SelectedEdgeInfo
          edges={edges}
          nodes={nodes}
          selectedEdgeId={selectedEdgeId}
          onSelectEdge={onSelectEdge}
          onRemoveEdge={onRemoveEdge}
        />
      )}

      <Button
        className="w-full text-xs text-rose-200"
        onClick={onClearWires}
      >
        Clear All Wires
      </Button>
    </div>
  );
}

function SelectedEdgeInfo({
  edges,
  nodes,
  selectedEdgeId,
  onSelectEdge,
  onRemoveEdge,
}: {
  edges: Edge[];
  nodes: AiNode[];
  selectedEdgeId: string;
  onSelectEdge: (edgeId: string | null) => void;
  onRemoveEdge: (edgeId: string) => void;
}): React.JSX.Element | null {
  const selectedEdge = edges.find((e) => e.id === selectedEdgeId);
  if (!selectedEdge) return null;

  const fromNode = nodes.find((n) => n.id === selectedEdge.from);
  const toNode = nodes.find((n) => n.id === selectedEdge.to);

  return (
    <div className="rounded border p-3">
      <div className="text-xs font-medium">Selected Wire</div>
      <div className="mt-2 text-[11px]">
        {fromNode?.title ?? selectedEdge.from} → {toNode?.title ?? selectedEdge.to}
      </div>
      <div className="mt-2 flex gap-2">
        <Button
          className="flex-1 text-xs"
          onClick={() => onSelectEdge(null)}
        >
          Deselect
        </Button>
        <Button
          className="flex-1 text-xs text-rose-200"
          onClick={() => onRemoveEdge(selectedEdgeId)}
        >
          Remove
        </Button>
      </div>
    </div>
  );
}
