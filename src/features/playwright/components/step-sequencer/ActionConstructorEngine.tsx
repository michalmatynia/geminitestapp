'use client';

import type { DraggableProvided, DropResult } from '@hello-pangea/dnd';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Code2,
  Folder,
  GripVertical,
  Layers,
  ListChecks,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Save,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
} from 'lucide-react';
import { memo, useEffect, useMemo, useRef, useState } from 'react';

import type { PlaywrightResolvedActionBlock } from '../../context/PlaywrightStepSequencerContext.types';
import {
  PLAYWRIGHT_STEP_TYPE_LABELS,
  type PlaywrightActionExecutionBrowserPreference,
  type PlaywrightStep,
  type PlaywrightStepSet,
} from '@/shared/contracts/playwright-steps';
import { STEP_REGISTRY, type StepId } from '@/shared/lib/browser-execution/step-registry';
import {
  playwrightDeviceOptions,
  playwrightIdentityProfileOptions,
  playwrightProxyProviderPresetOptions,
  playwrightProxySessionModeOptions,
} from '@/shared/lib/playwright/settings';
import {
  createMasterFolderTreeTransactionAdapter,
  FolderTreeViewportV2,
  useMasterFolderTreeShell,
  type FolderTreeViewportRenderNodeInput,
} from '@/shared/lib/foldertree/public';
import {
  Badge,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/primitives.public';
import { cn } from '@/shared/utils/ui-utils';

import { usePlaywrightPersonas } from '@/features/playwright/hooks/usePlaywrightPersonas';

import { usePlaywrightStepSequencer } from '../../context/PlaywrightStepSequencerContext';
import {
  buildStepSequencerMasterNodes,
  decodeStepSeqNodeId,
} from '../../step-sequencer-master-tree';
import { ActionSequenceCodePreviewDialog } from './ActionSequenceCodePreviewDialog';
import { StepCodePreviewDialog } from './StepCodePreviewDialog';
import { StepSetCodePreviewDialog } from './StepSetCodePreviewDialog';
import { StepTypeIcon } from './StepTypeIcon';

type RuntimeStepGroup = {
  id: string;
  label: string;
  stepIds: readonly StepId[];
};

const RUNTIME_STEP_GROUPS: readonly RuntimeStepGroup[] = [
  {
    id: 'browser_session',
    label: 'Browser & Session',
    stepIds: [
      'browser_preparation',
      'browser_open',
      'browser_close',
      'cookie_accept',
      'auth_check',
      'auth_login',
      'auth_manual',
    ],
  },
  {
    id: 'shared_listing',
    label: 'Shared Listing',
    stepIds: [
      'sync_check',
      'image_upload',
      'title_fill',
      'description_fill',
      'price_set',
      'category_select',
      'publish',
      'publish_verify',
    ],
  },
  {
    id: 'tradera',
    label: 'Tradera',
    stepIds: [
      'duplicate_check',
      'deep_duplicate_check',
      'sell_page_open',
      'image_cleanup',
      'listing_format_select',
      'attribute_select',
      'shipping_set',
      'overview_open',
      'search_active',
      'inspect_active',
      'search_unsold',
      'inspect_unsold',
      'search_sold',
      'inspect_sold',
      'resolve_status',
    ],
  },
  {
    id: 'vinted',
    label: 'Vinted',
    stepIds: ['brand_fill', 'condition_set', 'size_set'],
  },
];

const toNullableInteger = (value: string): number | null => {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const toNullableFloat = (value: string): number | null => {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

const toPermissionList = (value: string): string[] =>
  value
    .split(',')
    .map((permission) => permission.trim())
    .filter((permission) => permission.length > 0);

// ---------------------------------------------------------------------------
// Tree node renderer
// ---------------------------------------------------------------------------

type TreeNodeProps = FolderTreeViewportRenderNodeInput & {
  onAddToAction: (stepSetId: string) => void;
};

const ActionConstructorTreeNode = memo((
  props: TreeNodeProps
): React.JSX.Element => {
  const {
    node,
    depth,
    hasChildren,
    isExpanded,
    isSelected,
    isDragging,
    dropPosition,
    select,
    toggleExpand,
    onAddToAction,
  } = props;

  const decoded = decodeStepSeqNodeId(node.id);
  const isStepSet = decoded?.entity === 'step_set';

  const stateClassName = isSelected
    ? 'bg-sky-600/20 text-white ring-1 ring-inset ring-sky-400/40'
    : dropPosition === 'before' || dropPosition === 'after'
      ? 'bg-sky-500/10 ring-1 ring-inset ring-sky-500/60'
      : isDragging
        ? 'opacity-50'
        : 'text-gray-300 hover:bg-muted/40';

  return (
    <div
      className={cn(
        'group flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-xs transition-all',
        stateClassName
      )}
      style={{ paddingLeft: `${depth * 14 + 8}px` }}
    >
      {/* Expand/collapse toggle */}
      {hasChildren ? (
        <button
          type='button'
          onClick={(e) => {
            e.stopPropagation();
            toggleExpand();
          }}
          className='inline-flex size-4 items-center justify-center text-gray-500 hover:text-gray-300'
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? <ChevronDown className='size-3' /> : <ChevronRight className='size-3' />}
        </button>
      ) : (
        <span className='inline-flex size-4 items-center justify-center opacity-40'>
          {isStepSet ? <Layers className='size-3 text-sky-400' /> : <Folder className='size-3' />}
        </span>
      )}

      {/* Node label */}
      <button
        type='button'
        onClick={select}
        className='min-w-0 flex-1 truncate text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-400'
      >
        <span className='truncate'>{node.name}</span>
        {isStepSet && node.metadata?.['stepCount'] !== undefined ? (
          <Badge
            variant='neutral'
            className='ml-1.5 h-4 shrink-0 px-1 text-[9px] border-border/50 bg-card/40'
          >
            {String(node.metadata['stepCount'])} steps
          </Badge>
        ) : null}
      </button>

      {/* Quick-add button for step sets */}
      {isStepSet && decoded !== null ? (
        <button
          type='button'
          onClick={(e) => {
            e.stopPropagation();
            onAddToAction(decoded.id);
          }}
          className='invisible ml-auto inline-flex size-5 items-center justify-center rounded text-sky-400 opacity-80 hover:bg-sky-500/20 hover:opacity-100 group-hover:visible'
          aria-label={`Add ${node.name} to action`}
          title='Add to action'
        >
          <Plus className='size-3' />
        </button>
      ) : null}
    </div>
  );
});

// ---------------------------------------------------------------------------
// Action sequence (right side of the engine)
// ---------------------------------------------------------------------------

function ActionSequenceItem({
  item,
  index,
  dragProvided,
  isDragging,
  onPreviewStep,
  onPreviewStepSet,
}: {
  item: PlaywrightResolvedActionBlock;
  index: number;
  dragProvided: DraggableProvided;
  isDragging: boolean;
  onPreviewStep: (step: PlaywrightStep) => void;
  onPreviewStepSet: (stepSet: PlaywrightStepSet) => void;
}): React.JSX.Element {
  const { handleRemoveFromAction, handleToggleActionBlockEnabled } = usePlaywrightStepSequencer();
  const { block, runtimeStepLabel, step, stepSet } = item;
  const isStep = block.kind === 'step';
  const isRuntimeStep = block.kind === 'runtime_step';
  const displayName =
    block.label ??
    (isRuntimeStep ? runtimeStepLabel : null) ??
    step?.name ??
    stepSet?.name ??
    `(deleted ${block.kind}: ${block.refId})`;
  const isMissing = isRuntimeStep ? runtimeStepLabel === null : isStep ? step === null : stepSet === null;
  const badgeLabel = isRuntimeStep
    ? 'Runtime step'
    : isStep
      ? (step ? PLAYWRIGHT_STEP_TYPE_LABELS[step.type] : 'Missing step')
      : `${stepSet?.stepIds.length ?? 0} steps`;
  const previewStep: PlaywrightStep | null = step ?? (
    isRuntimeStep && runtimeStepLabel
      ? {
          id: block.refId,
          name: runtimeStepLabel,
          description: 'Browser-execution runtime step module.',
          type: 'custom_script',
          selector: null,
          value: null,
          url: null,
          key: null,
          timeout: null,
          script: `await runtimeSteps[${JSON.stringify(block.refId)}](context);`,
          inputBindings: {},
          websiteId: null,
          flowId: null,
          tags: ['runtime_step'],
          sortOrder: index,
          createdAt: '',
          updatedAt: '',
        }
      : null
  );

  return (
    <div
      ref={dragProvided.innerRef}
      {...dragProvided.draggableProps}
      className={cn(
        'group flex items-center gap-2 rounded border border-border/40 bg-card/30 px-2 py-1.5 transition-shadow',
        !block.enabled && 'opacity-60',
        isDragging && 'shadow-lg ring-1 ring-sky-500/40 opacity-90'
      )}
    >
      {/* Drag handle */}
      <span
        {...dragProvided.dragHandleProps}
        className='inline-flex cursor-grab items-center text-muted-foreground/40 hover:text-muted-foreground active:cursor-grabbing'
        aria-label='Drag to reorder'
      >
        <GripVertical className='size-3.5 shrink-0' />
      </span>

      <span className='shrink-0 w-4 text-right text-[10px] font-mono text-muted-foreground'>
        {index + 1}.
      </span>

      <span className='inline-flex shrink-0 items-center'>
        {isRuntimeStep ? (
          <ListChecks className='size-3.5 text-sky-300' />
        ) : isStep ? (
          step ? (
            <StepTypeIcon type={step.type} className='size-3.5' />
          ) : (
            <AlertTriangle className='size-3.5 text-amber-400' />
          )
        ) : (
          <Layers className='size-3.5 text-sky-400' />
        )}
      </span>

      <div className='min-w-0 flex-1'>
        <div className={cn(
          'truncate text-xs font-medium',
          isMissing && 'text-muted-foreground line-through'
        )}>
          {displayName}
        </div>
        <div className='flex items-center gap-1 text-[10px] text-muted-foreground'>
          <span>{isRuntimeStep ? 'Runtime step' : isStep ? 'Direct step' : 'Step set'}</span>
          {!block.enabled ? <span>• disabled</span> : null}
        </div>
      </div>

      <Badge variant='neutral' className='shrink-0 h-4 px-1 text-[9px] border-border/50 bg-card/40'>
        {badgeLabel}
      </Badge>

      {previewStep ? (
        <button
          type='button'
          onClick={() => onPreviewStep(previewStep)}
          className='inline-flex size-5 items-center justify-center rounded text-muted-foreground hover:text-sky-300'
          aria-label='Preview Playwright code'
          title='Preview semantic Playwright code'
        >
          <Code2 className='size-3.5' />
        </button>
      ) : null}

      {!previewStep && stepSet ? (
        <button
          type='button'
          onClick={() => onPreviewStepSet(stepSet)}
          className='inline-flex size-5 items-center justify-center rounded text-muted-foreground hover:text-sky-300'
          aria-label='Preview composed Playwright code'
          title='Preview composed Playwright code'
        >
          <Code2 className='size-3.5' />
        </button>
      ) : null}

      <button
        type='button'
        onClick={() => handleToggleActionBlockEnabled(index)}
        className='inline-flex size-5 items-center justify-center rounded text-muted-foreground hover:text-sky-300'
        aria-label={block.enabled ? 'Disable action block' : 'Enable action block'}
        title={block.enabled ? 'Disable block' : 'Enable block'}
      >
        {block.enabled ? <ToggleRight className='size-3.5' /> : <ToggleLeft className='size-3.5' />}
      </button>

      <button
        type='button'
        onClick={() => handleRemoveFromAction(index)}
        className='invisible inline-flex size-5 items-center justify-center rounded text-muted-foreground hover:text-destructive group-hover:visible'
        aria-label='Remove from action'
      >
        <X className='size-3' />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main engine component
// ---------------------------------------------------------------------------

export function ActionConstructorEngine(): React.JSX.Element {
  const [previewStep, setPreviewStep] = useState<PlaywrightStep | null>(null);
  const [previewStepSet, setPreviewStepSet] = useState<PlaywrightStepSet | null>(null);
  const [isActionCodePreviewOpen, setIsActionCodePreviewOpen] = useState(false);
  const {
    steps,
    stepSets,
    websites,
    flows,
    actions,
    resolvedActionBlocks,
    actionDraftName,
    actionDraftDescription,
    actionPersonaId,
    actionExecutionSettings,
    editingActionId,
    editingActionRuntimeKey,
    actionValidationErrors,
    setActionDraftName,
    setActionDraftDescription,
    setActionPersonaId,
    setActionExecutionSettings,
    handleAddRuntimeStepToAction,
    handleAddStepSetToAction,
    handleMoveActionItem,
    handleUpdateActionBlockConfig,
    handleClearAction,
    handleUpdateAction,
    setIsSaveActionOpen,
    isSaving,
  } = usePlaywrightStepSequencer();

  function onDragEnd(result: DropResult): void {
    if (!result.destination) return;
    if (result.destination.index === result.source.index) return;
    handleMoveActionItem(result.source.index, result.destination.index);
  }

  const editingAction = editingActionId !== null
    ? actions.find((a) => a.id === editingActionId) ?? null
    : null;

  const { data: personas = [] } = usePlaywrightPersonas();
  const browserPreparationBlocks = useMemo(
    () =>
      resolvedActionBlocks
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => item.block.kind === 'runtime_step' && item.block.refId === 'browser_preparation'),
    [resolvedActionBlocks]
  );

  const masterNodes = useMemo(
    () => buildStepSequencerMasterNodes({ stepSets, websites, flows }),
    [stepSets, websites, flows]
  );

  const masterNodesRef = useRef(masterNodes);
  useEffect(() => {
    masterNodesRef.current = masterNodes;
  }, [masterNodes]);

  const adapter = useMemo(
    () =>
      createMasterFolderTreeTransactionAdapter({
        onApply: async () => {
          // Read-only tree — no persistence needed, just acknowledge
        },
      }),
    []
  );

  const treeRevision = useMemo(() => masterNodes.map((n) => n.id).join(','), [masterNodes]);
  const expandedNodeIds = useMemo(
    () => masterNodes.filter((n) => n.type === 'folder').map((n) => n.id),
    [masterNodes]
  );

  const {
    controller,
    appearance: { rootDropUi },
    viewport: { scrollToNodeRef },
  } = useMasterFolderTreeShell({
    instance: 'playwright_step_seq_constructor',
    nodes: masterNodes,
    initiallyExpandedNodeIds: expandedNodeIds,
    externalRevision: treeRevision,
    adapter,
  });

  return (
    <div className='flex h-full min-h-[340px] gap-3'>
      {/* ---- Left: step set tree browser ---- */}
      <div className='flex w-[280px] shrink-0 flex-col gap-2 rounded-lg border border-border/50 bg-card/20 p-3'>
        <Label className='text-[11px] font-semibold uppercase tracking-wider text-muted-foreground'>
          Step Sets
        </Label>
        <p className='text-[11px] text-muted-foreground/70'>
          Add reusable step sets here. Runtime steps live below, and direct steps can be added from the table.
        </p>

        {masterNodes.length === 0 ? (
          <div className='flex flex-1 items-center justify-center py-8 text-center text-xs text-muted-foreground'>
            No step sets yet.
            <br />
            Create step sets in the list below.
          </div>
        ) : (
          <div className='flex-1 overflow-y-auto rounded border border-border/60 bg-card/30 p-1'>
            <FolderTreeViewportV2
              controller={controller}
              scrollToNodeRef={scrollToNodeRef}
              enableDnd={false}
              className='space-y-0.5'
              emptyLabel='No step sets'
              rootDropUi={rootDropUi}
              renderNode={(input) => (
                <ActionConstructorTreeNode
                  {...input}
                  onAddToAction={handleAddStepSetToAction}
                />
              )}
            />
          </div>
        )}

        <div className='space-y-2 border-t border-border/30 pt-2'>
          <Label className='text-[11px] font-semibold uppercase tracking-wider text-muted-foreground'>
            Runtime Steps
          </Label>
          <div className='max-h-[220px] space-y-2 overflow-y-auto rounded border border-border/60 bg-card/30 p-2'>
            {RUNTIME_STEP_GROUPS.map((group) => (
              <div key={group.id} className='space-y-1'>
                <div className='text-[10px] font-medium uppercase tracking-wide text-muted-foreground'>
                  {group.label}
                </div>
                <div className='space-y-1'>
                  {group.stepIds.map((stepId) => (
                    <button
                      key={stepId}
                      type='button'
                      onClick={() => handleAddRuntimeStepToAction(stepId)}
                      className='group flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-xs text-gray-300 transition-colors hover:bg-muted/40'
                    >
                      <ListChecks className='size-3 shrink-0 text-sky-300' />
                      <span className='min-w-0 flex-1 truncate'>{STEP_REGISTRY[stepId].label}</span>
                      <span className='inline-flex size-5 items-center justify-center rounded text-sky-400 opacity-80 group-hover:bg-sky-500/20 group-hover:opacity-100'>
                        <Plus className='size-3' />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ---- Right: action sequence builder ---- */}
      <div className={cn(
        'flex flex-1 flex-col gap-2 rounded-lg border p-3',
        editingActionId !== null
          ? 'border-sky-500/40 bg-sky-900/10'
          : 'border-border/50 bg-card/20'
      )}>
        {/* Header */}
        <div className='flex items-center justify-between gap-2'>
          <div className='flex items-center gap-2'>
            <Label className='text-[11px] font-semibold uppercase tracking-wider text-muted-foreground'>
              Action Sequence
            </Label>
            {editingAction ? (
              <>
                <span className='inline-flex items-center gap-1 rounded bg-sky-500/15 px-1.5 py-0.5 text-[10px] text-sky-300 ring-1 ring-inset ring-sky-500/30'>
                  <Pencil className='size-2.5' />
                  Editing: {editingAction.name}
                </span>
                {editingActionRuntimeKey !== null ? (
                  <span className='inline-flex items-center rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-200 ring-1 ring-inset ring-amber-500/20'>
                    Runtime: {editingActionRuntimeKey}
                  </span>
                ) : null}
              </>
            ) : null}
          </div>
          <div className='flex items-center gap-2'>
            {resolvedActionBlocks.length > 0 ? (
              <button
                type='button'
                onClick={() => setIsActionCodePreviewOpen(true)}
                className='inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-sky-300'
              >
                <Code2 className='size-3' />
                Preview code
              </button>
            ) : null}
            {resolvedActionBlocks.length > 0 ? (
              <button
                type='button'
                onClick={handleClearAction}
                className='inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive'
              >
                <Trash2 className='size-3' />
                {editingActionId !== null ? 'Discard' : 'Clear'}
              </button>
            ) : null}
          </div>
        </div>

        {/* Sequence list */}
        {resolvedActionBlocks.length === 0 ? (
          <div className='flex flex-1 items-center justify-center rounded border border-dashed border-border/40 bg-card/10 py-10 text-center text-xs text-muted-foreground'>
            <div className='space-y-1'>
              <Play className='mx-auto size-6 opacity-20' />
              <p>Add blocks from the step-set tree or the step list below.</p>
              <p className='opacity-60'>Blocks execute top to bottom.</p>
            </div>
          </div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId='action-sequence'>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={cn(
                    'flex-1 space-y-1 overflow-y-auto rounded',
                    snapshot.isDraggingOver && 'bg-sky-500/5'
                  )}
                >
                  {resolvedActionBlocks.map((item, idx) => (
                    <Draggable
                      key={item.block.id}
                      draggableId={item.block.id}
                      index={idx}
                    >
                      {(dragProvided, dragSnapshot) => (
                        <ActionSequenceItem
                          item={item}
                          index={idx}
                          dragProvided={dragProvided}
                          isDragging={dragSnapshot.isDragging}
                          onPreviewStep={setPreviewStep}
                          onPreviewStepSet={setPreviewStepSet}
                        />
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}

        {editingActionRuntimeKey !== null && actionValidationErrors.length > 0 ? (
          <div className='rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive'>
            <div className='flex items-start gap-2'>
              <AlertTriangle className='mt-0.5 size-3.5 shrink-0' />
              <div className='space-y-1'>
                <p className='font-medium'>
                  This runtime action cannot be updated until the manifest is valid.
                </p>
                <ul className='list-disc space-y-0.5 pl-4'>
                  {actionValidationErrors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ) : null}

        {resolvedActionBlocks.length > 0 ? (
          <div className='space-y-3 rounded border border-border/40 bg-card/20 p-3'>
            <div className='space-y-1'>
              <Label className='text-[11px] font-semibold uppercase tracking-wider text-muted-foreground'>
                Action Settings
              </Label>
              <p className='text-[11px] text-muted-foreground/70'>
                These defaults apply before integration-level Playwright settings. Explicit run overrides still win.
              </p>
            </div>

            <div className='grid gap-2 md:grid-cols-2 xl:grid-cols-3'>
              <div className='space-y-1'>
                <Label className='text-[11px] text-muted-foreground'>Browser mode</Label>
                <Select
                  value={
                    actionExecutionSettings.headless === null
                      ? '__inherit__'
                      : actionExecutionSettings.headless
                        ? 'headless'
                        : 'headed'
                  }
                  onValueChange={(value) =>
                    setActionExecutionSettings({
                      ...actionExecutionSettings,
                      headless:
                        value === '__inherit__'
                          ? null
                          : value === 'headless',
                    })
                  }
                >
                  <SelectTrigger className='h-8 text-xs'>
                    <SelectValue placeholder='Inherit connection setting' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='__inherit__'>Inherit connection setting</SelectItem>
                    <SelectItem value='headed'>Headed</SelectItem>
                    <SelectItem value='headless'>Headless</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-1'>
                <Label className='text-[11px] text-muted-foreground'>Browser</Label>
                <Select
                  value={actionExecutionSettings.browserPreference ?? '__inherit__'}
                  onValueChange={(value) =>
                    setActionExecutionSettings({
                      ...actionExecutionSettings,
                      browserPreference:
                        value === '__inherit__'
                          ? null
                          : (value as PlaywrightActionExecutionBrowserPreference),
                    })
                  }
                >
                  <SelectTrigger className='h-8 text-xs'>
                    <SelectValue placeholder='Inherit connection browser' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='__inherit__'>Inherit connection browser</SelectItem>
                    <SelectItem value='auto'>Auto</SelectItem>
                    <SelectItem value='chrome'>Chrome</SelectItem>
                    <SelectItem value='brave'>Brave</SelectItem>
                    <SelectItem value='chromium'>Chromium</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-1'>
                <Label className='text-[11px] text-muted-foreground'>Device emulation</Label>
                <Select
                  value={
                    actionExecutionSettings.emulateDevice === null
                      ? '__inherit__'
                      : actionExecutionSettings.emulateDevice
                        ? (actionExecutionSettings.deviceName ?? 'Desktop Chrome')
                        : '__disabled__'
                  }
                  onValueChange={(value) => {
                    if (value === '__inherit__') {
                      setActionExecutionSettings({
                        ...actionExecutionSettings,
                        emulateDevice: null,
                        deviceName: null,
                      });
                      return;
                    }

                    if (value === '__disabled__') {
                      setActionExecutionSettings({
                        ...actionExecutionSettings,
                        emulateDevice: false,
                        deviceName: null,
                      });
                      return;
                    }

                    setActionExecutionSettings({
                      ...actionExecutionSettings,
                      emulateDevice: true,
                      deviceName: value,
                    });
                  }}
                >
                  <SelectTrigger className='h-8 text-xs'>
                    <SelectValue placeholder='Inherit connection setting' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='__inherit__'>Inherit connection setting</SelectItem>
                    <SelectItem value='__disabled__'>No device emulation</SelectItem>
                    {playwrightDeviceOptions.map((device) => (
                      <SelectItem key={device.value} value={device.value}>
                        {device.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-1'>
                <Label className='text-[11px] text-muted-foreground'>Slow Mo (ms)</Label>
                <Input
                  value={actionExecutionSettings.slowMo?.toString() ?? ''}
                  onChange={(e) =>
                    setActionExecutionSettings({
                      ...actionExecutionSettings,
                      slowMo: toNullableInteger(e.target.value),
                    })
                  }
                  placeholder='Inherit'
                  className='h-8 text-xs'
                  inputMode='numeric'
                />
              </div>

              <div className='space-y-1'>
                <Label className='text-[11px] text-muted-foreground'>Timeout (ms)</Label>
                <Input
                  value={actionExecutionSettings.timeout?.toString() ?? ''}
                  onChange={(e) =>
                    setActionExecutionSettings({
                      ...actionExecutionSettings,
                      timeout: toNullableInteger(e.target.value),
                    })
                  }
                  placeholder='Inherit'
                  className='h-8 text-xs'
                  inputMode='numeric'
                />
              </div>

              <div className='space-y-1'>
                <Label className='text-[11px] text-muted-foreground'>Navigation timeout (ms)</Label>
                <Input
                  value={actionExecutionSettings.navigationTimeout?.toString() ?? ''}
                  onChange={(e) =>
                    setActionExecutionSettings({
                      ...actionExecutionSettings,
                      navigationTimeout: toNullableInteger(e.target.value),
                    })
                  }
                  placeholder='Inherit'
                  className='h-8 text-xs'
                  inputMode='numeric'
                />
              </div>

              <div className='space-y-1'>
                <Label className='text-[11px] text-muted-foreground'>Locale</Label>
                <Input
                  value={actionExecutionSettings.locale ?? ''}
                  onChange={(e) => {
                    const nextLocale = e.target.value.trim();
                    setActionExecutionSettings({
                      ...actionExecutionSettings,
                      locale: nextLocale.length > 0 ? nextLocale : null,
                    });
                  }}
                  placeholder='Inherit'
                  className='h-8 text-xs'
                />
              </div>

              <div className='space-y-1 md:col-span-2 xl:col-span-1'>
                <Label className='text-[11px] text-muted-foreground'>Timezone</Label>
                <Input
                  value={actionExecutionSettings.timezoneId ?? ''}
                  onChange={(e) => {
                    const nextTimezoneId = e.target.value.trim();
                    setActionExecutionSettings({
                      ...actionExecutionSettings,
                      timezoneId: nextTimezoneId.length > 0 ? nextTimezoneId : null,
                    });
                  }}
                  placeholder='Inherit'
                  className='h-8 text-xs'
                />
              </div>
            </div>

            <div className='grid gap-2 md:grid-cols-2 xl:grid-cols-3'>
              <div className='space-y-1'>
                <Label className='text-[11px] text-muted-foreground'>Identity profile</Label>
                <Select
                  value={actionExecutionSettings.identityProfile ?? '__inherit__'}
                  onValueChange={(value) =>
                    setActionExecutionSettings({
                      ...actionExecutionSettings,
                      identityProfile:
                        value === '__inherit__'
                          ? null
                          : value === 'default' ||
                              value === 'search' ||
                              value === 'marketplace'
                            ? value
                            : null,
                    })
                  }
                >
                  <SelectTrigger className='h-8 text-xs'>
                    <SelectValue placeholder='Inherit connection setting' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='__inherit__'>Inherit connection setting</SelectItem>
                    {playwrightIdentityProfileOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-1'>
                <Label className='text-[11px] text-muted-foreground'>Humanize mouse</Label>
                <Select
                  value={
                    actionExecutionSettings.humanizeMouse === null
                      ? '__inherit__'
                      : actionExecutionSettings.humanizeMouse
                        ? '__enabled__'
                        : '__disabled__'
                  }
                  onValueChange={(value) =>
                    setActionExecutionSettings({
                      ...actionExecutionSettings,
                      humanizeMouse:
                        value === '__inherit__'
                          ? null
                          : value === '__enabled__',
                    })
                  }
                >
                  <SelectTrigger className='h-8 text-xs'>
                    <SelectValue placeholder='Inherit connection setting' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='__inherit__'>Inherit connection setting</SelectItem>
                    <SelectItem value='__enabled__'>Enabled</SelectItem>
                    <SelectItem value='__disabled__'>Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-1'>
                <Label className='text-[11px] text-muted-foreground'>Mouse jitter</Label>
                <Input
                  value={actionExecutionSettings.mouseJitter?.toString() ?? ''}
                  onChange={(e) =>
                    setActionExecutionSettings({
                      ...actionExecutionSettings,
                      mouseJitter: toNullableInteger(e.target.value),
                    })
                  }
                  placeholder='Inherit'
                  className='h-8 text-xs'
                  inputMode='numeric'
                />
              </div>

              <div className='space-y-1'>
                <Label className='text-[11px] text-muted-foreground'>Proxy</Label>
                <Select
                  value={
                    actionExecutionSettings.proxyEnabled === null
                      ? '__inherit__'
                      : actionExecutionSettings.proxyEnabled
                        ? '__enabled__'
                        : '__disabled__'
                  }
                  onValueChange={(value) =>
                    setActionExecutionSettings({
                      ...actionExecutionSettings,
                      proxyEnabled:
                        value === '__inherit__'
                          ? null
                          : value === '__enabled__',
                    })
                  }
                >
                  <SelectTrigger className='h-8 text-xs'>
                    <SelectValue placeholder='Inherit connection setting' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='__inherit__'>Inherit connection setting</SelectItem>
                    <SelectItem value='__enabled__'>Enabled</SelectItem>
                    <SelectItem value='__disabled__'>Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-1'>
                <Label className='text-[11px] text-muted-foreground'>Proxy session affinity</Label>
                <Select
                  value={
                    actionExecutionSettings.proxySessionAffinity === null
                      ? '__inherit__'
                      : actionExecutionSettings.proxySessionAffinity
                        ? '__enabled__'
                        : '__disabled__'
                  }
                  onValueChange={(value) =>
                    setActionExecutionSettings({
                      ...actionExecutionSettings,
                      proxySessionAffinity:
                        value === '__inherit__'
                          ? null
                          : value === '__enabled__',
                    })
                  }
                >
                  <SelectTrigger className='h-8 text-xs'>
                    <SelectValue placeholder='Inherit connection setting' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='__inherit__'>Inherit connection setting</SelectItem>
                    <SelectItem value='__enabled__'>Enabled</SelectItem>
                    <SelectItem value='__disabled__'>Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-1'>
                <Label className='text-[11px] text-muted-foreground'>Proxy session mode</Label>
                <Select
                  value={actionExecutionSettings.proxySessionMode ?? '__inherit__'}
                  onValueChange={(value) =>
                    setActionExecutionSettings({
                      ...actionExecutionSettings,
                      proxySessionMode:
                        value === '__inherit__'
                          ? null
                          : value === 'sticky' || value === 'rotate'
                            ? value
                            : null,
                    })
                  }
                >
                  <SelectTrigger className='h-8 text-xs'>
                    <SelectValue placeholder='Inherit connection setting' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='__inherit__'>Inherit connection setting</SelectItem>
                    {playwrightProxySessionModeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-1'>
                <Label className='text-[11px] text-muted-foreground'>Proxy provider preset</Label>
                <Select
                  value={actionExecutionSettings.proxyProviderPreset ?? '__inherit__'}
                  onValueChange={(value) =>
                    setActionExecutionSettings({
                      ...actionExecutionSettings,
                      proxyProviderPreset:
                        value === '__inherit__'
                          ? null
                          : value === 'custom' ||
                              value === 'brightdata' ||
                              value === 'oxylabs' ||
                              value === 'decodo'
                            ? value
                            : null,
                    })
                  }
                >
                  <SelectTrigger className='h-8 text-xs'>
                    <SelectValue placeholder='Inherit connection setting' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='__inherit__'>Inherit connection setting</SelectItem>
                    {playwrightProxyProviderPresetOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-1'>
                <Label className='text-[11px] text-muted-foreground'>Proxy server</Label>
                <Input
                  value={actionExecutionSettings.proxyServer ?? ''}
                  onChange={(e) => {
                    const nextProxyServer = e.target.value.trim();
                    setActionExecutionSettings({
                      ...actionExecutionSettings,
                      proxyServer: nextProxyServer.length > 0 ? nextProxyServer : null,
                    });
                  }}
                  placeholder='Inherit'
                  className='h-8 text-xs'
                />
              </div>

              <div className='space-y-1'>
                <Label className='text-[11px] text-muted-foreground'>Proxy username</Label>
                <Input
                  value={actionExecutionSettings.proxyUsername ?? ''}
                  onChange={(e) => {
                    const nextProxyUsername = e.target.value.trim();
                    setActionExecutionSettings({
                      ...actionExecutionSettings,
                      proxyUsername: nextProxyUsername.length > 0 ? nextProxyUsername : null,
                    });
                  }}
                  placeholder='Inherit'
                  className='h-8 text-xs'
                />
              </div>

              <div className='space-y-1'>
                <Label className='text-[11px] text-muted-foreground'>Proxy password</Label>
                <Input
                  value={actionExecutionSettings.proxyPassword ?? ''}
                  onChange={(e) => {
                    const nextProxyPassword = e.target.value.trim();
                    setActionExecutionSettings({
                      ...actionExecutionSettings,
                      proxyPassword: nextProxyPassword.length > 0 ? nextProxyPassword : null,
                    });
                  }}
                  placeholder='Inherit'
                  className='h-8 text-xs'
                  type='password'
                />
              </div>
            </div>

            <div className='grid gap-2 md:grid-cols-2 xl:grid-cols-3'>
              <div className='space-y-1'>
                <Label className='text-[11px] text-muted-foreground'>Click delay min (ms)</Label>
                <Input
                  value={actionExecutionSettings.clickDelayMin?.toString() ?? ''}
                  onChange={(e) =>
                    setActionExecutionSettings({
                      ...actionExecutionSettings,
                      clickDelayMin: toNullableInteger(e.target.value),
                    })
                  }
                  placeholder='Inherit'
                  className='h-8 text-xs'
                  inputMode='numeric'
                />
              </div>

              <div className='space-y-1'>
                <Label className='text-[11px] text-muted-foreground'>Click delay max (ms)</Label>
                <Input
                  value={actionExecutionSettings.clickDelayMax?.toString() ?? ''}
                  onChange={(e) =>
                    setActionExecutionSettings({
                      ...actionExecutionSettings,
                      clickDelayMax: toNullableInteger(e.target.value),
                    })
                  }
                  placeholder='Inherit'
                  className='h-8 text-xs'
                  inputMode='numeric'
                />
              </div>

              <div className='space-y-1'>
                <Label className='text-[11px] text-muted-foreground'>Input delay min (ms)</Label>
                <Input
                  value={actionExecutionSettings.inputDelayMin?.toString() ?? ''}
                  onChange={(e) =>
                    setActionExecutionSettings({
                      ...actionExecutionSettings,
                      inputDelayMin: toNullableInteger(e.target.value),
                    })
                  }
                  placeholder='Inherit'
                  className='h-8 text-xs'
                  inputMode='numeric'
                />
              </div>

              <div className='space-y-1'>
                <Label className='text-[11px] text-muted-foreground'>Input delay max (ms)</Label>
                <Input
                  value={actionExecutionSettings.inputDelayMax?.toString() ?? ''}
                  onChange={(e) =>
                    setActionExecutionSettings({
                      ...actionExecutionSettings,
                      inputDelayMax: toNullableInteger(e.target.value),
                    })
                  }
                  placeholder='Inherit'
                  className='h-8 text-xs'
                  inputMode='numeric'
                />
              </div>

              <div className='space-y-1'>
                <Label className='text-[11px] text-muted-foreground'>Action delay min (ms)</Label>
                <Input
                  value={actionExecutionSettings.actionDelayMin?.toString() ?? ''}
                  onChange={(e) =>
                    setActionExecutionSettings({
                      ...actionExecutionSettings,
                      actionDelayMin: toNullableInteger(e.target.value),
                    })
                  }
                  placeholder='Inherit'
                  className='h-8 text-xs'
                  inputMode='numeric'
                />
              </div>

              <div className='space-y-1'>
                <Label className='text-[11px] text-muted-foreground'>Action delay max (ms)</Label>
                <Input
                  value={actionExecutionSettings.actionDelayMax?.toString() ?? ''}
                  onChange={(e) =>
                    setActionExecutionSettings({
                      ...actionExecutionSettings,
                      actionDelayMax: toNullableInteger(e.target.value),
                    })
                  }
                  placeholder='Inherit'
                  className='h-8 text-xs'
                  inputMode='numeric'
                />
              </div>
            </div>
          </div>
        ) : null}

        {resolvedActionBlocks.length > 0 ? (
          <div className='space-y-3 rounded border border-border/40 bg-card/20 p-3'>
            <div className='space-y-1'>
              <Label className='text-[11px] font-semibold uppercase tracking-wider text-muted-foreground'>
                Step Settings
              </Label>
              <p className='text-[11px] text-muted-foreground/70'>
                Browser preparation is step-owned. Use it to shape viewport and initial page settle behavior.
              </p>
            </div>

            {browserPreparationBlocks.length === 0 ? (
              <div className='rounded border border-dashed border-border/50 px-3 py-2 text-[11px] text-muted-foreground/70'>
                Add a <span className='font-medium text-foreground'>Browser preparation</span> runtime step to configure viewport and settle timing.
              </div>
            ) : (
              browserPreparationBlocks.map(({ item, index }) => (
                <div
                  key={item.block.id}
                  className='grid gap-2 rounded border border-border/40 bg-card/30 p-3 md:grid-cols-3'
                >
                  <div className='space-y-1 md:col-span-3'>
                    <div className='text-xs font-medium'>
                      Browser preparation
                      <span className='ml-1 text-[11px] text-muted-foreground'>
                        block {index + 1}
                      </span>
                    </div>
                    <div className='text-[11px] text-muted-foreground/70'>
                      Overrides only this step. Leave fields empty to use the action or integration defaults.
                    </div>
                  </div>

                  <div className='space-y-1'>
                    <Label className='text-[11px] text-muted-foreground'>Viewport width</Label>
                    <Input
                      value={item.block.config.viewportWidth?.toString() ?? ''}
                      onChange={(e) =>
                        handleUpdateActionBlockConfig(index, {
                          viewportWidth: toNullableInteger(e.target.value),
                        })
                      }
                      placeholder='Default'
                      className='h-8 text-xs'
                      inputMode='numeric'
                    />
                  </div>

                  <div className='space-y-1'>
                    <Label className='text-[11px] text-muted-foreground'>Viewport height</Label>
                    <Input
                      value={item.block.config.viewportHeight?.toString() ?? ''}
                      onChange={(e) =>
                        handleUpdateActionBlockConfig(index, {
                          viewportHeight: toNullableInteger(e.target.value),
                        })
                      }
                      placeholder='Default'
                      className='h-8 text-xs'
                      inputMode='numeric'
                    />
                  </div>

                  <div className='space-y-1'>
                    <Label className='text-[11px] text-muted-foreground'>Settle delay (ms)</Label>
                    <Input
                      value={item.block.config.settleDelayMs?.toString() ?? ''}
                      onChange={(e) =>
                        handleUpdateActionBlockConfig(index, {
                          settleDelayMs: toNullableInteger(e.target.value),
                        })
                      }
                      placeholder='Default'
                      className='h-8 text-xs'
                      inputMode='numeric'
                    />
                  </div>

                  <div className='space-y-1'>
                    <Label className='text-[11px] text-muted-foreground'>Locale override</Label>
                    <Input
                      value={item.block.config.locale ?? ''}
                      onChange={(e) => {
                        const nextLocale = e.target.value.trim();
                        handleUpdateActionBlockConfig(index, {
                          locale: nextLocale.length > 0 ? nextLocale : null,
                        });
                      }}
                      placeholder='Use action default'
                      className='h-8 text-xs'
                    />
                  </div>

                  <div className='space-y-1'>
                    <Label className='text-[11px] text-muted-foreground'>Timezone override</Label>
                    <Input
                      value={item.block.config.timezoneId ?? ''}
                      onChange={(e) => {
                        const nextTimezoneId = e.target.value.trim();
                        handleUpdateActionBlockConfig(index, {
                          timezoneId: nextTimezoneId.length > 0 ? nextTimezoneId : null,
                        });
                      }}
                      placeholder='Use action default'
                      className='h-8 text-xs'
                    />
                  </div>

                  <div className='space-y-1'>
                    <Label className='text-[11px] text-muted-foreground'>User agent override</Label>
                    <Input
                      value={item.block.config.userAgent ?? ''}
                      onChange={(e) => {
                        const nextUserAgent = e.target.value.trim();
                        handleUpdateActionBlockConfig(index, {
                          userAgent: nextUserAgent.length > 0 ? nextUserAgent : null,
                        });
                      }}
                      placeholder='Use action/default fingerprint'
                      className='h-8 text-xs'
                    />
                  </div>

                  <div className='space-y-1'>
                    <Label className='text-[11px] text-muted-foreground'>Color scheme</Label>
                    <Select
                      value={item.block.config.colorScheme ?? '__inherit__'}
                      onValueChange={(value) =>
                        handleUpdateActionBlockConfig(index, {
                          colorScheme:
                            value === '__inherit__'
                              ? null
                              : value === 'light' || value === 'dark'
                                ? value
                                : null,
                        })
                      }
                    >
                      <SelectTrigger className='h-8 text-xs'>
                        <SelectValue placeholder='Use default' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='__inherit__'>Use default</SelectItem>
                        <SelectItem value='light'>Light</SelectItem>
                        <SelectItem value='dark'>Dark</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className='space-y-1'>
                    <Label className='text-[11px] text-muted-foreground'>Reduced motion</Label>
                    <Select
                      value={item.block.config.reducedMotion ?? '__inherit__'}
                      onValueChange={(value) =>
                        handleUpdateActionBlockConfig(index, {
                          reducedMotion:
                            value === '__inherit__'
                              ? null
                              : value === 'reduce' || value === 'no-preference'
                                ? value
                                : null,
                        })
                      }
                    >
                      <SelectTrigger className='h-8 text-xs'>
                        <SelectValue placeholder='Use default' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='__inherit__'>Use default</SelectItem>
                        <SelectItem value='no-preference'>No preference</SelectItem>
                        <SelectItem value='reduce'>Reduce</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className='space-y-1'>
                    <Label className='text-[11px] text-muted-foreground'>Permissions</Label>
                    <Input
                      value={item.block.config.permissions.join(', ')}
                      onChange={(e) =>
                        handleUpdateActionBlockConfig(index, {
                          permissions: toPermissionList(e.target.value),
                        })
                      }
                      placeholder='geolocation, clipboard-read'
                      className='h-8 text-xs'
                    />
                  </div>

                  <div className='space-y-1'>
                    <Label className='text-[11px] text-muted-foreground'>Latitude</Label>
                    <Input
                      value={item.block.config.geolocationLatitude?.toString() ?? ''}
                      onChange={(e) =>
                        handleUpdateActionBlockConfig(index, {
                          geolocationLatitude: toNullableFloat(e.target.value),
                        })
                      }
                      placeholder='Leave blank'
                      className='h-8 text-xs'
                      inputMode='decimal'
                    />
                  </div>

                  <div className='space-y-1'>
                    <Label className='text-[11px] text-muted-foreground'>Longitude</Label>
                    <Input
                      value={item.block.config.geolocationLongitude?.toString() ?? ''}
                      onChange={(e) =>
                        handleUpdateActionBlockConfig(index, {
                          geolocationLongitude: toNullableFloat(e.target.value),
                        })
                      }
                      placeholder='Leave blank'
                      className='h-8 text-xs'
                      inputMode='decimal'
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        ) : null}

        {/* Save bar */}
        {resolvedActionBlocks.length > 0 ? (
          <div className='space-y-2 border-t border-border/30 pt-2'>
            {/* Persona selector */}
            {personas.length > 0 ? (
              <div className='flex items-center gap-2'>
                <Label className='shrink-0 text-[11px] text-muted-foreground'>Persona</Label>
                <Select
                  value={actionPersonaId ?? '__none__'}
                  onValueChange={(v) => setActionPersonaId(v === '__none__' ? null : v)}
                >
                  <SelectTrigger className='h-7 flex-1 text-xs'>
                    <SelectValue placeholder='Default persona' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='__none__'>Default persona</SelectItem>
                    {personas.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {/* Name + description + save */}
            <div className='flex items-center gap-2'>
              <Input
                value={actionDraftName}
                onChange={(e) => setActionDraftName(e.target.value)}
                placeholder='Action name…'
                className='h-7 flex-1 text-xs'
                aria-label='Action name'
              />
              <Input
                value={actionDraftDescription ?? ''}
                onChange={(e) => {
                  const nextDescription = e.target.value;
                  setActionDraftDescription(nextDescription.length > 0 ? nextDescription : null);
                }}
                placeholder='Description (optional)…'
                className='h-7 w-[160px] text-xs'
                aria-label='Action description'
              />
              {editingActionId !== null ? (
                <>
                  <Button
                    size='sm'
                    className='h-7 gap-1 text-xs'
                    onClick={() => {
                      handleUpdateAction().catch(() => undefined);
                    }}
                    disabled={actionDraftName.trim().length === 0 || isSaving || actionValidationErrors.length > 0}
                    loading={isSaving}
                  >
                    <RefreshCw className='size-3.5' />
                    Update
                  </Button>
                  <Button
                    size='sm'
                    variant='outline'
                    className='h-7 gap-1 text-xs'
                    onClick={() => setIsSaveActionOpen(true)}
                    disabled={actionDraftName.trim().length === 0}
                    title='Save as a new separate action'
                  >
                    <Save className='size-3.5' />
                    Save as new
                  </Button>
                </>
              ) : (
                <Button
                  size='sm'
                  className='h-7 gap-1 text-xs'
                  onClick={() => setIsSaveActionOpen(true)}
                  disabled={actionDraftName.trim().length === 0}
                >
                  <Save className='size-3.5' />
                  Save Action
                </Button>
              )}
            </div>
          </div>
        ) : null}
      </div>
      <StepCodePreviewDialog
        step={previewStep}
        open={previewStep !== null}
        onOpenChange={(open) => {
          if (!open) setPreviewStep(null);
        }}
      />
      <StepSetCodePreviewDialog
        stepSet={previewStepSet}
        steps={steps}
        open={previewStepSet !== null}
        onOpenChange={(open) => {
          if (!open) setPreviewStepSet(null);
        }}
      />
      <ActionSequenceCodePreviewDialog
        actionName={actionDraftName}
        blocks={resolvedActionBlocks}
        steps={steps}
        stepSets={stepSets}
        open={isActionCodePreviewOpen}
        onOpenChange={setIsActionCodePreviewOpen}
      />
    </div>
  );
}
