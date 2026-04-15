'use client';

import type { DropResult } from '@hello-pangea/dnd';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import {
  ChevronDown,
  ChevronRight,
  Folder,
  GripVertical,
  Layers,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { memo, useEffect, useMemo, useRef } from 'react';

import type { PlaywrightStepSet } from '@/shared/contracts/playwright-steps';
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
      {isStepSet && decoded ? (
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
  set,
  index,
  dragProvided,
  isDragging,
}: {
  set: PlaywrightStepSet;
  index: number;
  dragProvided: import('@hello-pangea/dnd').DraggableProvided;
  isDragging: boolean;
}): React.JSX.Element {
  const { handleRemoveFromAction } = usePlaywrightStepSequencer();

  return (
    <div
      ref={dragProvided.innerRef}
      {...dragProvided.draggableProps}
      className={cn(
        'group flex items-center gap-2 rounded border border-border/40 bg-card/30 px-2 py-1.5 transition-shadow',
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

      <span className='min-w-0 flex-1 truncate text-xs font-medium'>{set.name}</span>

      <Badge variant='neutral' className='shrink-0 h-4 px-1 text-[9px] border-border/50 bg-card/40'>
        {set.stepIds.length} steps
      </Badge>

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
  const {
    stepSets,
    websites,
    flows,
    actions,
    actionStepSets,
    actionDraftName,
    actionDraftDescription,
    actionPersonaId,
    editingActionId,
    setActionDraftName,
    setActionDraftDescription,
    setActionPersonaId,
    handleAddStepSetToAction,
    handleMoveActionItem,
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

  const editingAction = editingActionId
    ? actions.find((a) => a.id === editingActionId) ?? null
    : null;

  const { data: personas = [] } = usePlaywrightPersonas();

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
      </div>

      {/* ---- Right: action sequence builder ---- */}
      <div className={cn(
        'flex flex-1 flex-col gap-2 rounded-lg border p-3',
        editingActionId
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
              <span className='inline-flex items-center gap-1 rounded bg-sky-500/15 px-1.5 py-0.5 text-[10px] text-sky-300 ring-1 ring-inset ring-sky-500/30'>
                <Pencil className='size-2.5' />
                Editing: {editingAction.name}
              </span>
            ) : null}
          </div>
          {actionStepSets.length > 0 ? (
            <button
              type='button'
              onClick={handleClearAction}
              className='inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive'
            >
              <Trash2 className='size-3' />
              {editingActionId ? 'Discard' : 'Clear'}
            </button>
          ) : null}
        </div>

        {/* Sequence list */}
        {actionStepSets.length === 0 ? (
          <div className='flex flex-1 items-center justify-center rounded border border-dashed border-border/40 bg-card/10 py-10 text-center text-xs text-muted-foreground'>
            <div className='space-y-1'>
              <Play className='mx-auto size-6 opacity-20' />
              <p>Click <strong>+</strong> on a step set to add it here.</p>
              <p className='opacity-60'>Steps execute top → bottom.</p>
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
                  {actionStepSets.map((set, idx) => (
                    <Draggable key={`${set.id}_${idx}`} draggableId={`${set.id}_${idx}`} index={idx}>
                      {(dragProvided, dragSnapshot) => (
                        <ActionSequenceItem
                          set={set}
                          index={idx}
                          dragProvided={dragProvided}
                          isDragging={dragSnapshot.isDragging}
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

        {/* Save bar */}
        {actionStepSets.length > 0 ? (
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
                onChange={(e) => setActionDraftDescription(e.target.value || null)}
                placeholder='Description (optional)…'
                className='h-7 w-[160px] text-xs'
                aria-label='Action description'
              />
              {editingActionId ? (
                <>
                  <Button
                    size='sm'
                    className='h-7 gap-1 text-xs'
                    onClick={() => void handleUpdateAction()}
                    disabled={!actionDraftName.trim() || isSaving}
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
                    disabled={!actionDraftName.trim()}
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
                  disabled={!actionDraftName.trim()}
                >
                  <Save className='size-3.5' />
                  Save Action
                </Button>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
