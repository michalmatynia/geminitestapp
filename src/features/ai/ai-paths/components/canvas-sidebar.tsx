import React, { useMemo, useState } from 'react';

import { formatPlaceholderLabel, formatPortLabel } from '@/features/ai/ai-paths/utils/ui-utils';
import type { AiNode, NodeDefinition } from '@/shared/lib/ai-paths';
import { createParserMappings, formatRuntimeValue } from '@/shared/lib/ai-paths';
import {
  Button,
  Input,
  Label,
  Textarea,
  StatusBadge,
  Card,
  Badge,
  EmptyState,
  Hint,
} from '@/shared/ui';
import { cn } from '@/shared/utils';

import {
  useGraphState,
  usePersistenceActions,
  usePresetsState,
  usePresetsActions,
  useRunHistoryActions,
  useSelectionState,
  useSelectionActions,
  useRuntimeState,
  useRuntimeActions,
} from '../context';
import { usePaletteWithTriggerButtons } from './ai-paths-settings/hooks/usePaletteWithTriggerButtons';
import { useCanvasSidebarActions } from './hooks/useCanvasSidebarActions';

type PaletteMode = 'data' | 'sound';

type PaletteGroup = {
  title: string;
  types: NodeDefinition['type'][];
  icon: string;
};

const readPortRuntimeValue = (
  ports: Record<string, unknown> | undefined,
  port?: string | null
): unknown => {
  if (!ports) return undefined;
  const normalizedPort = typeof port === 'string' ? port.trim() : '';
  if (normalizedPort) {
    return ports[normalizedPort];
  }
  if (ports['context'] !== undefined) return ports['context'];
  if (ports['value'] !== undefined) return ports['value'];
  return undefined;
};

const DATA_PALETTE_GROUPS: PaletteGroup[] = [
  { title: 'Triggers', types: ['trigger'], icon: '⚡' },
  { title: 'Fetching + Simulation', types: ['fetcher', 'simulation'], icon: '🧪' },
  { title: 'Context + Parsing', types: ['context', 'parser'], icon: '📦' },
  {
    title: 'Transforms',
    types: [
      'mapper',
      'mutator',
      'string_mutator',
      'validator',
      'validation_pattern',
      'regex',
      'iterator',
    ],
    icon: '🧭',
  },
  {
    title: 'Signals + Logic',
    types: ['constant', 'math', 'compare', 'logical_condition', 'gate', 'router', 'delay', 'poll'],
    icon: '🧪',
  },
  { title: 'Bundles + Templates', types: ['bundle', 'template'], icon: '🧩' },
  {
    title: 'IO + Fetch',
    types: ['http', 'api_advanced', 'playwright', 'database', 'db_schema'],
    icon: '🌐',
  },
  { title: 'Prompts + Models', types: ['prompt', 'model'], icon: '🤖' },
  { title: 'Agents', types: ['agent', 'learner_agent'], icon: '🧠' },
  { title: 'Viewers', types: ['viewer', 'notification'], icon: '👁' },
];

const SOUND_PALETTE_GROUPS: PaletteGroup[] = [
  { title: 'Sound Sources', types: ['audio_oscillator'], icon: '〰' },
  { title: 'Sound Outputs', types: ['audio_speaker', 'viewer'], icon: '🔊' },
  {
    title: 'Signal Control',
    types: [
      'trigger',
      'fetcher',
      'simulation',
      'constant',
      'math',
      'gate',
      'router',
      'delay',
      'bundle',
    ],
    icon: '🎛',
  },
];

