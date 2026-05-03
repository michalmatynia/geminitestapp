'use client';

import { AlertTriangle, ChevronDown, ChevronRight, Code2, Copy, Globe, Lock, MoreHorizontal, Pencil, Plus, Share2, Tag, Trash2 } from 'lucide-react';
import { memo, useState } from 'react';

import { PLAYWRIGHT_STEP_TYPE_LABELS } from '@/shared/contracts/playwright-steps';
import type { PlaywrightStep, PlaywrightStepSet } from '@/shared/contracts/playwright-steps';
import { Badge } from '@/shared/ui/primitives.public';
import { Button } from '@/shared/ui/primitives.public';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/primitives.public';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table';

import { usePlaywrightStepSequencer } from '../../context/PlaywrightStepSequencerContext';
import { StepListTableSkeleton } from './StepListTableSkeleton';
import { StepCodePreviewDialog } from './StepCodePreviewDialog';
import { StepSetCodePreviewDialog } from './StepSetCodePreviewDialog';
import { StepTypeIcon } from './StepTypeIcon';

// ---------------------------------------------------------------------------
// Inline step preview (used inside StepSetRow expansion)
// ---------------------------------------------------------------------------

function SelectorBindingBadge({
  step,
  compact = false,
}: {
  step: PlaywrightStep;
  compact?: boolean;
}): React.JSX.Element | null {
  const binding = step.inputBindings?.['selector'];
  if (!step.selector && !binding) return null;

  if (binding?.mode === 'selectorRegistry') {
    return (
      <Badge className='h-4 shrink-0 border-emerald-400/30 bg-emerald-500/10 px-1 text-[9px] text-emerald-200'>
        {compact ? 'Registry' : binding.selectorKey ? `Registry: ${binding.selectorKey}` : 'Registry'}
      </Badge>
    );
  }

  if (binding?.mode === 'disabled') {
    return (
      <Badge className='h-4 shrink-0 border-amber-400/30 bg-amber-500/10 px-1 text-[9px] text-amber-200'>
        Disabled selector
      </Badge>
    );
  }

  return (
    <Badge className='h-4 shrink-0 border-slate-400/30 bg-slate-500/10 px-1 text-[9px] text-slate-200'>
      {compact ? 'Local' : 'Local selector'}
    </Badge>
  );
}

