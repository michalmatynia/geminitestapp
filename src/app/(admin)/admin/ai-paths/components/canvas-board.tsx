import React from "react";
import { Button } from "@/shared/ui/button";
import type { AiNode, Edge, RuntimeState } from "@/lib/ai-paths";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  NODE_WIDTH,
  PORT_SIZE,
  getPortOffsetY,
  typeStyles,
  validateConnection,
} from "@/lib/ai-paths";
import { formatPortLabel } from "../utils/ui-utils";

type EdgePath = { id: string; path: string; label?: string };

type CanvasBoardProps = {
  viewportRef: React.RefObject<HTMLDivElement | null>;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  nodes: AiNode[];
  edges: Edge[];
  runtimeState: RuntimeState;
  edgePaths: EdgePath[];
  view: { x: number; y: number; scale: number };
  panState: { startX: number; startY: number; originX: number; originY: number } | null;
  lastDrop: { x: number; y: number } | null;
  connecting: { fromNodeId: string; fromPort: string; start: { x: number; y: number } } | null;
  connectingPos: { x: number; y: number } | null;
  connectingFromNode: AiNode | null;
  selectedNodeId: string | null;
  draggingNodeId: string | null;
  selectedEdgeId: string | null;
  onSelectEdgeId: (edgeId: string | null) => void;
  onRemoveEdge: (edgeId: string) => void;
  onSelectNode: (nodeId: string) => void;
  onOpenNodeConfig: (nodeId: string) => void;
  onFireTrigger: (node: AiNode, event?: React.MouseEvent<HTMLButtonElement>) => void;
  onPointerDownNode: (event: React.PointerEvent<HTMLDivElement>, nodeId: string) => void;
  onPointerMoveNode: (event: React.PointerEvent<HTMLDivElement>, nodeId: string) => void;
  onPointerUpNode: (event: React.PointerEvent<HTMLDivElement>, nodeId: string) => void;
  onStartConnection: (
    event: React.PointerEvent<HTMLButtonElement>,
    node: AiNode,
    port: string
  ) => void;
  onCompleteConnection: (
    event: React.PointerEvent<HTMLButtonElement>,
    node: AiNode,
    port: string
  ) => void;
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  onPanStart: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPanMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPanEnd: (event: React.PointerEvent<HTMLDivElement>) => void;
  onZoomTo: (scale: number) => void;
  onFitToNodes: () => void;
  onResetView: () => void;
};