export function CanvasSidebar(): React.JSX.Element {
  const titleFieldId = React.useId();
  const descriptionFieldId = React.useId();
  const sourceConnectorDataId = React.useId();
  const targetConnectorDataId = React.useId();
  // --- Context Hooks ---
  const { nodes, edges, executionMode } = useGraphState();
  const { savePathConfig } = usePersistenceActions();
  const { runtimeRunStatus, runtimeState } = useRuntimeState();
  const { handoffRun } = useRunHistoryActions();
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
  const palette: NodeDefinition[] = usePaletteWithTriggerButtons();
  const {
    handleDragStart,
    updateSelectedNode,
    handleDeleteSelectedNode: deleteSelectedNode,
    handleRemoveEdge,
    ConfirmationModal,
  } = useCanvasSidebarActions();
  const runStatus = runtimeRunStatus;
  const activeRunId =
    runtimeState.currentRun && typeof runtimeState.currentRun === 'object'
      ? (runtimeState.currentRun.id ?? null)
      : null;

  // --- Derived ---
  const selectedNode = useMemo(
    () => (selectedNodeId ? (nodes.find((n) => n.id === selectedNodeId) ?? null) : null),
    [nodes, selectedNodeId]
  );

  const selectedIsScheduledTrigger =
    selectedNode?.type === 'trigger' && selectedNode.config?.trigger?.event === 'scheduled_run';

  const showRunControls = executionMode === 'local';
  const isRunControlActive = runStatus === 'running' || runStatus === 'stepping';
  const runStatusLabel = (() => {
    switch (runStatus) {
      case 'running':
        return 'Running';
      case 'blocked_on_lease':
        return 'Blocked On Lease';
      case 'handoff_ready':
        return 'Handoff Ready';
      case 'paused':
        return 'Paused';
      case 'stepping':
        return 'Stepping';
      default:
        return 'Idle';
    }
  })();
  const runStatusVariant =
    runStatus === 'running' || runStatus === 'stepping'
      ? 'processing'
      : runStatus === 'blocked_on_lease' || runStatus === 'handoff_ready' || runStatus === 'paused'
        ? 'warning'
        : 'neutral';
  const [isMarkingHandoff, setIsMarkingHandoff] = useState(false);
  const [handoffRequested, setHandoffRequested] = useState(false);
  const [paletteMode, setPaletteMode] = useState<PaletteMode>('data');
  const [paletteSearch, setPaletteSearch] = useState('');
  const normalizedPaletteSearch = paletteSearch.trim().toLowerCase();
  const isPaletteSearchActive = normalizedPaletteSearch.length > 0;
  const activePaletteGroups = useMemo(
    (): PaletteGroup[] => (paletteMode === 'sound' ? SOUND_PALETTE_GROUPS : DATA_PALETTE_GROUPS),
    [paletteMode]
  );
  const filteredPaletteGroups = useMemo(
    (): Array<{ group: PaletteGroup; items: NodeDefinition[] }> =>
      activePaletteGroups
        .map((group: PaletteGroup): { group: PaletteGroup; items: NodeDefinition[] } => {
          const items = palette.filter((node: NodeDefinition): boolean => {
            if (!group.types.includes(node.type)) return false;
            if (!isPaletteSearchActive) return true;
            const title = node.title.toLowerCase();
            const type = node.type.toLowerCase();
            const description = node.description.toLowerCase();
            return (
              title.includes(normalizedPaletteSearch) ||
              type.includes(normalizedPaletteSearch) ||
              description.includes(normalizedPaletteSearch)
            );
          });
          return { group, items };
        })
        .filter(
          (entry: { group: PaletteGroup; items: NodeDefinition[] }): boolean =>
            entry.items.length > 0
        ),
    [activePaletteGroups, isPaletteSearchActive, normalizedPaletteSearch, palette]
  );
  const totalFilteredPaletteItems = useMemo(
    (): number =>
      filteredPaletteGroups.reduce(
        (total: number, entry: { group: PaletteGroup; items: NodeDefinition[] }): number =>
          total + entry.items.length,
        0
      ),
    [filteredPaletteGroups]
  );

  return (
    <>
      <div className='space-y-4'>
        <Card className='border-border/60 bg-card/40 p-4' data-edge-panel>
          <div className='mb-3 flex items-center justify-between'>
            <Hint size='xs' uppercase={false} className='font-semibold text-white'>
            Node Palette
            </Hint>
            <button
              data-doc-id='palette_toggle'
              type='button'
              className='rounded border px-2 py-1 text-[10px] text-gray-300 hover:bg-muted/60'
              onClick={() => setPaletteCollapsed(!paletteCollapsed)}
              aria-label={paletteCollapsed ? 'Expand node palette' : 'Collapse node palette'}
              aria-expanded={!paletteCollapsed}
            >
              {paletteCollapsed ? 'Expand' : 'Collapse'}
            </button>
          </div>
          <div className='mb-3 flex items-center gap-2'>
            <button
              data-doc-id='palette_mode_data'
              type='button'
              onClick={() => setPaletteMode('data')}
              aria-label='Show data signal nodes'
              title='Data signal'
              aria-pressed={paletteMode === 'data'}
            >
              <StatusBadge
                status='Data Signal'
                variant={paletteMode === 'data' ? 'info' : 'neutral'}
                size='sm'
                className={cn('font-medium cursor-pointer', paletteMode !== 'data' && 'opacity-60')}
              />
            </button>
            <button
              data-doc-id='palette_mode_sound'
              type='button'
              onClick={() => setPaletteMode('sound')}
              aria-label='Show sound signal nodes'
              title='Sound signal'
              aria-pressed={paletteMode === 'sound'}
            >
              <StatusBadge
                status='Sound Signal'
                variant={paletteMode === 'sound' ? 'processing' : 'neutral'}
                size='sm'
                className={cn('font-medium cursor-pointer', paletteMode !== 'sound' && 'opacity-60')}
              />
            </button>
          </div>
          <div className='mb-3'>
            <Input
              data-doc-id='palette_search'
              value={paletteSearch}
              onChange={(event) => setPaletteSearch(event.target.value)}
              placeholder='Search nodes...'
              aria-label='Search node palette'
              className='h-8 w-full rounded-md border bg-card/70 px-3 text-xs text-white placeholder:text-gray-500'
             title='Search nodes...'/>
            {isPaletteSearchActive ? (
              <p className='mt-1 text-[10px] text-gray-500'>
                {totalFilteredPaletteItems > 0
                  ? `${totalFilteredPaletteItems} matching node${totalFilteredPaletteItems === 1 ? '' : 's'}`
                  : 'No matching nodes'}
              </p>
            ) : null}
          </div>
          {paletteCollapsed ? (
            <EmptyState
              title='Palette collapsed'
              description='Expand to add nodes.'
              variant='compact'
              className='border-dashed border-border/60 bg-transparent py-4'
            />
          ) : (
            <div className='max-h-[520px] space-y-1 overflow-y-auto pr-1'>
              {filteredPaletteGroups.length === 0 ? (
                <EmptyState
                  title='No matches'
                  description='No nodes match your search.'
                  variant='compact'
                  className='border-dashed border-border/60 bg-transparent py-4'
                />
              ) : (
                filteredPaletteGroups.map(({ group, items }) => {
                  const isExpanded = isPaletteSearchActive || expandedPaletteGroups.has(group.title);
                  return (
                    <div key={group.title} className='rounded-md border border-border/60'>
                      <button
                        type='button'
                        onClick={() => {
                          if (isPaletteSearchActive) return;
                          togglePaletteGroup(group.title);
                        }}
                        className='flex w-full items-center justify-between px-3 py-2 text-left transition hover:bg-muted/40'
                        aria-label={'Hint'}
                        title={'Hint'}>
                        <div className='flex items-center gap-2'>
                          <span className='text-sm'>{group.icon}</span>
                          <Hint size='xs' uppercase className='font-medium text-gray-300'>
                            {group.title}
                          </Hint>
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
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M19 9l-7 7-7-7'
                          />
                        </svg>
                      </button>
                      {isExpanded && (
                        <div className='space-y-2 px-3 pb-3'>
                          {items.map((node) => (
                            <div
                              key={node.title}
                              draggable
                              data-doc-id={`node_palette_${node.type}`}
                              onDragStart={(event) => handleDragStart(event, node)}
                              title={`Drag ${node.title} to the canvas`}
                              className='cursor-grab rounded-md border border-border/60 bg-card/30 p-2 text-xs text-gray-300 transition hover:border-border/80 hover:bg-muted/50 active:cursor-grabbing'
                            >
                              {((): React.JSX.Element => {
                                const isScheduledTrigger =
                                node.type === 'trigger' &&
                                node.config?.trigger?.event === 'scheduled_run';
                                return (
                                  <div className='flex items-center justify-between gap-2'>
                                    <Hint
                                      size='xs'
                                      uppercase={false}
                                      className='font-semibold text-white'
                                    >
                                      {node.title}
                                    </Hint>
                                    <div className='flex items-center gap-1'>
                                      {isScheduledTrigger ? (
                                        <StatusBadge
                                          status='Scheduled'
                                          variant='warning'
                                          size='sm'
                                          className='font-bold h-4 px-1.5'
                                        />
                                      ) : null}
                                      <span className='text-[10px] uppercase text-gray-500'>
                                        {node.type}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })()}
                              <p className='mt-1 text-[11px] text-gray-400'>{node.description}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </Card>

        {!selectedEdgeId && (
          <Card className='border-border/60 bg-card/40 p-4'>
            <Hint size='xs' uppercase={false} className='mb-3 font-semibold text-white'>
            Inspector
            </Hint>{' '}
            {selectedNode ? (
              <div className='space-y-3 text-xs text-gray-300'>
                <Card
                  variant='subtle-compact'
                  padding='sm'
                  className='border-border/60 bg-card/50 text-[11px] text-gray-400'
                >
                  <div className='flex items-center justify-between'>
                    <span className='uppercase text-gray-500'>Type</span>
                    <div className='flex items-center gap-1'>
                      {selectedIsScheduledTrigger ? (
                        <StatusBadge
                          status='Scheduled'
                          variant='warning'
                          size='sm'
                          className='font-bold h-4 px-1.5'
                        />
                      ) : null}
                      <span className='text-[10px] uppercase text-gray-300'>{selectedNode.type}</span>
                    </div>
                  </div>
                </Card>
                {selectedNode.type === 'trigger' && (
                  <div className='space-y-2'>
                    <Button
                      className='w-full'
                      variant='success'
                      size='sm'
                      type='button'
                      onClick={(event) => {
                        void fireTrigger(selectedNode, event);
                      }}
                    >
                    Fire Trigger
                    </Button>
                    {fireTriggerPersistent && (
                      <Button
                        className='w-full'
                        variant='info'
                        size='sm'
                        type='button'
                        onClick={(event) => {
                          void fireTriggerPersistent(selectedNode, event);
                        }}
                      >
                      Queue Persistent Run
                      </Button>
                    )}
                  </div>
                )}
                {selectedNode.type === 'simulation' && (
                  <Button
                    className='w-full'
                    variant='info'
                    size='sm'
                    type='button'
                    onClick={() => setSimulationOpenNodeId(selectedNode.id)}
                  >
                  Open Simulation
                  </Button>
                )}
                <div>
                  <Label htmlFor={titleFieldId} className='text-[10px] uppercase text-gray-500'>
                    Title
                  </Label>
                  <Input
                    id={titleFieldId}
                    data-doc-id='inspector_node_title'
                    className='mt-2 w-full rounded-md border bg-card/70 px-3 py-2 text-xs text-white'
                    value={selectedNode.title ?? ''}
                    onChange={(event) => {
                      const patch: Partial<AiNode> = { title: event.target.value };
                      updateSelectedNode(patch, { nodeId: selectedNode.id });
                    }}
                    onBlur={() => {
                      void savePathConfig({ silent: true, includeNodeConfig: true, force: true });
                    }}
                   aria-label={titleFieldId} title={titleFieldId}/>
                </div>
                <div>
                  <Label
                    htmlFor={descriptionFieldId}
                    className='text-[10px] uppercase text-gray-500'
                  >
                    Description
                  </Label>
                  <Textarea
                    id={descriptionFieldId}
                    data-doc-id='inspector_node_description'
                    className='mt-2 min-h-[64px] w-full rounded-md border bg-card/70 text-xs text-white'
                    value={selectedNode.description ?? ''}
                    onChange={(event) => {
                      const patch: Partial<AiNode> = { description: event.target.value };
                      updateSelectedNode(patch, { nodeId: selectedNode.id });
                    }}
                    onBlur={() => {
                      void savePathConfig({ silent: true, includeNodeConfig: true, force: true });
                    }}
                   aria-label={descriptionFieldId} title={descriptionFieldId}/>
                </div>
                <Card
                  variant='subtle-compact'
                  padding='sm'
                  className='border-border/60 bg-card/50 text-[11px] text-gray-400'
                >
                Inputs:{' '}
                  {selectedNode.inputs.map((port: string) => formatPortLabel(port)).join(', ') ||
                  'None'}{' '}
                  <br />
                Outputs:{' '}
                  {selectedNode.outputs.map((port: string) => formatPortLabel(port)).join(', ') ||
                  'None'}
                </Card>
                {selectedNode.type === 'prompt' &&
                ((): React.JSX.Element | null => {
                  const incomingEdges = edges.filter((edge) => edge.to === selectedNode.id);
                  const inputPorts = incomingEdges
                    .map((edge) => edge.toPort)
                    .filter((port: string | null | undefined): port is string => Boolean(port));
                  const bundleKeys = new Set<string>();
                  incomingEdges.forEach((edge) => {
                    if (edge.toPort !== 'bundle') return;
                    const fromNode = nodes.find((node) => node.id === edge.from);
                    if (!fromNode) return;
                    if (fromNode.type === 'parser') {
                      const mappings =
                        fromNode.config?.parser?.mappings ?? createParserMappings(fromNode.outputs);
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
                      const mapperOutputs = fromNode.config?.mapper?.outputs ?? fromNode.outputs;
                      mapperOutputs.forEach((output: string) => {
                        const trimmed = output.trim();
                        if (trimmed) bundleKeys.add(trimmed);
                      });
                    }
                  });
                  const directPlaceholders = inputPorts.filter((port) => port !== 'bundle');
                  if (bundleKeys.size === 0 && directPlaceholders.length === 0) return null;
                  return (
                    <Card
                      variant='subtle-compact'
                      padding='sm'
                      className='border-border/60 bg-card/50 text-[11px] text-gray-400'
                    >
                      <div className='text-gray-300'>Prompt placeholders</div>
                      {bundleKeys.size > 0 && (
                        <div className='mt-2 flex flex-wrap gap-2'>
                          {Array.from(bundleKeys).map((key) => (
                            <Badge key={key} variant='outline' className='text-[10px] font-normal'>
                              {formatPlaceholderLabel(key)}
                            </Badge>
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
                    </Card>
                  );
                })()}
                <Button
                  data-doc-id='inspector_open_node_config'
                  className='w-full rounded-md border text-xs text-white hover:bg-muted/60'
                  onClick={() => setConfigOpen(true)}
                >
                Open Node Config
                </Button>
                <Button
                  data-doc-id='inspector_remove_node'
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
          </Card>
        )}

        {showRunControls && (
          <Card className='border-border/60 bg-card/40 p-4'>
            <div className='mb-3 flex items-center justify-between'>
              <span className='text-sm font-semibold text-white'>Run Controls</span>
              <StatusBadge
                status={runStatusLabel}
                variant={runStatusVariant}
                size='sm'
                className='font-bold'
              />
            </div>
            {runStatus === 'blocked_on_lease' ? (
              <Card
                variant='warning'
                padding='sm'
                className='mb-3 space-y-1 border-amber-500/30 bg-amber-500/10 text-[11px] text-amber-100'
              >
                <div className='font-semibold text-white'>Execution lease blocked</div>
                <div>
                  This run is waiting on another execution owner. Use the run history or run detail
                  panel to inspect ownership and mark the run handoff-ready if work should change
                  hands.
                </div>
                {activeRunId ? (
                  <div className='flex flex-wrap items-center gap-2 pt-1'>
                    <Button
                      variant='outline'
                      size='sm'
                      type='button'
                      onClick={() => {
                        setIsMarkingHandoff(true);
                        setHandoffRequested(false);
                        void handoffRun(activeRunId)
                          .then((ok: boolean) => {
                            setHandoffRequested(ok);
                          })
                          .finally(() => {
                            setIsMarkingHandoff(false);
                          });
                      }}
                      disabled={isMarkingHandoff}
                    >
                      {isMarkingHandoff ? 'Marking...' : 'Mark handoff-ready'}
                    </Button>
                    {handoffRequested ? (
                      <span className='text-[10px] text-current/80'>
                        Handoff requested. Refreshing run status...
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </Card>
            ) : null}
            {runStatus === 'handoff_ready' ? (
              <Card
                variant='info'
                padding='sm'
                className='mb-3 space-y-1 border-blue-500/30 bg-blue-500/10 text-[11px] text-blue-100'
              >
                <div className='font-semibold text-white'>Ready for delegated continuation</div>
                <div>
                  This run has been prepared for another operator or agent to continue. Resume it
                  from the run history once the next owner is ready.
                </div>
              </Card>
            ) : null}
            <div className='grid grid-cols-2 gap-2'>
              {isRunControlActive ? (
                <>
                  <Button
                    variant='warning'
                    size='sm'
                    type='button'
                    onClick={pauseRun}
                    disabled={!pauseRun}
                  >
                  Pause
                  </Button>
                  <Button
                    variant='destructive'
                    size='sm'
                    type='button'
                    onClick={cancelRun}
                    disabled={!cancelRun}
                  >
                  Cancel
                  </Button>
                </>
              ) : runStatus === 'blocked_on_lease' || runStatus === 'handoff_ready' ? (
                <Button
                  className='col-span-2'
                  variant='destructive'
                  size='sm'
                  type='button'
                  onClick={cancelRun}
                  disabled={!cancelRun}
                >
                Cancel
                </Button>
              ) : runStatus === 'paused' ? (
                <>
                  <Button
                    variant='success'
                    size='sm'
                    type='button'
                    onClick={resumeRun}
                    disabled={!resumeRun}
                  >
                  Resume
                  </Button>
                  <Button
                    variant='info'
                    size='sm'
                    type='button'
                    onClick={() => {
                      const node = selectedNode?.type === 'trigger' ? selectedNode : undefined;
                      stepRun(node);
                    }}
                    disabled={!stepRun}
                  >
                  Step
                  </Button>
                  <Button
                    className='col-span-2'
                    variant='destructive'
                    size='sm'
                    type='button'
                    onClick={cancelRun}
                    disabled={!cancelRun}
                  >
                  Cancel
                  </Button>
                </>
              ) : (
                <Button
                  className='col-span-2'
                  variant='info'
                  size='sm'
                  type='button'
                  onClick={() => {
                    const node = selectedNode?.type === 'trigger' ? selectedNode : undefined;
                    stepRun(node);
                  }}
                  disabled={!stepRun}
                >
                Step Run
                </Button>
              )}
            </div>
          </Card>
        )}

        <Card className='border-border/60 bg-card/40 p-4'>
          <Hint size='xs' uppercase={false} className='mb-3 font-semibold text-white'>
          Connections
          </Hint>
          <div className='space-y-2 text-xs text-gray-400'>
            <div>Active wires: {edges.length}</div>
            {selectedEdgeId ? (
              ((): React.JSX.Element | null => {
                const selectedEdge = edges.find((edge) => edge.id === selectedEdgeId);
                const fromNodeId = selectedEdge?.from;
                const toNodeId = selectedEdge?.to;
                const fromNode = fromNodeId ? nodes.find((n) => n.id === fromNodeId) : null;
                const toNode = toNodeId ? nodes.find((n) => n.id === toNodeId) : null;
                const sourceOutputs = fromNodeId ? runtimeState.outputs?.[fromNodeId] : undefined;
                const targetInputs = toNodeId ? runtimeState.inputs?.[toNodeId] : undefined;
                const sourceValue = selectedEdge
                  ? readPortRuntimeValue(sourceOutputs, selectedEdge.fromPort)
                  : undefined;
                const targetValue = selectedEdge
                  ? readPortRuntimeValue(targetInputs, selectedEdge.toPort)
                  : undefined;
                return selectedEdge ? (
                  <Card
                    variant='info'
                    padding='sm'
                    className='space-y-3 border-blue-500/30 bg-blue-500/5'
                  >
                    <Hint size='xs' uppercase={false} className='font-medium text-blue-300'>
                    Selected Wire
                    </Hint>
                    <div className='space-y-2'>
                      <Card
                        variant='subtle-compact'
                        padding='sm'
                        className='border-border/60 bg-card/50'
                      >
                        <Hint size='xxs' uppercase className='text-gray-500'>
                        From
                        </Hint>
                        <div className='text-sm text-white'>
                          {fromNode?.title ?? selectedEdge.from}
                        </div>
                        <div className='text-[11px] text-gray-400'>
                        Type: <span className='text-amber-300'>{fromNode?.type ?? 'unknown'}</span>
                        </div>
                        <div className='text-[11px] text-gray-400'>
                        Port:{' '}
                          <span className='text-amber-300'>{selectedEdge.fromPort ?? 'default'}</span>
                        </div>
                      </Card>
                      <div className='flex justify-center text-gray-500'>↓</div>
                      <Card
                        variant='subtle-compact'
                        padding='sm'
                        className='border-border/60 bg-card/50'
                      >
                        <Hint size='xxs' uppercase className='text-gray-500'>
                        To
                        </Hint>
                        <div className='text-sm text-white'>{toNode?.title ?? selectedEdge.to}</div>
                        <div className='text-[11px] text-gray-400'>
                        Type: <span className='text-sky-300'>{toNode?.type ?? 'unknown'}</span>
                        </div>
                        <div className='text-[11px] text-gray-400'>
                        Port:{' '}
                          <span className='text-sky-300'>{selectedEdge.toPort ?? 'default'}</span>
                        </div>
                      </Card>
                    </div>
                    <Card
                      variant='subtle-compact'
                      padding='sm'
                      className='space-y-2 border-border/60 bg-card/40'
                    >
                      <Hint size='xxs' uppercase className='text-gray-500'>
                      Connector Data
                      </Hint>
                      <div>
                        <div id={sourceConnectorDataId} className='text-[10px] text-amber-300'>
                        Source ({selectedEdge.fromPort ?? 'default'})
                        </div>
                        <pre
                          className='mt-1 max-h-28 overflow-auto whitespace-pre-wrap rounded border border-border/50 bg-black/30 px-2 py-1 text-[10px] text-gray-200'
                          aria-labelledby={sourceConnectorDataId}
                        >
                          {sourceValue === undefined
                            ? 'No runtime output yet.'
                            : formatRuntimeValue(sourceValue)}
                        </pre>
                      </div>
                      <div>
                        <div id={targetConnectorDataId} className='text-[10px] text-sky-300'>
                        Target ({selectedEdge.toPort ?? 'default'})
                        </div>
                        <pre
                          className='mt-1 max-h-28 overflow-auto whitespace-pre-wrap rounded border border-border/50 bg-black/30 px-2 py-1 text-[10px] text-gray-200'
                          aria-labelledby={targetConnectorDataId}
                        >
                          {targetValue === undefined
                            ? 'No runtime input yet.'
                            : formatRuntimeValue(targetValue)}
                        </pre>
                      </div>
                    </Card>
                    <div className='flex gap-2'>
                      <Button
                        className='flex-1'
                        variant='outline'
                        size='sm'
                        type='button'
                        onClick={() => selectEdge(null)}
                      >
                      Deselect
                      </Button>
                      <Button
                        className='flex-1'
                        variant='destructive'
                        size='sm'
                        type='button'
                        onClick={() => handleRemoveEdge(selectedEdgeId)}
                      >
                      Remove
                      </Button>
                    </div>
                  </Card>
                ) : null;
              })()
            ) : (
              <div className='text-[11px] text-gray-500'>Click a wire to select it.</div>
            )}
            <Button
              className='w-full'
              variant='destructive'
              size='sm'
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
        </Card>
      </div>
      <ConfirmationModal />
    </>
  );
}