function StepPreviewRow({
  stepId,
  onPreview,
}: {
  stepId: string;
  onPreview: (step: PlaywrightStep) => void;
}): React.JSX.Element {
  const { steps } = usePlaywrightStepSequencer();
  const step = steps.find((s) => s.id === stepId);
  if (!step) {
    return (
      <div className='flex items-center gap-2 px-2 py-0.5 text-[11px] text-muted-foreground/40 line-through'>
        (deleted step)
      </div>
    );
  }
  return (
    <button
      type='button'
      className='flex min-w-0 flex-1 items-center gap-2 rounded px-2 py-0.5 text-left text-[11px] transition-colors hover:bg-muted/40'
      onClick={() => onPreview(step)}
      title='Preview semantic Playwright code'
    >
      <StepTypeIcon type={step.type} className='size-3 shrink-0' withColor />
      <span className='min-w-0 flex-1 truncate text-muted-foreground'>{step.name}</span>
      <Badge variant='neutral' className='h-3.5 shrink-0 px-1 text-[9px]'>
        {PLAYWRIGHT_STEP_TYPE_LABELS[step.type]}
      </Badge>
      <SelectorBindingBadge step={step} compact />
      <Code2 className='size-3 shrink-0 text-sky-300' />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Steps table
// ---------------------------------------------------------------------------

const StepRow = memo(({
  step,
  onPreview,
}: {
  step: PlaywrightStep;
  onPreview: (step: PlaywrightStep) => void;
}) => {
  const {
    setEditingStep,
    handleDeleteStep,
    handleDuplicateStep,
    handleAddStepToAction,
    setFilterTag,
    websites,
    flows,
  } =
    usePlaywrightStepSequencer();

  const websiteName = step.websiteId
    ? (websites.find((w) => w.id === step.websiteId)?.name ?? step.websiteId)
    : null;

  const flowName = step.flowId
    ? (flows.find((f) => f.id === step.flowId)?.name ?? step.flowId)
    : null;

  return (
    <TableRow>
      <TableCell>
        <div className='flex items-center gap-2'>
          <StepTypeIcon type={step.type} className='size-3.5 shrink-0' />
          <button
            type='button'
            className='text-left text-sm font-medium hover:text-sky-300'
            onClick={() => onPreview(step)}
            title='Preview semantic Playwright code'
          >
            {step.name}
          </button>
        </div>
      </TableCell>
      <TableCell>
        <div className='flex flex-wrap gap-1'>
          <Badge variant='neutral' className='text-[10px] uppercase tracking-wide'>
            {PLAYWRIGHT_STEP_TYPE_LABELS[step.type]}
          </Badge>
          <SelectorBindingBadge step={step} />
        </div>
      </TableCell>
      <TableCell className='max-w-[240px] truncate text-xs text-muted-foreground'>
        {step.description ?? <span className='opacity-40'>—</span>}
      </TableCell>
      <TableCell>
        {step.websiteId === null ? (
          <span className='inline-flex items-center gap-1 text-[11px] text-emerald-400'>
            <Share2 className='size-3' />
            Shared
          </span>
        ) : (
          <span className='inline-flex items-center gap-1 text-[11px] text-sky-400'>
            <Globe className='size-3' />
            {websiteName}
            {flowName ? (
              <span className='ml-1 inline-flex items-center gap-0.5 text-purple-400'>
                <Lock className='size-2.5' />
                {flowName}
              </span>
            ) : null}
          </span>
        )}
      </TableCell>
      <TableCell>
        {step.tags.length > 0 ? (
          <div className='flex flex-wrap gap-1'>
            {step.tags.map((tag) => (
              <button
                key={tag}
                type='button'
                onClick={() => setFilterTag(tag)}
                className='inline-flex items-center gap-0.5 rounded-full border border-border/40 bg-card/30 px-1.5 py-0.5 text-[10px] text-muted-foreground hover:border-sky-500/40 hover:text-sky-300'
                title={`Filter by #${tag}`}
              >
                <Tag className='size-2.5' />
                {tag}
              </button>
            ))}
          </div>
        ) : <span className='text-[11px] opacity-30'>—</span>}
      </TableCell>
      <TableCell>
        <div className='flex items-center gap-1'>
          <Button
            variant='ghost'
            size='sm'
            className='h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-sky-300'
            onClick={() => onPreview(step)}
            title='Preview semantic Playwright code'
          >
            <Code2 className='size-3' />
            Code
          </Button>
          <Button
            variant='ghost'
            size='sm'
            className='h-7 gap-1 px-2 text-xs text-sky-400 hover:text-sky-300'
            onClick={() => handleAddStepToAction(step.id)}
            title='Add direct step to action constructor'
          >
            <Plus className='size-3' />
            Add
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='ghost' size='sm' className='size-7 p-0' aria-label='Step actions'>
                <MoreHorizontal className='size-3.5' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuItem onClick={() => setEditingStep(step)}>
                <Pencil className='size-3.5' />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                handleDuplicateStep(step.id).catch(() => undefined);
              }}>
                <Copy className='size-3.5' />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className='text-destructive focus:text-destructive'
                onClick={() => {
                  handleDeleteStep(step.id).catch(() => undefined);
                }}
              >
                <Trash2 className='size-3.5' />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  );
});

function StepsTable({ onPreview }: { onPreview: (step: PlaywrightStep) => void }): React.JSX.Element {
  const { filteredSteps, isLoading, setIsCreateStepOpen } = usePlaywrightStepSequencer();

  return (
    <Table wrapperClassName='overflow-hidden rounded-md border border-white/10'>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Scope</TableHead>
          <TableHead>Tags</TableHead>
          <TableHead className='w-10' />
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <StepListTableSkeleton />
        ) : filteredSteps.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className='py-10 text-center text-sm text-muted-foreground'>
              <div className='space-y-2'>
                <p>No steps yet.</p>
                <Button
                  variant='outline'
                  size='sm'
                  className='gap-1'
                  onClick={() => setIsCreateStepOpen(true)}
                >
                  <Plus className='size-3.5' />
                  Create first step
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ) : (
          filteredSteps.map((step) => <StepRow key={step.id} step={step} onPreview={onPreview} />)
        )}
      </TableBody>
    </Table>
  );
}

