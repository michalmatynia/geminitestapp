"use client";




import { Button, Label, Textarea } from "@/shared/ui";
import type { AiNode, Edge, NodeConfig, RuntimeState } from "@/features/ai-paths/lib";
import { createViewerOutputs, formatRuntimeValue } from "@/features/ai-paths/lib";
import { extractImageUrls, formatPortLabel } from "@/features/ai-paths/utils/ui-utils";

type ViewerNodeConfigSectionProps = {
  selectedNode: AiNode;
  nodes: AiNode[];
  edges: Edge[];
  runtimeState: RuntimeState;
  updateSelectedNodeConfig: (patch: Partial<NodeConfig>) => void;
  clearRuntimeForNode?: (nodeId: string) => void;
};

export function ViewerNodeConfigSection({
  selectedNode,
  nodes,
  edges,
  runtimeState,
  updateSelectedNodeConfig,
  clearRuntimeForNode,
}: ViewerNodeConfigSectionProps) {
  if (selectedNode.type !== "viewer") return null;

  const viewerConfig = selectedNode.config?.viewer ?? {
    outputs: createViewerOutputs(selectedNode.inputs),
    showImagesAsJson: false,
  };
  const showImagesAsJson = viewerConfig.showImagesAsJson ?? false;
  const connections = edges.filter((edge) => edge.to === selectedNode.id);
  const isConnectedToTrigger = (() => {
    const triggerIds = nodes.filter((node) => node.type === "trigger").map((node) => node.id);
    if (triggerIds.length === 0) return false;
    const adjacency = new Map<string, Set<string>>();
    edges.forEach((edge) => {
      if (!edge.from || !edge.to) return;
      const fromSet = adjacency.get(edge.from) ?? new Set<string>();
      fromSet.add(edge.to);
      adjacency.set(edge.from, fromSet);
      const toSet = adjacency.get(edge.to) ?? new Set<string>();
      toSet.add(edge.from);
      adjacency.set(edge.to, toSet);
    });
    const visited = new Set<string>();
    const queue = [...triggerIds];
    triggerIds.forEach((id) => visited.add(id));
    while (queue.length) {
      const current = queue.shift();
      if (!current) continue;
      const neighbors = adjacency.get(current);
      if (!neighbors) continue;
      neighbors.forEach((neighbor) => {
        if (visited.has(neighbor)) return;
        visited.add(neighbor);
        queue.push(neighbor);
      });
    }
    return visited.has(selectedNode.id);
  })();
  const runtimeInputs = runtimeState.inputs[selectedNode.id] ?? {};
  const resolvedRuntimeInputs = selectedNode.inputs.reduce<Record<string, unknown>>(
    (acc, input) => {
      const directValue = runtimeInputs[input];
      if (directValue !== undefined) {
        acc[input] = directValue;
        return acc;
      }
      const matchingEdges = connections.filter(
        (edge) => edge.toPort === input || !edge.toPort
      );
      const merged = matchingEdges.reduce<unknown>((current, edge) => {
        const fromOutput = runtimeState.outputs[edge.from];
        if (!fromOutput) return current;
        const fromPort = edge.fromPort;
        if (!fromPort) return current;
        const value = fromOutput[fromPort];
        if (value === undefined) return current;
        if (current === undefined) return value;
        if (Array.isArray(current)) return [...(current as unknown[]), value];
        return [current, value];
      }, undefined);
      if (merged !== undefined) {
        acc[input] = merged;
      }
      return acc;
    },
    {}
  );
  const outputValues = {
    ...createViewerOutputs(selectedNode.inputs),
    ...viewerConfig.outputs,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-400">
          Store and review outputs that flow into this node.
        </div>
        <Button
          type="button"
          className="rounded-md border text-xs text-gray-200 hover:bg-muted/60"
          onClick={() => {
            updateSelectedNodeConfig({
              viewer: {
                outputs: createViewerOutputs(selectedNode.inputs),
                showImagesAsJson,
              },
            });
            clearRuntimeForNode?.(selectedNode.id);
          }}
        >
          Clear
        </Button>
        <Button
          type="button"
          className="rounded-md border text-xs text-gray-200 hover:bg-muted/60"
          onClick={() =>
            updateSelectedNodeConfig({
              viewer: {
                ...viewerConfig,
                showImagesAsJson: !showImagesAsJson,
              },
            })
          }
        >
          {showImagesAsJson ? "Images: JSON" : "Images: Thumbnails"}
        </Button>
      </div>
      {!isConnectedToTrigger && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100">
          This Result Viewer is not connected to a Trigger path, so it will not update when you fire triggers.
          Connect it to the same path as a Trigger (directly or through other nodes).
        </div>
      )}
      {selectedNode.inputs.map((input) => {
        const connectedSources = connections
          .filter((edge) => !edge.toPort || edge.toPort === input)
          .map((edge) => {
            const fromNode = nodes.find((node) => node.id === edge.from);
            if (!fromNode) return null;
            const portLabel = edge.fromPort ? `:${edge.fromPort}` : "";
            return `${fromNode.title}${portLabel}`;
          })
          .filter(Boolean)
          .join(", ");
        const runtimeValue = resolvedRuntimeInputs[input];
        const imageUrls =
          input === "images" ? extractImageUrls(runtimeValue) : [];
        const hasImagePreview =
          input === "images" && imageUrls.length > 0 && !showImagesAsJson;
        return (
          <div key={input} className="space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <Label className="text-xs text-gray-400">
                {formatPortLabel(input)}
              </Label>
              {connectedSources && (
                <span className="text-[10px] text-gray-500">
                  Connected: {connectedSources}
                </span>
              )}
            </div>
            {runtimeValue !== undefined && (
              <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-[11px] text-emerald-100">
                <div className="mb-1 text-[9px] uppercase text-emerald-300">
                  Runtime
                </div>
                {hasImagePreview ? (
                  <>
                    <div className="text-[10px] text-emerald-200">
                      Detected {imageUrls.length} image
                      {imageUrls.length === 1 ? "" : "s"}
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {imageUrls.map((url, index) => (
                        <div
                          key={`${url}-${index}`}
                          className="overflow-hidden rounded border border-emerald-500/30 bg-black/30"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt={`Image ${index + 1}`}
                            className="h-20 w-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <pre className="whitespace-pre-wrap">
                    {formatRuntimeValue(runtimeValue)}
                  </pre>
                )}
              </div>
            )}
            <Textarea
              className="min-h-[90px] w-full rounded-md border border-border bg-card/70 text-sm text-white"
              value={outputValues[input] ?? ""}
              onChange={(event) =>
                updateSelectedNodeConfig({
                  viewer: {
                    ...viewerConfig,
                    outputs: {
                      ...outputValues,
                      [input]: event.target.value,
                    },
                  },
                })
              }
            />
          </div>
        );
      })}
    </div>
  );
}
