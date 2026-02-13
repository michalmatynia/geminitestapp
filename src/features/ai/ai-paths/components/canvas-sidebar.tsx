import React, { useMemo, useState } from 'react';

import type { AiNode, NodeDefinition } from '@/features/ai/ai-paths/lib';
import { createParserMappings } from '@/features/ai/ai-paths/lib';
import { Button, Input, Label, Textarea } from '@/shared/ui';

import {
  useGraphState,
  usePersistenceActions,
  usePresetsState,
  usePresetsActions,
  useSelectionState,
  useSelectionActions,
  useRuntimeState,
  useRuntimeActions,
} from '../context';
import { useAiPathsSettingsOrchestrator } from './ai-paths-settings/AiPathsSettingsOrchestratorContext';
import { formatPlaceholderLabel, formatPortLabel } from '../utils/ui-utils';

type PaletteMode = 'data' | 'sound';

type PaletteGroup = {
  title: string;
  types: NodeDefinition['type'][];
  icon: string;
};

const DATA_PALETTE_GROUPS: PaletteGroup[] = [
  { title: 'Triggers', types: ['trigger'], icon: '⚡' },
  { title: 'Simulation', types: ['simulation'], icon: '🧪' },
  { title: 'Context + Parsing', types: ['context', 'parser'], icon: '📦' },
  {
    title: 'Transforms',
    types: ['mapper', 'mutator', 'string_mutator', 'validator', 'regex', 'iterator'],
    icon: '🧭',
  },
  {
    title: 'Signals + Logic',
    types: ['constant', 'math', 'compare', 'gate', 'router', 'delay', 'poll'],
    icon: '🧪',
  },
  { title: 'Bundles + Templates', types: ['bundle', 'template'], icon: '🧩' },
  { title: 'IO + Fetch', types: ['http', 'database', 'db_schema'], icon: '🌐' },
  { title: 'Prompts + Models', types: ['prompt', 'model'], icon: '🤖' },
  { title: 'Agents', types: ['agent', 'learner_agent'], icon: '🧠' },
  { title: 'Viewers', types: ['viewer', 'notification'], icon: '👁' },
];

const SOUND_PALETTE_GROUPS: PaletteGroup[] = [
  { title: 'Sound Sources', types: ['audio_oscillator'], icon: '〰' },
  { title: 'Sound Outputs', types: ['audio_speaker', 'viewer'], icon: '🔊' },
  {
    title: 'Signal Control',
    types: ['trigger', 'simulation', 'constant', 'math', 'gate', 'router', 'delay', 'bundle'],
    icon: '🎛',
  },
];