// ---------------------------------------------------------------------------
// Step Sets table
// ---------------------------------------------------------------------------

const StepSetRow = memo(({
  set,
  onPreview,
  onPreviewSet,
}: {
  set: PlaywrightStepSet;
  onPreview: (step: PlaywrightStep) => void;
  onPreviewSet: (stepSet: PlaywrightStepSet) => void;
}) => {
  const {
    setEditingSet,
    handleDeleteStepSet,
    handleDuplicateStepSet,
    handleAddStepSetToAction,
    setFilterTag,
    websites,
    flows,
    stepSetUsageCounts,
    orphanedStepIds,
  } = usePlaywrightStepSequencer();
  const [expanded, setExpanded] = useState(false);
  const usageCount = stepSetUsageCounts[set.id] ?? 0;
  const hasOrphanedSteps = set.stepIds.some((id) => orphanedStepIds.has(id));

  const websiteName = set.websiteId
    ? (websites.find((w) => w.id === set.websiteId)?.name ?? set.websiteId)
    : null;

  const flowName = set.flowId
    ? (flows.find((f) => f.id === set.flowId)?.name ?? set.flowId)
    : null;

  return (
    <>
    <TableRow className={expanded ? 'border-b-0' : undefined}>
      <TableCell>
        <button
          type='button'
          onClick={() => setExpanded((v) => !v)}
          className='flex items-center gap-1.5 font-medium text-sm hover:text-sky-300'
          aria-expanded={expanded}
          title={expanded ? 'Collapse steps' : 'Expand steps'}
        >
          {expanded
            ? <ChevronDown className='size-3.5 shrink-0 text-muted-foreground' />
            : <ChevronRight className='size-3.5 shrink-0 text-muted-foreground' />}
          {set.name}
        </button>
      </TableCell>
      <TableCell>
        <div className='flex items-center gap-1.5'>
          <span className='text-xs text-muted-foreground'>{set.stepIds.length} steps</span>
          {hasOrphanedSteps ? (
            <span
              className='inline-flex items-center gap-0.5 text-[10px] text-amber-400'
              title='Some referenced steps have been deleted'
            >
              <AlertTriangle className='size-3' />
              orphaned
            </span>
          ) : null}
          {usageCount > 0 ? (
            <Badge variant='neutral' className='h-4 px-1 text-[9px]'>
              {usageCount} action{usageCount !== 1 ? 's' : ''}
            </Badge>
          ) : null}
        </div>
      </TableCell>
      <TableCell className='max-w-[240px] truncate text-xs text-muted-foreground'>
        {set.description ?? <span className='opacity-40'>—</span>}
      </TableCell>
      <TableCell>
        {set.shared || set.websiteId === null ? (
          <span className='inline-flex items-center gap-1 text-[11px] text-emerald-400'>
            <Share2 className='size-3' />
            Shared
          </span>
        ) : (
          <span className='inline-flex items-center gap-1 text-[11px] text-sky-400'>
            <Globe className='size-3' />
            {websiteName}
          </span>
        )}
        {set.flowId ? (
          <span className='ml-2 inline-flex items-center gap-1 text-[11px] text-purple-400'>
            <Lock className='size-3' />
            {flowName}
          </span>
        ) : null}
      </TableCell>
      <TableCell>
        {set.tags.length > 0 ? (
          <div className='flex flex-wrap gap-1'>
            {set.tags.map((tag) => (
              <button
                key={tag}
                type='button'
                onClick={() => setFilterTag(tag)}
                className='inline-flex items-center gap-0.5 rounded-full border border-border/40 bg-card/30 px-1.5 py-0.5 text-[10px] text-muted-foreground hover:border-sky-500/40 hover:text-sky-300'
                title={`Filter by #${tag}`}
              >
                <Tag className='size-2.5' />
                {tag}
              </button>
            ))}
          </div>
        ) : <span className='text-[11px] opacity-30'>—</span>}
      </TableCell>
      <TableCell>
        <div className='flex items-center gap-1'>
          <Button
            variant='ghost'
            size='sm'
            className='h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-sky-300'
            onClick={() => onPreviewSet(set)}
            title='Preview composed Playwright code'
          >
            <Code2 className='size-3' />
            Code
          </Button>
          <Button
            variant='ghost'
            size='sm'
            className='h-7 gap-1 px-2 text-xs text-sky-400 hover:text-sky-300'
            onClick={() => handleAddStepSetToAction(set.id)}
            title='Add to action constructor'
          >
            <Plus className='size-3' />
            Add
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='ghost' size='sm' className='size-7 p-0' aria-label='Set actions'>
                <MoreHorizontal className='size-3.5' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuItem onClick={() => setEditingSet(set)}>
                <Pencil className='size-3.5' />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                handleDuplicateStepSet(set.id).catch(() => undefined);
              }}>
                <Copy className='size-3.5' />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className='text-destructive focus:text-destructive'
                onClick={() => {
                  handleDeleteStepSet(set.id).catch(() => undefined);
                }}
              >
                <Trash2 className='size-3.5' />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
    {expanded && set.stepIds.length > 0 ? (
      <TableRow className='bg-card/10 hover:bg-card/10'>
        <TableCell colSpan={6} className='py-1.5 pl-8 pr-3'>
          <div className='space-y-0.5 rounded border border-border/20 bg-black/10 py-1'>
            {set.stepIds.map((stepId, idx) => (
              <div key={`${stepId}_${idx}`} className='flex items-center gap-1'>
                <span className='w-5 shrink-0 text-right text-[10px] font-mono text-muted-foreground/40'>
                  {idx + 1}.
                </span>
                <StepPreviewRow stepId={stepId} onPreview={onPreview} />
              </div>
            ))}
          </div>
        </TableCell>
      </TableRow>
    ) : null}
    </>
  );
});

