




import type { AiNode, Edge, NodeDefinition, PathExecutionMode } from '@/features/ai/ai-paths/lib';
import { createParserMappings } from '@/features/ai/ai-paths/lib';
import { Button, Input, Label, Textarea, SectionPanel } from '@/shared/ui';

import { formatPlaceholderLabel, formatPortLabel } from '../utils/ui-utils';

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
  onFireTriggerPersistent?: (node: AiNode, event?: React.MouseEvent<HTMLButtonElement>) => void;
  onOpenSimulation: (nodeId: string) => void;
  onUpdateSelectedNode: (patch: Partial<AiNode>, options?: { nodeId?: string }) => void;
  onOpenNodeConfig: () => void;
  onDeleteSelectedNode: () => void;
  onRemoveEdge: (edgeId: string) => void;
  onClearWires: () => void;
  executionMode: PathExecutionMode;
  runStatus: 'idle' | 'running' | 'paused' | 'stepping';
  onPauseRun?: () => void;
  onResumeRun?: () => void;
  onStepRun?: (triggerNode?: AiNode) => void;
  onCancelRun?: () => void;
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
  onFireTriggerPersistent,
  onOpenSimulation,
  onUpdateSelectedNode,
  onOpenNodeConfig,
  onDeleteSelectedNode,
  onRemoveEdge,
  onClearWires,
  executionMode,
  runStatus,
  onPauseRun,
  onResumeRun,
  onStepRun,
  onCancelRun,
}: CanvasSidebarProps): React.JSX.Element {
  const selectedIsScheduledTrigger =
    selectedNode?.type === 'trigger' && selectedNode.config?.trigger?.event === 'scheduled_run';
  const showRunControls = executionMode === 'local';
  const runStatusLabel =
    runStatus === 'running'
      ? 'Running'
      : runStatus === 'paused'
        ? 'Paused'
        : runStatus === 'stepping'
          ? 'Stepping'
          : 'Idle';

  return (
    <div className="space-y-4">
      <SectionPanel
        variant="subtle"
        className="p-4"
        data-edge-panel
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-white">Node Palette</span>
          <button
            type="button"
            className="rounded border px-2 py-1 text-[10px] text-gray-300 hover:bg-muted/60"
            onClick={onTogglePaletteCollapsed}
          >
            {paletteCollapsed ? 'Expand' : 'Collapse'}
          </button>
        </div>
        {paletteCollapsed ? (
          <div className="rounded-md border border-dashed border-border/60 px-3 py-2 text-[11px] text-gray-500">
            Palette collapsed. Expand to add nodes.
          </div>
        ) : (
          <div className="max-h-[520px] space-y-1 overflow-y-auto pr-1">
	            {[
	              { title: 'Triggers', types: ['trigger'], icon: '⚡' },
	              { title: 'Simulation', types: ['simulation'], icon: '🧪' },
	              { title: 'Context + Parsing', types: ['context', 'parser'], icon: '📦' },
	              {
	                title: 'Transforms',
	                types: ['mapper', 'mutator', 'validator', 'regex', 'iterator'],
	                icon: '🧭',
	              },
	              {
	                title: 'Signals + Logic',
	                types: ['constant', 'math', 'compare', 'gate', 'router', 'delay', 'poll'],
	                icon: '🧪',
	              },
              { title: 'Bundles + Templates', types: ['bundle', 'template'], icon: '🧩' },
              { title: 'IO + Fetch', types: ['http', 'database', 'db_schema'], icon: '🌐' },
              {
                title: 'Prompts + Models',
                types: ['prompt', 'model'],
                icon: '🤖',
              },
              { title: 'Agents', types: ['agent'], icon: '🧠' },
              { title: 'Viewers', types: ['viewer', 'notification'], icon: '👁' },
            ].map((group: { title: string; types: string[]; icon: string }): React.JSX.Element | null => {
              const items = palette.filter((node: NodeDefinition) => group.types.includes(node.type));
              if (items.length === 0) return null;
              const isExpanded = expandedPaletteGroups.has(group.title);
              return (
                <div key={group.title} className="rounded-md border border-border/60">
                  <button
                    type="button"
                    onClick={() => onTogglePaletteGroup(group.title)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left transition hover:bg-muted/40"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{group.icon}</span>
                      <span className="text-[11px] font-medium uppercase tracking-wide text-gray-300">
                        {group.title}
                      </span>
                      <span className="rounded-full bg-muted/60 px-1.5 py-0.5 text-[10px] text-gray-400">
                        {items.length}
                      </span>
                    </div>
                    <svg
                      className={`h-4 w-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isExpanded && (
                    <div className="space-y-2 px-3 pb-3">
                      {items.map((node: NodeDefinition) => (
                        <SectionPanel
                          key={node.title}
                          variant="subtle-compact"
                          draggable
                          onDragStart={(event: React.DragEvent<HTMLDivElement>) => onDragStart(event, node)}
                          className="cursor-grab text-xs text-gray-300 transition hover:border-border/60 hover:bg-muted/50 active:cursor-grabbing"
                        >
                          {((): React.JSX.Element => {
                            const isScheduledTrigger =
                              node.type === 'trigger' && node.config?.trigger?.event === 'scheduled_run';
                            return (
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold text-white">
                                  {node.title}
                                </span>
                                <div className="flex items-center gap-1">
                                  {isScheduledTrigger ? (
                                    <span className="rounded-full border border-amber-400/60 bg-amber-500/15 px-2 py-[1px] text-[9px] uppercase text-amber-200">
                                      Scheduled
                                    </span>
                                  ) : null}
                                  <span className="text-[10px] uppercase text-gray-500">
                                    {node.type}
                                  </span>
                                </div>
                              </div>
                            );
                          })()}
                          <p className="mt-1 text-[11px] text-gray-400">
                            {node.description}
                          </p>
                        </SectionPanel>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </SectionPanel>

      {!selectedEdgeId && (
        <SectionPanel variant="subtle" className="p-4">
          <div className="mb-3 text-sm font-semibold text-white">Inspector</div>
          {selectedNode ? (
            <div className="space-y-3 text-xs text-gray-300">
              <SectionPanel variant="subtle-compact" className="bg-card/50 px-3 py-2 text-[11px] text-gray-400">
                <div className="flex items-center justify-between">
                  <span className="uppercase text-gray-500">Type</span>
                  <div className="flex items-center gap-1">
                    {selectedIsScheduledTrigger ? (
                      <span className="rounded-full border border-amber-400/60 bg-amber-500/15 px-2 py-[1px] text-[9px] uppercase text-amber-200">
                        Scheduled
                      </span>
                    ) : null}
                    <span className="text-[10px] uppercase text-gray-300">
                      {selectedNode.type}
                    </span>
                  </div>
                </div>
              </SectionPanel>
              {selectedNode.type === 'trigger' && (
                <div className="space-y-2">
                  <Button
                    className="w-full rounded-md border border-emerald-500/40 text-xs text-emerald-200 hover:bg-emerald-500/10"
                    type="button"
                    onClick={(event: React.MouseEvent<HTMLButtonElement>) => onFireTrigger(selectedNode, event)}
                  >
                    Fire Trigger
                  </Button>
                  {onFireTriggerPersistent && (
                    <Button
                      className="w-full rounded-md border border-sky-500/40 text-xs text-sky-200 hover:bg-sky-500/10"
                      type="button"
                      onClick={(event: React.MouseEvent<HTMLButtonElement>) => onFireTriggerPersistent(selectedNode, event)}
                    >
                      Queue Persistent Run
                    </Button>
                  )}
                </div>
              )}
              {selectedNode.type === 'simulation' && (
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
                  className="mt-2 w-full rounded-md border bg-card/70 px-3 py-2 text-xs text-white"
                  value={selectedNode.title}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => onUpdateSelectedNode({ title: event.target.value })}
                />
              </div>
              <div>
                <Label className="text-[10px] uppercase text-gray-500">Description</Label>
                <Textarea
                  className="mt-2 min-h-[64px] w-full rounded-md border bg-card/70 text-xs text-white"
                  value={selectedNode.description}
                  onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                    onUpdateSelectedNode({ description: event.target.value })
                  }
                />
              </div>
              <SectionPanel variant="subtle-compact" className="bg-card/50 p-3 text-[11px] text-gray-400">
                Inputs:{' '}
                {selectedNode.inputs.map((port: string) => formatPortLabel(port)).join(', ') ||
                  'None'}{' '}
                <br />
                Outputs:{' '}
                {selectedNode.outputs.map((port: string) => formatPortLabel(port)).join(', ') ||
                  'None'}
              </SectionPanel>
              {selectedNode.type === 'prompt' && ((): React.JSX.Element | null => {
                const incomingEdges = edges.filter((edge: Edge) => edge.to === selectedNode.id);
                const inputPorts = incomingEdges
                  .map((edge: Edge) => edge.toPort)
                  .filter((port: string | undefined): port is string => Boolean(port));
                const bundleKeys = new Set<string>();
                incomingEdges.forEach((edge: Edge) => {
                  if (edge.toPort !== 'bundle') return;
                  const fromNode = nodes.find((node: AiNode) => node.id === edge.from);
                  if (!fromNode) return;
                  if (fromNode.type === 'parser') {
                    const mappings =
                      fromNode.config?.parser?.mappings ??
                      createParserMappings(fromNode.outputs);
                    Object.keys(mappings).forEach((key: string) => {
                      const trimmed = key.trim();
                      if (trimmed) bundleKeys.add(trimmed);
                    });
                    return;
                  }
                  if (fromNode.type === 'bundle') {
                    fromNode.inputs.forEach((port: string) => {
                      const trimmed = port.trim();
                      if (trimmed) bundleKeys.add(trimmed);
                    });
                  }
                  if (fromNode.type === 'mapper') {
                    const mapperOutputs =
                      fromNode.config?.mapper?.outputs ?? fromNode.outputs;
                    mapperOutputs.forEach((output: string) => {
                      const trimmed = output.trim();
                      if (trimmed) bundleKeys.add(trimmed);
                    });
                  }
                });
                const directPlaceholders = inputPorts.filter((port: string) => port !== 'bundle');
                if (bundleKeys.size === 0 && directPlaceholders.length === 0) return null;
                return (
                  <SectionPanel variant="subtle-compact" className="bg-card/50 p-3 text-[11px] text-gray-400">
                    <div className="text-gray-300">Prompt placeholders</div>
                    {bundleKeys.size > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {Array.from(bundleKeys).map((key: string) => (
                          <span
                            key={key}
                            className="rounded-full border px-2 py-0.5 text-[10px] text-gray-200"
                          >
                            {formatPlaceholderLabel(key)}
                          </span>
                        ))}
                      </div>
                    )}
                    {directPlaceholders.length > 0 && (
                      <div className="mt-2 text-[11px] text-gray-500">
                        Direct inputs:{' '}
                        {directPlaceholders
                          .map((port: string) => formatPlaceholderLabel(port))
                          .join(', ')}
                      </div>
                    )}
                  </SectionPanel>
                );
              })()}
              <Button
                className="w-full rounded-md border text-xs text-white hover:bg-muted/60"
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
        </SectionPanel>
      )}

      {showRunControls && (
        <SectionPanel variant="subtle" className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-white">Run Controls</span>
            <span className="rounded border border-border/60 px-2 py-0.5 text-[10px] uppercase text-gray-400">
              {runStatusLabel}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {runStatus === 'running' || runStatus === 'stepping' ? (
              <>
                <Button
                  className="rounded-md border border-amber-500/40 text-xs text-amber-200 hover:bg-amber-500/10"
                  type="button"
                  onClick={onPauseRun}
                  disabled={!onPauseRun}
                >
                  Pause
                </Button>
                <Button
                  className="rounded-md border border-rose-500/40 text-xs text-rose-200 hover:bg-rose-500/10"
                  type="button"
                  onClick={onCancelRun}
                  disabled={!onCancelRun}
                >
                  Cancel
                </Button>
              </>
            ) : runStatus === 'paused' ? (
              <>
                <Button
                  className="rounded-md border border-emerald-500/40 text-xs text-emerald-200 hover:bg-emerald-500/10"
                  type="button"
                  onClick={onResumeRun}
                  disabled={!onResumeRun}
                >
                  Resume
                </Button>
                <Button
                  className="rounded-md border border-sky-500/40 text-xs text-sky-200 hover:bg-sky-500/10"
                  type="button"
                  onClick={() => onStepRun?.(selectedNode?.type === 'trigger' ? selectedNode : undefined)}
                  disabled={!onStepRun}
                >
                  Step
                </Button>
                <Button
                  className="col-span-2 rounded-md border border-rose-500/40 text-xs text-rose-200 hover:bg-rose-500/10"
                  type="button"
                  onClick={onCancelRun}
                  disabled={!onCancelRun}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                className="col-span-2 rounded-md border border-sky-500/40 text-xs text-sky-200 hover:bg-sky-500/10"
                type="button"
                onClick={() => onStepRun?.(selectedNode?.type === 'trigger' ? selectedNode : undefined)}
                disabled={!onStepRun}
              >
                Step Run
              </Button>
            )}
          </div>
        </SectionPanel>
      )}

      <SectionPanel variant="subtle" className="p-4">
        <div className="mb-3 text-sm font-semibold text-white">Connections</div>
        <div className="space-y-2 text-xs text-gray-400">
          <div>Active wires: {edges.length}</div>
          {selectedEdgeId ? ((): React.JSX.Element | null => {
            const selectedEdge = edges.find((edge: Edge) => edge.id === selectedEdgeId);
            const fromNode = selectedEdge ? nodes.find((n: AiNode) => n.id === selectedEdge.from) : null;
            const toNode = selectedEdge ? nodes.find((n: AiNode) => n.id === selectedEdge.to) : null;
            return selectedEdge ? (
              <SectionPanel variant="subtle-compact" className="space-y-3 border-blue-500/30 bg-blue-500/5 p-3">
                <div className="text-xs font-medium text-blue-300">Selected Wire</div>
                <div className="space-y-2">
                  <div className="rounded border bg-card/50 p-2">
                    <div className="text-[10px] uppercase text-gray-500">From</div>
                    <div className="text-sm text-white">
                      {fromNode?.title ?? selectedEdge.from}
                    </div>
                    <div className="text-[11px] text-gray-400">
                      Type:{' '}
                      <span className="text-amber-300">
                        {fromNode?.type ?? 'unknown'}
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-400">
                      Port:{' '}
                      <span className="text-amber-300">
                        {selectedEdge.fromPort ?? 'default'}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-center text-gray-500">↓</div>
                  <div className="rounded border bg-card/50 p-2">
                    <div className="text-[10px] uppercase text-gray-500">To</div>
                    <div className="text-sm text-white">
                      {toNode?.title ?? selectedEdge.to}
                    </div>
                    <div className="text-[11px] text-gray-400">
                      Type:{' '}
                      <span className="text-sky-300">
                        {toNode?.type ?? 'unknown'}
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-400">
                      Port:{' '}
                      <span className="text-sky-300">
                        {selectedEdge.toPort ?? 'default'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    className="flex-1 rounded-md border text-xs text-muted-foreground hover:bg-muted/50"
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
              </SectionPanel>
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
            {edges.map((edge: Edge): React.JSX.Element => {
              const fromNode = nodes.find((node: AiNode) => node.id === edge.from);
              const toNode = nodes.find((node: AiNode) => node.id === edge.to);
              const label = `${fromNode?.title ?? edge.from}.${edge.fromPort ?? '?'} → ${toNode?.title ?? edge.to}.${edge.toPort ?? '?'}`;
              const isSelected = edge.id === selectedEdgeId;
              return (
                <SectionPanel
                  key={edge.id}
                  variant="subtle-compact"
                  className={`flex items-center justify-between gap-2 border px-2 py-1 ${
                    isSelected
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                      : 'bg-card/40'
                  }`}
                >
                  <span className="truncate">{label}</span>
                  <button
                    type="button"
                    className="rounded border px-1.5 py-0.5 text-[9px] text-gray-400 hover:bg-muted/50"
                    onClick={() => onSelectEdge(edge.id)}
                  >
                    Select
                  </button>
                </SectionPanel>
              );
            })}
          </div>
        )}
      </SectionPanel>
    </div>
  );
}
