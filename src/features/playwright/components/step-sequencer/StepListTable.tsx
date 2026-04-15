'use client';

import { Copy, Globe, Lock, MoreHorizontal, Pencil, Plus, Share2, Tag, Trash2 } from 'lucide-react';
import { memo } from 'react';

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
import { StepTypeIcon } from './StepTypeIcon';

// ---------------------------------------------------------------------------
// Steps table
// ---------------------------------------------------------------------------

const StepRow = memo(({ step }: { step: PlaywrightStep }) => {
  const { setEditingStep, handleDeleteStep, handleDuplicateStep, setFilterTag, websites, flows } =
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
          <span className='font-medium text-sm'>{step.name}</span>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant='neutral' className='text-[10px] uppercase tracking-wide'>
          {PLAYWRIGHT_STEP_TYPE_LABELS[step.type]}
        </Badge>
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
            <DropdownMenuItem onClick={() => void handleDuplicateStep(step.id)}>
              <Copy className='size-3.5' />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className='text-destructive focus:text-destructive'
              onClick={() => void handleDeleteStep(step.id)}
            >
              <Trash2 className='size-3.5' />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
});

function StepsTable(): React.JSX.Element {
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
          filteredSteps.map((step) => <StepRow key={step.id} step={step} />)
        )}
      </TableBody>
    </Table>
  );
}

// ---------------------------------------------------------------------------
// Step Sets table
// ---------------------------------------------------------------------------

const StepSetRow = memo(({ set }: { set: PlaywrightStepSet }) => {
  const {
    setEditingSet,
    handleDeleteStepSet,
    handleDuplicateStepSet,
    handleAddStepSetToAction,
    setFilterTag,
    websites,
    flows,
  } = usePlaywrightStepSequencer();

  const websiteName = set.websiteId
    ? (websites.find((w) => w.id === set.websiteId)?.name ?? set.websiteId)
    : null;

  const flowName = set.flowId
    ? (flows.find((f) => f.id === set.flowId)?.name ?? set.flowId)
    : null;

  return (
    <TableRow>
      <TableCell className='font-medium text-sm'>{set.name}</TableCell>
      <TableCell className='text-xs text-muted-foreground'>{set.stepIds.length} steps</TableCell>
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
              <DropdownMenuItem onClick={() => void handleDuplicateStepSet(set.id)}>
                <Copy className='size-3.5' />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className='text-destructive focus:text-destructive'
                onClick={() => void handleDeleteStepSet(set.id)}
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

function StepSetsTable(): React.JSX.Element {
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
          filteredStepSets.map((set) => <StepSetRow key={set.id} set={set} />)
        )}
      </TableBody>
    </Table>
  );
}

// ---------------------------------------------------------------------------
// Combined export
// ---------------------------------------------------------------------------

export function StepListTable(): React.JSX.Element {
  const { activeTab } = usePlaywrightStepSequencer();
  return activeTab === 'steps' ? <StepsTable /> : <StepSetsTable />;
}
