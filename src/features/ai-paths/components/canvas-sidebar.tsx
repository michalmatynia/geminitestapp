import React from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import type { AiNode, Edge, NodeDefinition } from "@/features/ai-paths/lib";
import { createParserMappings } from "@/features/ai-paths/lib";
import { formatPlaceholderLabel, formatPortLabel } from "../utils/ui-utils";

type CanvasSidebarProps = {
  palette: NodeDefinition[];
  paletteCollapsed: boolean;
  onTogglePaletteCollapsed: () => void;
  expandedPaletteGroups: Set<string>;
  onTogglePaletteGroup: (group: string) => void;
  onDragStart: (event: React.DragEvent<HTMLDivElement>, node: NodeDefinition) => void;
  selectedNode: AiNode | null;
  nodes: AiNode[];
  edges: Edge[];
  selectedEdgeId: string | null;
  onSelectEdge: (edgeId: string | null) => void;
  onFireTrigger: (node: AiNode, event?: React.MouseEvent<HTMLButtonElement>) => void;
  onOpenSimulation: (nodeId: string) => void;
  onUpdateSelectedNode: (patch: Partial<AiNode>) => void;
  onOpenNodeConfig: () => void;
  onDeleteSelectedNode: () => void;
  onRemoveEdge: (edgeId: string) => void;
  onClearWires: () => void;
};