export function CanvasSidebar(): React.JSX.Element {
  // --- Context Hooks ---
  const orchestrator = useAiPathsSettingsOrchestrator();
  const { nodes, edges, executionMode } = useGraphState();
  const { savePathConfig } = usePersistenceActions();
  const { runtimeRunStatus } = useRuntimeState();
  const {
    fireTrigger,
    fireTriggerPersistent,
    pauseActiveRun: pauseRun,
    resumeActiveRun: resumeRun,
    stepActiveRun: stepRun,
    cancelActiveRun: cancelRun,
    clearWires,
  } = useRuntimeActions();
  const { paletteCollapsed, expandedPaletteGroups } = usePresetsState();
  const { setPaletteCollapsed, togglePaletteGroup } = usePresetsActions();
  const { selectedNodeId, selectedEdgeId } = useSelectionState();
  const { selectEdge, setConfigOpen, setSimulationOpenNodeId } = useSelectionActions();
  const palette: NodeDefinition[] = orchestrator.palette;
  const handleDragStart = orchestrator.handleDragStart;
  const updateSelectedNode = orchestrator.updateSelectedNode;
  const deleteSelectedNode = orchestrator.handleDeleteSelectedNode;
  const handleRemoveEdge = orchestrator.handleRemoveEdge;
  const runStatus = runtimeRunStatus;

  // --- Derived ---
  const selectedNode = useMemo(() => 
    selectedNodeId ? nodes.find(n => n.id === selectedNodeId) ?? null : null
  , [nodes, selectedNodeId]);

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
  const [paletteMode, setPaletteMode] = useState<PaletteMode>('data');
  const activePaletteGroups = useMemo(
    (): PaletteGroup[] => (paletteMode === 'sound' ? SOUND_PALETTE_GROUPS : DATA_PALETTE_GROUPS),
    [paletteMode]
  );

  return (
    <div className='space-y-4'>
      <div
        className='rounded-lg border border-border/60 bg-card/40 p-4'
        data-edge-panel
      >
        <div className='mb-3 flex items-center justify-between'>
          <span className='text-sm font-semibold text-white'>Node Palette</span>
          <button
            type='button'
            className='rounded border px-2 py-1 text-[10px] text-gray-300 hover:bg-muted/60'
            onClick={() => setPaletteCollapsed(!paletteCollapsed)}
          >
            {paletteCollapsed ? 'Expand' : 'Collapse'}
          </button>
        </div>
        <div className='mb-3 flex items-center gap-2'>
          <button
            type='button'
            className={`rounded border px-2 py-1 text-[10px] transition ${
              paletteMode === 'data'
                ? 'border-sky-400/50 bg-sky-500/10 text-sky-200'
                : 'border-border/60 text-gray-400 hover:bg-muted/40'
            }`}
            onClick={() => setPaletteMode('data')}
          >
            Data Signal
          </button>
          <button
            type='button'
            className={`rounded border px-2 py-1 text-[10px] transition ${
              paletteMode === 'sound'
                ? 'border-violet-400/50 bg-violet-500/10 text-violet-200'
                : 'border-border/60 text-gray-400 hover:bg-muted/40'
            }`}
            onClick={() => setPaletteMode('sound')}
          >
            Sound Signal
          </button>
        </div>
        {paletteCollapsed ? (
          <div className='rounded-md border border-dashed border-border/60 px-3 py-2 text-[11px] text-gray-500'>
            Palette collapsed. Expand to add nodes.
          </div>
        ) : (
          <div className='max-h-[520px] space-y-1 overflow-y-auto pr-1'>
            {activePaletteGroups.map((group) => {
              const items = palette.filter((node) => group.types.includes(node.type));
              if (items.length === 0) return null;
              const isExpanded = expandedPaletteGroups.has(group.title);
              return (
                <div key={group.title} className='rounded-md border border-border/60'>
                  <button
                    type='button'
                    onClick={() => togglePaletteGroup(group.title)}
                    className='flex w-full items-center justify-between px-3 py-2 text-left transition hover:bg-muted/40'
                  >
                    <div className='flex items-center gap-2'>
                      <span className='text-sm'>{group.icon}</span>
                      <span className='text-[11px] font-medium uppercase tracking-wide text-gray-300'>
                        {group.title}
                      </span>
                      <span className='rounded-full bg-muted/60 px-1.5 py-0.5 text-[10px] text-gray-400'>
                        {items.length}
                      </span>
                    </div>
                    <svg
                      className={`h-4 w-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill='none'
                      viewBox='0 0 24 24'
                      stroke='currentColor'
                    >
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 9l-7 7-7-7' />
                    </svg>
                  </button>
                  {isExpanded && (
                    <div className='space-y-2 px-3 pb-3'>
                      {items.map((node) => (
                        <div
                          key={node.title}
                          draggable
                          onDragStart={(event) => handleDragStart(event, node)}
                          className='cursor-grab rounded-md border border-border/60 bg-card/30 p-2 text-xs text-gray-300 transition hover:border-border/80 hover:bg-muted/50 active:cursor-grabbing'
                        >
                          {((): React.JSX.Element => {
                            const isScheduledTrigger =
                              node.type === 'trigger' && node.config?.trigger?.event === 'scheduled_run';
                            return (
                              <div className='flex items-center justify-between gap-2'>
                                <span className='text-xs font-semibold text-white'>
                                  {node.title}
                                </span>
                                <div className='flex items-center gap-1'>
                                  {isScheduledTrigger ? (
                                    <span className='rounded-full border border-amber-400/60 bg-amber-500/15 px-2 py-[1px] text-[9px] uppercase text-amber-200'>
                                      Scheduled
                                    </span>
                                  ) : null}
                                  <span className='text-[10px] uppercase text-gray-500'>
                                    {node.type}
                                  </span>
                                </div>
                              </div>
                            );
                          })()}
                          <p className='mt-1 text-[11px] text-gray-400'>
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
        <div className='rounded-lg border border-border/60 bg-card/40 p-4'>
          <div className='mb-3 text-sm font-semibold text-white'>Inspector</div>
          {selectedNode ? (
            <div className='space-y-3 text-xs text-gray-300'>
              <div className='rounded-md border border-border/60 bg-card/50 px-3 py-2 text-[11px] text-gray-400'>
                <div className='flex items-center justify-between'>
                  <span className='uppercase text-gray-500'>Type</span>
                  <div className='flex items-center gap-1'>
                    {selectedIsScheduledTrigger ? (
                      <span className='rounded-full border border-amber-400/60 bg-amber-500/15 px-2 py-[1px] text-[9px] uppercase text-amber-200'>
                        Scheduled
                      </span>
                    ) : null}
                    <span className='text-[10px] uppercase text-gray-300'>
                      {selectedNode.type}
                    </span>
                  </div>
                </div>
              </div>
              {selectedNode.type === 'trigger' && (
                <div className='space-y-2'>
                  <Button
                    className='w-full rounded-md border border-emerald-500/40 text-xs text-emerald-200 hover:bg-emerald-500/10'
                    type='button'
                    onClick={(event) => { void fireTrigger(selectedNode, event); }}
                  >
                    Fire Trigger
                  </Button>
                  {fireTriggerPersistent && (
                    <Button
                      className='w-full rounded-md border border-sky-500/40 text-xs text-sky-200 hover:bg-sky-500/10'
                      type='button'
                      onClick={(event) => { void fireTriggerPersistent(selectedNode, event); }}
                    >
                      Queue Persistent Run
                    </Button>
                  )}
                </div>
              )}
              {selectedNode.type === 'simulation' && (
                <Button
                  className='w-full rounded-md border border-cyan-500/40 text-xs text-cyan-200 hover:bg-cyan-500/10'
                  type='button'
                  onClick={() => setSimulationOpenNodeId(selectedNode.id)}
                >
                  Open Simulation
                </Button>
              )}
              <div>
                <Label className='text-[10px] uppercase text-gray-500'>Title</Label>
                <Input
                  className='mt-2 w-full rounded-md border bg-card/70 px-3 py-2 text-xs text-white'
                  value={selectedNode.title}
                  onChange={(event) => {
                    const patch: Partial<AiNode> = { title: event.target.value };
                    updateSelectedNode(patch, { nodeId: selectedNode.id });
                  }}
                  onBlur={() => {
                    void savePathConfig({ silent: true, includeNodeConfig: true, force: true });
                  }}
                />
              </div>
              <div>
                <Label className='text-[10px] uppercase text-gray-500'>Description</Label>
                <Textarea
                  className='mt-2 min-h-[64px] w-full rounded-md border bg-card/70 text-xs text-white'
                  value={selectedNode.description}
                  onChange={(event) => {
                    const patch: Partial<AiNode> = { description: event.target.value };
                    updateSelectedNode(patch, { nodeId: selectedNode.id });
                  }}
                  onBlur={() => {
                    void savePathConfig({ silent: true, includeNodeConfig: true, force: true });
                  }}
                />
              </div>
              <div className='rounded-md border border-border/60 bg-card/50 p-3 text-[11px] text-gray-400'>
                Inputs:{' '}
                {selectedNode.inputs.map((port) => formatPortLabel(port)).join(', ') ||
                  'None'}{' '}
                <br />
                Outputs:{' '}
                {selectedNode.outputs.map((port) => formatPortLabel(port)).join(', ') ||
                  'None'}
              </div>
              {selectedNode.type === 'prompt' && ((): React.JSX.Element | null => {
                const incomingEdges = edges.filter((edge) => edge.to === selectedNode.id);
                const inputPorts = incomingEdges
                  .map((edge) => edge.toPort)
                  .filter((port: string | undefined): port is string => Boolean(port));
                const bundleKeys = new Set<string>();
                incomingEdges.forEach((edge) => {
                  if (edge.toPort !== 'bundle') return;
                  const fromNode = nodes.find((node) => node.id === edge.from);
                  if (!fromNode) return;
                  if (fromNode.type === 'parser') {
                    const mappings =
                      fromNode.config?.parser?.mappings ??
                      createParserMappings(fromNode.outputs);
                    Object.keys(mappings).forEach((key) => {
                      const trimmed = key.trim();
                      if (trimmed) bundleKeys.add(trimmed);
                    });
                    return;
                  }
                  if (fromNode.type === 'bundle') {
                    fromNode.inputs.forEach((port) => {
                      const trimmed = port.trim();
                      if (trimmed) bundleKeys.add(trimmed);
                    });
                  }
                  if (fromNode.type === 'mapper') {
                    const mapperOutputs =
                      fromNode.config?.mapper?.outputs ?? fromNode.outputs;
                    mapperOutputs.forEach((output) => {
                      const trimmed = output.trim();
                      if (trimmed) bundleKeys.add(trimmed);
                    });
                  }
                });
                const directPlaceholders = inputPorts.filter((port) => port !== 'bundle');
                if (bundleKeys.size === 0 && directPlaceholders.length === 0) return null;
                return (
                  <div className='rounded-md border border-border/60 bg-card/50 p-3 text-[11px] text-gray-400'>
                    <div className='text-gray-300'>Prompt placeholders</div>
                    {bundleKeys.size > 0 && (
                      <div className='mt-2 flex flex-wrap gap-2'>
                        {Array.from(bundleKeys).map((key) => (
                          <span
                            key={key}
                            className='rounded-full border px-2 py-0.5 text-[10px] text-gray-200'
                          >
                            {formatPlaceholderLabel(key)}
                          </span>
                        ))}
                      </div>
                    )}
                    {directPlaceholders.length > 0 && (
                      <div className='mt-2 text-[11px] text-gray-500'>
                        Direct inputs:{' '}
                        {directPlaceholders
                          .map((port) => formatPlaceholderLabel(port))
                          .join(', ')}
                      </div>
                    )}
                  </div>
                );
              })()}
              <Button
                className='w-full rounded-md border text-xs text-white hover:bg-muted/60'
                onClick={() => setConfigOpen(true)}
              >
                Open Node Config
              </Button>
              <Button
                className='w-full rounded-md border border-rose-500/40 text-xs text-rose-200 hover:bg-rose-500/10'
                type='button'
                onClick={() => deleteSelectedNode()}
              >
                Remove Node
              </Button>
            </div>
          ) : (
            <div className='text-xs text-gray-500'>
              Select a node to inspect inputs, outputs, and configuration.
            </div>
          )}
        </div>
      )}

      {showRunControls && (
        <div className='rounded-lg border border-border/60 bg-card/40 p-4'>
          <div className='mb-3 flex items-center justify-between'>
            <span className='text-sm font-semibold text-white'>Run Controls</span>
            <span className='rounded border border-border/60 px-2 py-0.5 text-[10px] uppercase text-gray-400'>
              {runStatusLabel}
            </span>
          </div>
          <div className='grid grid-cols-2 gap-2'>
            {runStatus === 'running' || runStatus === 'stepping' ? (
              <>
                <Button
                  className='rounded-md border border-amber-500/40 text-xs text-amber-200 hover:bg-amber-500/10'
                  type='button'
                  onClick={pauseRun}
                  disabled={!pauseRun}
                >
                  Pause
                </Button>
                <Button
                  className='rounded-md border border-rose-500/40 text-xs text-rose-200 hover:bg-rose-500/10'
                  type='button'
                  onClick={cancelRun}
                  disabled={!cancelRun}
                >
                  Cancel
                </Button>
              </>
            ) : runStatus === 'paused' ? (
              <>
                <Button
                  className='rounded-md border border-emerald-500/40 text-xs text-emerald-200 hover:bg-emerald-500/10'
                  type='button'
                  onClick={resumeRun}
                  disabled={!resumeRun}
                >
                  Resume
                </Button>
                <Button
                  className='rounded-md border border-sky-500/40 text-xs text-sky-200 hover:bg-sky-500/10'
                  type='button'
                  onClick={() => stepRun?.(selectedNode?.type === 'trigger' ? selectedNode : undefined)}
                  disabled={!stepRun}
                >
                  Step
                </Button>
                <Button
                  className='col-span-2 rounded-md border border-rose-500/40 text-xs text-rose-200 hover:bg-rose-500/10'
                  type='button'
                  onClick={cancelRun}
                  disabled={!cancelRun}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                className='col-span-2 rounded-md border border-sky-500/40 text-xs text-sky-200 hover:bg-sky-500/10'
                type='button'
                onClick={() => stepRun?.(selectedNode?.type === 'trigger' ? selectedNode : undefined)}
                disabled={!stepRun}
              >
                Step Run
              </Button>
            )}
          </div>
        </div>
      )}

      <div className='rounded-lg border border-border/60 bg-card/40 p-4'>
        <div className='mb-3 text-sm font-semibold text-white'>Connections</div>
        <div className='space-y-2 text-xs text-gray-400'>
          <div>Active wires: {edges.length}</div>
          {selectedEdgeId ? ((): React.JSX.Element | null => {
            const selectedEdge = edges.find((edge) => edge.id === selectedEdgeId);
            const fromNode = selectedEdge ? nodes.find((n) => n.id === selectedEdge.from) : null;
            const toNode = selectedEdge ? nodes.find((n) => n.id === selectedEdge.to) : null;
            return selectedEdge ? (
              <div className='space-y-3 rounded-md border border-blue-500/30 bg-blue-500/5 p-3'>
                <div className='text-xs font-medium text-blue-300'>Selected Wire</div>
                <div className='space-y-2'>
                  <div className='rounded border border-border/60 bg-card/50 p-2'>
                    <div className='text-[10px] uppercase text-gray-500'>From</div>
                    <div className='text-sm text-white'>
                      {fromNode?.title ?? selectedEdge.from}
                    </div>
                    <div className='text-[11px] text-gray-400'>
                      Type:{' '}
                      <span className='text-amber-300'>
                        {fromNode?.type ?? 'unknown'}
                      </span>
                    </div>
                    <div className='text-[11px] text-gray-400'>
                      Port:{' '}
                      <span className='text-amber-300'>
                        {selectedEdge.fromPort ?? 'default'}
                      </span>
                    </div>
                  </div>
                  <div className='flex justify-center text-gray-500'>↓</div>
                  <div className='rounded border border-border/60 bg-card/50 p-2'>
                    <div className='text-[10px] uppercase text-gray-500'>To</div>
                    <div className='text-sm text-white'>
                      {toNode?.title ?? selectedEdge.to}
                    </div>
                    <div className='text-[11px] text-gray-400'>
                      Type:{' '}
                      <span className='text-sky-300'>
                        {toNode?.type ?? 'unknown'}
                      </span>
                    </div>
                    <div className='text-[11px] text-gray-400'>
                      Port:{' '}
                      <span className='text-sky-300'>
                        {selectedEdge.toPort ?? 'default'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className='flex gap-2'>
                  <Button
                    className='flex-1 rounded-md border border-border text-xs text-muted-foreground hover:bg-muted/50'
                    type='button'
                    onClick={() => selectEdge(null)}
                  >
                    Deselect
                  </Button>
                  <Button
                    className='flex-1 rounded-md border border-rose-500/40 text-xs text-rose-200 hover:bg-rose-500/10'
                    type='button'
                    onClick={() => handleRemoveEdge(selectedEdgeId)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ) : null;
          })() : (
            <div className='text-[11px] text-gray-500'>Click a wire to select it.</div>
          )}
          <Button
            className='w-full rounded-md border border-rose-500/40 text-xs text-rose-200 hover:bg-rose-500/10'
            type='button'
            onClick={clearWires}
          >
            Clear All Wires
          </Button>
        </div>
        {edges.length > 0 && (
          <div className='mt-3 space-y-2 text-[11px] text-gray-500'>
            {edges.map((edge): React.JSX.Element => {
              const fromNode = nodes.find((node) => node.id === edge.from);
              const toNode = nodes.find((node) => node.id === edge.to);
              const label = `${fromNode?.title ?? edge.from}.${edge.fromPort ?? '?'} → ${toNode?.title ?? edge.to}.${edge.toPort ?? '?'}`;
              const isSelected = edge.id === selectedEdgeId;
              return (
                <div
                  key={edge.id}
                  className={`flex items-center justify-between gap-2 rounded-md border px-2 py-1 text-[11px] ${
                    isSelected
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                      : 'border-border/60 bg-card/40'
                  }`}
                >
                  <span className='truncate'>{label}</span>
                  <button
                    type='button'
                    className='rounded border border-border/60 px-1.5 py-0.5 text-[9px] text-gray-400 hover:bg-muted/50'
                    onClick={() => selectEdge(edge.id)}
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
