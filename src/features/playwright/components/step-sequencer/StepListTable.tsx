'use client';

import { Globe, Lock, MoreHorizontal, Pencil, Plus, Share2, Trash2 } from 'lucide-react';
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

// ---------------------------------------------------------------------------
// Steps table
// ---------------------------------------------------------------------------

const StepRow = memo(function StepRow({ step }: { step: PlaywrightStep }) {
  const { setEditingStep, handleDeleteStep } = usePlaywrightStepSequencer();

  return (
    <TableRow>
      <TableCell className='font-medium text-sm'>{step.name}</TableCell>
      <TableCell>
        <Badge variant='neutral' className='text-[10px] uppercase tracking-wide'>
          {PLAYWRIGHT_STEP_TYPE_LABELS[step.type]}
        </Badge>
      </TableCell>
      <TableCell className='max-w-[280px] truncate text-xs text-muted-foreground'>
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
            Site
          </span>
        )}
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
          <TableHead className='w-10' />
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <StepListTableSkeleton />
        ) : filteredSteps.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className='py-10 text-center text-sm text-muted-foreground'>
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

const StepSetRow = memo(function StepSetRow({ set }: { set: PlaywrightStepSet }) {
  const { setEditingSet, handleDeleteStepSet, handleAddStepSetToAction } =
    usePlaywrightStepSequencer();

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
            Site
          </span>
        )}
        {set.flowId ? (
          <span className='ml-2 inline-flex items-center gap-1 text-[11px] text-purple-400'>
            <Lock className='size-3' />
            Flow
          </span>
        ) : null}
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
          <TableHead className='w-20' />
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <StepListTableSkeleton />
        ) : filteredStepSets.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className='py-10 text-center text-sm text-muted-foreground'>
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