function StepSetsTable({
  onPreview,
  onPreviewSet,
}: {
  onPreview: (step: PlaywrightStep) => void;
  onPreviewSet: (stepSet: PlaywrightStepSet) => void;
}): React.JSX.Element {
  const { filteredStepSets, isLoading, setIsCreateSetOpen } = usePlaywrightStepSequencer();

  return (
    <Table wrapperClassName='overflow-hidden rounded-md border border-white/10'>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Steps</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Scope</TableHead>
          <TableHead>Tags</TableHead>
          <TableHead className='w-20' />
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <StepListTableSkeleton />
        ) : filteredStepSets.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className='py-10 text-center text-sm text-muted-foreground'>
              <div className='space-y-2'>
                <p>No step sets yet.</p>
                <Button
                  variant='outline'
                  size='sm'
                  className='gap-1'
                  onClick={() => setIsCreateSetOpen(true)}
                >
                  <Plus className='size-3.5' />
                  Create first step set
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ) : (
          filteredStepSets.map((set) => (
            <StepSetRow
              key={set.id}
              set={set}
              onPreview={onPreview}
              onPreviewSet={onPreviewSet}
            />
          ))
        )}
      </TableBody>
    </Table>
  );
}

// ---------------------------------------------------------------------------
// Combined export
// ---------------------------------------------------------------------------

export function StepListTable(): React.JSX.Element {
  const { activeTab, steps } = usePlaywrightStepSequencer();
  const [previewStep, setPreviewStep] = useState<PlaywrightStep | null>(null);
  const [previewStepSet, setPreviewStepSet] = useState<PlaywrightStepSet | null>(null);

  return (
    <>
      {activeTab === 'steps' ? (
        <StepsTable onPreview={setPreviewStep} />
      ) : (
        <StepSetsTable onPreview={setPreviewStep} onPreviewSet={setPreviewStepSet} />
      )}
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
    </>
  );
}