export function CanvasSidebar({
  palette,
  paletteCollapsed,
  onTogglePaletteCollapsed,
  expandedPaletteGroups,
  onTogglePaletteGroup,
  onDragStart,
  selectedNode,
  nodes,
  edges,
  selectedEdgeId,
  onSelectEdge,
  onFireTrigger,
  onOpenSimulation,
  onUpdateSelectedNode,
  onOpenNodeConfig,
  onDeleteSelectedNode,
  onRemoveEdge,
  onClearWires,
}: CanvasSidebarProps) {
  return (
    <div className="space-y-4">
      <div
        className="rounded-lg border border-gray-800 bg-gray-950/60 p-4"
        data-edge-panel
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-white">Node Palette</span>
          <button
            type="button"
            className="rounded border border-gray-700 px-2 py-1 text-[10px] text-gray-300 hover:bg-gray-900/70"
            onClick={onTogglePaletteCollapsed}
          >
            {paletteCollapsed ? "Expand" : "Collapse"}
          </button>
        </div>
        {paletteCollapsed ? (
          <div className="rounded-md border border-dashed border-gray-800/80 px-3 py-2 text-[11px] text-gray-500">
            Palette collapsed. Expand to add nodes.
          </div>
        ) : (
          <div className="max-h-[520px] space-y-1 overflow-y-auto pr-1">
            {[
              { title: "Triggers", types: ["trigger"], icon: "⚡" },
              { title: "Simulation", types: ["simulation"], icon: "🧪" },
              { title: "Context + Parsing", types: ["context", "parser"], icon: "📦" },
              { title: "Transforms", types: ["mapper", "mutator", "validator"], icon: "🧭" },
              {
                title: "Signals + Logic",
                types: ["constant", "math", "compare", "gate", "router", "delay", "poll"],
                icon: "🧪",
              },
              { title: "Bundles + Templates", types: ["bundle", "template"], icon: "🧩" },
              { title: "IO + Fetch", types: ["http", "database", "db_schema"], icon: "🌐" },
              {
                title: "Prompts + Models",
                types: ["prompt", "model", "ai_description"],
                icon: "🤖",
              },
              { title: "Description", types: ["description_updater"], icon: "✍️" },
              { title: "Viewers", types: ["viewer", "notification"], icon: "👁" },
            ].map((group) => {
              const items = palette.filter((node) => group.types.includes(node.type));
              if (items.length === 0) return null;
              const isExpanded = expandedPaletteGroups.has(group.title);
              return (
                <div key={group.title} className="rounded-md border border-gray-800/50">
                  <button
                    type="button"
                    onClick={() => onTogglePaletteGroup(group.title)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left transition hover:bg-gray-900/50"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{group.icon}</span>
                      <span className="text-[11px] font-medium uppercase tracking-wide text-gray-300">
                        {group.title}
                      </span>
                      <span className="rounded-full bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-400">
                        {items.length}
                      </span>
                    </div>
                    <svg
                      className={`h-4 w-4 text-gray-500 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isExpanded && (
                    <div className="space-y-2 px-3 pb-3">
                      {items.map((node) => (
                        <div
                          key={node.title}
                          draggable
                          onDragStart={(event) => onDragStart(event, node)}
                          className="cursor-grab rounded-lg border border-gray-800 bg-gray-900/60 p-3 text-xs text-gray-300 transition hover:border-gray-600 hover:bg-gray-900 active:cursor-grabbing"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-white">
                              {node.title}
                            </span>
                            <span className="text-[10px] uppercase text-gray-500">
                              {node.type}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] text-gray-400">
                            {node.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {!selectedEdgeId && (
        <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-4">
          <div className="mb-3 text-sm font-semibold text-white">Inspector</div>
          {selectedNode ? (
            <div className="space-y-3 text-xs text-gray-300">
              {selectedNode.type === "trigger" && (
                <Button
                  className="w-full rounded-md border border-emerald-500/40 text-xs text-emerald-200 hover:bg-emerald-500/10"
                  type="button"
                  onClick={(event) => onFireTrigger(selectedNode, event)}
                >
                  Fire Trigger
                </Button>
              )}
              {selectedNode.type === "simulation" && (
                <Button
                  className="w-full rounded-md border border-cyan-500/40 text-xs text-cyan-200 hover:bg-cyan-500/10"
                  type="button"
                  onClick={() => onOpenSimulation(selectedNode.id)}
                >
                  Open Simulation
                </Button>
              )}
              <div>
                <Label className="text-[10px] uppercase text-gray-500">Title</Label>
                <Input
                  className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 px-3 py-2 text-xs text-white"
                  value={selectedNode.title}
                  onChange={(event) => onUpdateSelectedNode({ title: event.target.value })}
                />
              </div>
              <div>
                <Label className="text-[10px] uppercase text-gray-500">Description</Label>
                <Textarea
                  className="mt-2 min-h-[64px] w-full rounded-md border border-gray-800 bg-gray-950/70 text-xs text-white"
                  value={selectedNode.description}
                  onChange={(event) =>
                    onUpdateSelectedNode({ description: event.target.value })
                  }
                />
              </div>
              <div className="rounded-md border border-gray-800 bg-gray-900/50 p-3 text-[11px] text-gray-400">
                Inputs:{" "}
                {selectedNode.inputs.map((port) => formatPortLabel(port)).join(", ") ||
                  "None"}{" "}
                <br />
                Outputs:{" "}
                {selectedNode.outputs.map((port) => formatPortLabel(port)).join(", ") ||
                  "None"}
              </div>
              {selectedNode.type === "prompt" && (() => {
                const incomingEdges = edges.filter((edge) => edge.to === selectedNode.id);
                const inputPorts = incomingEdges
                  .map((edge) => edge.toPort)
                  .filter((port): port is string => Boolean(port));
                const bundleKeys = new Set<string>();
                incomingEdges.forEach((edge) => {
                  if (edge.toPort !== "bundle") return;
                  const fromNode = nodes.find((node) => node.id === edge.from);
                  if (!fromNode) return;
                  if (fromNode.type === "parser") {
                    const mappings =
                      fromNode.config?.parser?.mappings ??
                      createParserMappings(fromNode.outputs);
                    Object.keys(mappings).forEach((key) => {
                      const trimmed = key.trim();
                      if (trimmed) bundleKeys.add(trimmed);
                    });
                    return;
                  }
                  if (fromNode.type === "bundle") {
                    fromNode.inputs.forEach((port) => {
                      const trimmed = port.trim();
                      if (trimmed) bundleKeys.add(trimmed);
                    });
                  }
                  if (fromNode.type === "mapper") {
                    const mapperOutputs =
                      fromNode.config?.mapper?.outputs ?? fromNode.outputs;
                    mapperOutputs.forEach((output) => {
                      const trimmed = output.trim();
                      if (trimmed) bundleKeys.add(trimmed);
                    });
                  }
                });
                const directPlaceholders = inputPorts.filter((port) => port !== "bundle");
                if (bundleKeys.size === 0 && directPlaceholders.length === 0) return null;
                return (
                  <div className="rounded-md border border-gray-800 bg-gray-900/50 p-3 text-[11px] text-gray-400">
                    <div className="text-gray-300">Prompt placeholders</div>
                    {bundleKeys.size > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {Array.from(bundleKeys).map((key) => (
                          <span
                            key={key}
                            className="rounded-full border border-gray-700 px-2 py-0.5 text-[10px] text-gray-200"
                          >
                            {formatPlaceholderLabel(key)}
                          </span>
                        ))}
                      </div>
                    )}
                    {directPlaceholders.length > 0 && (
                      <div className="mt-2 text-[11px] text-gray-500">
                        Direct inputs:{" "}
                        {directPlaceholders
                          .map((port) => formatPlaceholderLabel(port))
                          .join(", ")}
                      </div>
                    )}
                  </div>
                );
              })()}
              <Button
                className="w-full rounded-md border border-gray-700 text-xs text-white hover:bg-gray-900/80"
                onClick={onOpenNodeConfig}
              >
                Open Node Config
              </Button>
              <Button
                className="w-full rounded-md border border-rose-500/40 text-xs text-rose-200 hover:bg-rose-500/10"
                type="button"
                onClick={onDeleteSelectedNode}
              >
                Remove Node
              </Button>
            </div>
          ) : (
            <div className="text-xs text-gray-500">
              Select a node to inspect inputs, outputs, and configuration.
            </div>
          )}
        </div>
      )}

      <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-4">
        <div className="mb-3 text-sm font-semibold text-white">Connections</div>
        <div className="space-y-2 text-xs text-gray-400">
          <div>Active wires: {edges.length}</div>
          {selectedEdgeId ? (() => {
            const selectedEdge = edges.find((edge) => edge.id === selectedEdgeId);
            const fromNode = selectedEdge ? nodes.find((n) => n.id === selectedEdge.from) : null;
            const toNode = selectedEdge ? nodes.find((n) => n.id === selectedEdge.to) : null;
            return selectedEdge ? (
              <div className="space-y-3 rounded-md border border-blue-500/30 bg-blue-500/5 p-3">
                <div className="text-xs font-medium text-blue-300">Selected Wire</div>
                <div className="space-y-2">
                  <div className="rounded border border-gray-700 bg-gray-900/50 p-2">
                    <div className="text-[10px] uppercase text-gray-500">From</div>
                    <div className="text-sm text-white">
                      {fromNode?.title ?? selectedEdge.from}
                    </div>
                    <div className="text-[11px] text-gray-400">
                      Type:{" "}
                      <span className="text-amber-300">
                        {fromNode?.type ?? "unknown"}
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-400">
                      Port:{" "}
                      <span className="text-amber-300">
                        {selectedEdge.fromPort ?? "default"}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-center text-gray-500">↓</div>
                  <div className="rounded border border-gray-700 bg-gray-900/50 p-2">
                    <div className="text-[10px] uppercase text-gray-500">To</div>
                    <div className="text-sm text-white">
                      {toNode?.title ?? selectedEdge.to}
                    </div>
                    <div className="text-[11px] text-gray-400">
                      Type:{" "}
                      <span className="text-sky-300">
                        {toNode?.type ?? "unknown"}
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-400">
                      Port:{" "}
                      <span className="text-sky-300">
                        {selectedEdge.toPort ?? "default"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    className="flex-1 rounded-md border border-gray-600 text-xs text-gray-300 hover:bg-gray-700"
                    type="button"
                    onClick={() => onSelectEdge(null)}
                  >
                    Deselect
                  </Button>
                  <Button
                    className="flex-1 rounded-md border border-rose-500/40 text-xs text-rose-200 hover:bg-rose-500/10"
                    type="button"
                    onClick={() => onRemoveEdge(selectedEdgeId)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ) : null;
          })() : (
            <div className="text-[11px] text-gray-500">Click a wire to select it.</div>
          )}
          <Button
            className="w-full rounded-md border border-rose-500/40 text-xs text-rose-200 hover:bg-rose-500/10"
            type="button"
            onClick={onClearWires}
          >
            Clear All Wires
          </Button>
        </div>
        {edges.length > 0 && (
          <div className="mt-3 space-y-2 text-[11px] text-gray-500">
            {edges.map((edge) => {
              const fromNode = nodes.find((node) => node.id === edge.from);
              const toNode = nodes.find((node) => node.id === edge.to);
              const label = `${fromNode?.title ?? edge.from}.${edge.fromPort ?? "?"} → ${toNode?.title ?? edge.to}.${edge.toPort ?? "?"}`;
              const isSelected = edge.id === selectedEdgeId;
              return (
                <div
                  key={edge.id}
                  className={`flex items-center justify-between gap-2 rounded-md border px-2 py-1 ${
                    isSelected
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                      : "border-gray-800 bg-gray-900/40"
                  }`}
                >
                  <span className="truncate">{label}</span>
                  <button
                    type="button"
                    className="rounded border border-gray-700 px-1.5 py-0.5 text-[9px] text-gray-400 hover:bg-gray-900"
                    onClick={() => onSelectEdge(edge.id)}
                  >
                    Select
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
