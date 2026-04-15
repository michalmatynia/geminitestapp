'use client';

import {
  ChevronDown,
  ChevronRight,
  Folder,
  GripVertical,
  Layers,
  Play,
  Plus,
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
  total,
}: {
  set: PlaywrightStepSet;
  index: number;
  total: number;
}): React.JSX.Element {
  const { handleRemoveFromAction, handleMoveActionItem } = usePlaywrightStepSequencer();

  return (
    <div className='group flex items-center gap-2 rounded border border-border/40 bg-card/30 px-2 py-1.5'>
      {/* Drag handle visual (non-functional indicator; reorder via buttons) */}
      <GripVertical className='size-3.5 shrink-0 text-muted-foreground opacity-40' />

      <span className='shrink-0 text-[10px] font-mono text-muted-foreground w-4 text-right'>
        {index + 1}.
      </span>

      <span className='min-w-0 flex-1 truncate text-xs font-medium'>{set.name}</span>

      <Badge variant='neutral' className='shrink-0 h-4 px-1 text-[9px] border-border/50 bg-card/40'>
        {set.stepIds.length} steps
      </Badge>

      <div className='invisible flex items-center gap-0.5 group-hover:visible'>
        <button
          type='button'
          disabled={index === 0}
          onClick={() => handleMoveActionItem(index, index - 1)}
          className='inline-flex size-5 items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-30'
          aria-label='Move up'
        >
          <ChevronDown className='size-3 rotate-180' />
        </button>
        <button
          type='button'
          disabled={index === total - 1}
          onClick={() => handleMoveActionItem(index, index + 1)}
          className='inline-flex size-5 items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-30'
          aria-label='Move down'
        >
          <ChevronDown className='size-3' />
        </button>
        <button
          type='button'
          onClick={() => handleRemoveFromAction(index)}
          className='inline-flex size-5 items-center justify-center rounded text-muted-foreground hover:text-destructive'
          aria-label='Remove'
        >
          <X className='size-3' />
        </button>
      </div>
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
    actionStepSets,
    actionDraftName,
    actionDraftDescription,
    actionPersonaId,
    setActionDraftName,
    setActionDraftDescription,
    setActionPersonaId,
    handleAddStepSetToAction,
    handleClearAction,
    setIsSaveActionOpen,
  } = usePlaywrightStepSequencer();

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
      <div className='flex flex-1 flex-col gap-2 rounded-lg border border-border/50 bg-card/20 p-3'>
        {/* Header */}
        <div className='flex items-center justify-between gap-2'>
          <Label className='text-[11px] font-semibold uppercase tracking-wider text-muted-foreground'>
            Action Sequence
          </Label>
          {actionStepSets.length > 0 ? (
            <button
              type='button'
              onClick={handleClearAction}
              className='inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive'
            >
              <Trash2 className='size-3' />
              Clear
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
          <div className='flex-1 space-y-1 overflow-y-auto'>
            {actionStepSets.map((set, idx) => (
              <ActionSequenceItem
                key={`${set.id}_${idx}`}
                set={set}
                index={idx}
                total={actionStepSets.length}
              />
            ))}
          </div>
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
              <Button
                size='sm'
                className='h-7 gap-1 text-xs'
                onClick={() => setIsSaveActionOpen(true)}
                disabled={!actionDraftName.trim()}
              >
                <Save className='size-3.5' />
                Save Action
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