export function CanvasBoard({
  viewportRef,
  canvasRef,
  nodes,
  edges,
  runtimeState,
  edgePaths,
  view,
  panState,
  lastDrop,
  connecting,
  connectingPos,
  connectingFromNode,
  selectedNodeId,
  draggingNodeId,
  selectedEdgeId,
  onSelectEdgeId,
  onRemoveEdge,
  onSelectNode,
  onOpenNodeConfig,
  onFireTrigger,
  onPointerDownNode,
  onPointerMoveNode,
  onPointerUpNode,
  onStartConnection,
  onCompleteConnection,
  onDrop,
  onDragOver,
  onPanStart,
  onPanMove,
  onPanEnd,
  onZoomTo,
  onFitToNodes,
  onResetView,
}: CanvasBoardProps) {
  const triggerConnected = React.useMemo(() => {
    const triggerIds = nodes.filter((node) => node.type === "trigger").map((node) => node.id);
    if (triggerIds.length === 0) return new Set<string>();
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
    return visited;
  }, [nodes, edges]);

  return (
    <div
      ref={viewportRef}
      className={`relative min-h-[560px] rounded-lg border border-gray-800 bg-gray-950/70 overflow-hidden ${
        panState ? "cursor-grabbing" : "cursor-grab"
      }`}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onPointerDown={onPanStart}
      onPointerMove={onPanMove}
      onPointerUp={onPanEnd}
      onPointerLeave={onPanEnd}
    >
      <div className="absolute bottom-3 left-3 z-10 rounded-md border border-gray-800 bg-gray-950/70 px-3 py-2 text-[11px] text-gray-400">
        Nodes: {nodes.length}
        {lastDrop ? ` • Last drop: ${Math.round(lastDrop.x)}, ${Math.round(lastDrop.y)}` : ""}
        {` • View: ${Math.round(view.x)}, ${Math.round(view.y)} @ ${Math.round(view.scale * 100)}%`}
      </div>
      <div className="absolute bottom-4 right-4 z-10 rounded-md border border-gray-800 bg-gray-950/70 p-2 text-xs text-gray-300">
        <div className="mb-2 text-[11px] uppercase text-gray-500">View Controls</div>
        <div className="flex items-center gap-2">
          <Button
            className="h-7 w-7 rounded-full border border-gray-700 text-xs text-white hover:bg-gray-900/80"
            type="button"
            onClick={() => onZoomTo(view.scale - 0.1)}
          >
            -
          </Button>
          <span className="min-w-[56px] text-center text-[11px] text-gray-300">
            {Math.round(view.scale * 100)}%
          </span>
          <Button
            className="h-7 w-7 rounded-full border border-gray-700 text-xs text-white hover:bg-gray-900/80"
            type="button"
            onClick={() => onZoomTo(view.scale + 0.1)}
          >
            +
          </Button>
          <Button
            className="h-7 rounded-full border border-gray-700 px-2 text-[11px] text-white hover:bg-gray-900/80"
            type="button"
            onClick={onFitToNodes}
          >
            Fit
          </Button>
          <Button
            className="h-7 rounded-full border border-gray-700 px-2 text-[11px] text-white hover:bg-gray-900/80"
            type="button"
            onClick={onResetView}
          >
            Reset
          </Button>
        </div>
      </div>
      <div
        ref={canvasRef}
        className="absolute left-0 top-0"
        onDrop={onDrop}
        onDragOver={onDragOver}
        style={{
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
          transformOrigin: "0 0",
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(148,163,184,0.18) 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      >
        {lastDrop ? (
          <div
            className="absolute"
            style={{
              width: 10,
              height: 10,
              transform: `translate(${lastDrop.x}px, ${lastDrop.y}px)`,
            }}
          >
            <span className="absolute inset-0 rounded-full bg-sky-400/40 animate-ping" />
            <span className="absolute inset-0 rounded-full border border-sky-300/70 bg-sky-500/60" />
          </div>
        ) : null}
        <svg
          className="absolute inset-0"
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          style={{ pointerEvents: "auto" }}
        >
          {edgePaths.map((edge) => {
            const isSelected = selectedEdgeId === edge.id;
            return (
              <g key={edge.id} className="group cursor-pointer">
                <path
                  d={edge.path}
                  stroke="transparent"
                  strokeWidth="14"
                  fill="none"
                  style={{ pointerEvents: "stroke" }}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    onRemoveEdge(edge.id);
                  }}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onSelectEdgeId(edge.id);
                  }}
                />
                <path
                  d={edge.path}
                  className={`transition-all duration-150 ${
                    isSelected
                      ? "stroke-blue-400"
                      : "stroke-slate-400/45 group-hover:stroke-blue-400/70"
                  }`}
                  strokeWidth={isSelected ? 2.5 : 1.6}
                  fill="none"
                  style={{ pointerEvents: "none" }}
                />
              </g>
            );
          })}
          {connecting && connectingPos ? (() => {
            const fromX = connecting.start.x;
            const fromY = connecting.start.y;
            const toX = connectingPos.x;
            const toY = connectingPos.y;
            const midX = fromX + (toX - fromX) * 0.5;
            const path = `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`;
            return (
              <path
                d={path}
                stroke="rgba(148,163,184,0.7)"
                strokeWidth="1.6"
                fill="none"
                strokeDasharray="4 3"
              />
            );
          })() : null}
        </svg>

        {nodes.map((node) => {
          const isSelected = node.id === selectedNodeId;
          const style = typeStyles[node.type];
          const modelStatus =
            node.type === "model"
              ? (runtimeState.outputs[node.id]?.status as string | undefined)
              : undefined;
          const modelStatusLabel =
            modelStatus === "completed"
              ? "Completed"
              : modelStatus === "failed"
                ? "Failed"
                : modelStatus === "queued"
                  ? "Queued"
                  : modelStatus
                    ? "Pending"
                    : null;
          const modelStatusClasses =
            modelStatus === "completed"
              ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-200"
              : modelStatus === "failed"
                ? "border-rose-500/60 bg-rose-500/15 text-rose-200"
                : "border-sky-500/60 bg-sky-500/15 text-sky-200";
          const pollStatus =
            node.type === "poll"
              ? (runtimeState.outputs[node.id]?.status as string | undefined)
              : undefined;
          const pollStatusLabel =
            pollStatus === "completed"
              ? "Completed"
              : pollStatus === "failed"
                ? "Failed"
                : pollStatus === "timeout"
                  ? "Timed Out"
                  : pollStatus === "polling"
                    ? "Polling"
                    : pollStatus
                      ? "Pending"
                      : null;
          const pollStatusClasses =
            pollStatus === "completed"
              ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-200"
              : pollStatus === "failed" || pollStatus === "timeout"
                ? "border-rose-500/60 bg-rose-500/15 text-rose-200"
                : "border-sky-500/60 bg-sky-500/15 text-sky-200";
          return (
            <div
              key={node.id}
              className={`absolute ${draggingNodeId === node.id ? "cursor-grabbing" : "cursor-grab"}`}
              style={{
                width: NODE_WIDTH,
                transform: `translate(${node.position.x}px, ${node.position.y}px)`,
              }}
              onPointerDown={(event) => onPointerDownNode(event, node.id)}
              onPointerMove={(event) => onPointerMoveNode(event, node.id)}
              onPointerUp={(event) => onPointerUpNode(event, node.id)}
              onClick={() => onSelectNode(node.id)}
              onDoubleClick={(event) => {
                event.stopPropagation();
                onSelectNode(node.id);
                onOpenNodeConfig(node.id);
              }}
            >
              <div
                className={`relative flex flex-col gap-2 rounded-xl border bg-gray-950/80 p-3 text-xs text-gray-200 shadow-lg backdrop-blur ${
                  style.border
                } ${style.glow} ${isSelected ? "ring-2 ring-white/20" : ""}`}
              >
                {node.inputs.map((input, index) => (
                  <div
                    key={`input-${node.id}-${input}`}
                    className="absolute flex items-center"
                    style={{
                      left: -(PORT_SIZE / 2) - 4,
                      top: getPortOffsetY(index, node.inputs.length) - PORT_SIZE / 2,
                    }}
                  >
                    {(() => {
                      const isConnecting = Boolean(connecting && connectingFromNode);
                      const isConnectable = isConnecting
                        ? validateConnection(
                            connectingFromNode as AiNode,
                            node,
                            connecting?.fromPort ?? "",
                            input
                          ).valid
                        : false;
                      return (
                        <>
                          <button
                            type="button"
                            data-port="input"
                            className={`cursor-pointer rounded-full border bg-sky-500/20 shadow-[0_0_8px_rgba(56,189,248,0.35)] hover:border-sky-200 ${
                              isConnecting
                                ? isConnectable
                                  ? "border-emerald-300/80 bg-emerald-500/30 shadow-[0_0_14px_rgba(52,211,153,0.55)] ring-2 ring-emerald-400/60"
                                  : "border-gray-700 bg-gray-800/20 opacity-40 shadow-none"
                                : "border-sky-400/60"
                            }`}
                            style={{
                              width: PORT_SIZE + 2,
                              height: PORT_SIZE + 2,
                            }}
                            onPointerDown={(event) =>
                              onCompleteConnection(event, node, input)
                            }
                            onPointerUp={(event) =>
                              onCompleteConnection(event, node, input)
                            }
                            aria-label={`Connect to ${formatPortLabel(input)}`}
                            title={`Input: ${formatPortLabel(input)}`}
                          />
                          <span
                            className={`ml-1.5 rounded px-1 py-0.5 text-[8px] font-medium ${
                              isConnecting
                                ? isConnectable
                                  ? "bg-emerald-500/15 text-emerald-200"
                                  : "bg-gray-800 text-gray-500"
                                : "bg-sky-500/10 text-sky-300"
                            }`}
                          >
                            {formatPortLabel(input)}
                          </span>
                        </>
                      );
                    })()}
                  </div>
                ))}
                {node.outputs.map((output, index) => (
                  <div
                    key={`output-${node.id}-${output}`}
                    className="absolute flex items-center"
                    style={{
                      right: -(PORT_SIZE / 2) - 4,
                      top: getPortOffsetY(index, node.outputs.length) - PORT_SIZE / 2,
                    }}
                  >
                    <span className="mr-1.5 rounded bg-amber-500/10 px-1 py-0.5 text-[8px] font-medium text-amber-300">
                      {formatPortLabel(output)}
                    </span>
                    <button
                      type="button"
                      data-port="output"
                      className="cursor-pointer rounded-full border border-amber-400/60 bg-amber-500/20 shadow-[0_0_8px_rgba(251,191,36,0.35)] hover:border-amber-200"
                      style={{
                        width: PORT_SIZE + 2,
                        height: PORT_SIZE + 2,
                      }}
                      onPointerDown={(event) => onStartConnection(event, node, output)}
                      aria-label={`Start connection from ${formatPortLabel(output)}`}
                      title={`Output: ${formatPortLabel(output)}`}
                    />
                  </div>
                ))}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">{node.title}</span>
                  <span className="rounded-full border border-gray-700 px-2 py-[1px] text-[10px] uppercase text-gray-400">
                    {node.type}
                  </span>
                </div>
                {node.type === "model" && modelStatusLabel && (
                  <div
                    className={`inline-flex w-fit items-center gap-1 rounded-full border px-2 py-[2px] text-[9px] uppercase tracking-wide ${modelStatusClasses}`}
                  >
                    {modelStatusLabel}
                  </div>
                )}
                {node.type === "poll" && pollStatusLabel && (
                  <div
                    className={`inline-flex w-fit items-center gap-1 rounded-full border px-2 py-[2px] text-[9px] uppercase tracking-wide ${pollStatusClasses}`}
                  >
                    {pollStatusLabel}
                  </div>
                )}
                {node.type === "viewer" && !triggerConnected.has(node.id) && (
                  <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[9px] text-amber-200">
                    Not wired to a Trigger
                  </div>
                )}
                {node.type === "trigger" && (
                  <Button
                    className="self-start rounded-md border border-emerald-500/40 px-2 py-1 text-[10px] text-emerald-200 hover:bg-emerald-500/10"
                    type="button"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => onFireTrigger(node, event)}
                  >
                    Fire Trigger
                  </Button>
                )}
                {node.type === "trigger" && (
                  <div className="text-[10px] uppercase text-lime-200/80">
                    Accepts simulation input
                  </div>
                )}
                {node.type === "context" && (
                  <span className="text-[10px] uppercase text-emerald-300/80">
                    Role output can feed any Trigger
                  </span>
                )}
                {node.type === "simulation" && (
                  <span className="text-[10px] uppercase text-cyan-300/80">
                    Connect simulation → Trigger
                  </span>
                )}
                {node.type === "viewer" && (
                  <div className="rounded-md border border-gray-800 bg-gray-950/60 px-2 py-1 text-[10px] text-gray-400">
                    Open node to view results
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
