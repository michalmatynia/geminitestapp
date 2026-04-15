'use client';

import { GripVertical, Minus, Plus, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import type { PlaywrightStep, PlaywrightStepSet } from '@/shared/contracts/playwright-steps';
import { PLAYWRIGHT_STEP_TYPE_LABELS } from '@/shared/contracts/playwright-steps';
import {
  Badge,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Textarea,
} from '@/shared/ui/primitives.public';
import { cn } from '@/shared/utils/ui-utils';

import { usePlaywrightStepSequencer } from '../../context/PlaywrightStepSequencerContext';
import { TagsInput } from './TagsInput';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildEmpty(): Partial<PlaywrightStepSet> {
  return {
    name: '',
    description: null,
    stepIds: [],
    websiteId: null,
    flowId: null,
    shared: true,
    tags: [],
  };
}

// ---------------------------------------------------------------------------
// Step picker row
// ---------------------------------------------------------------------------

function StepPickerRow({
  step,
  isSelected,
  onToggle,
}: {
  step: PlaywrightStep;
  isSelected: boolean;
  onToggle: () => void;
}): React.JSX.Element {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 transition-colors',
        isSelected ? 'bg-sky-600/15' : 'hover:bg-muted/30'
      )}
    >
      <Checkbox checked={isSelected} onCheckedChange={onToggle} />
      <span className='min-w-0 flex-1 truncate text-xs font-medium'>{step.name}</span>
      <Badge variant='neutral' className='shrink-0 h-4 px-1 text-[9px]'>
        {PLAYWRIGHT_STEP_TYPE_LABELS[step.type]}
      </Badge>
    </label>
  );
}

// ---------------------------------------------------------------------------
// Ordered step list (right panel)
// ---------------------------------------------------------------------------

function OrderedStepItem({
  step,
  index,
  total,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  step: PlaywrightStep;
  index: number;
  total: number;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}): React.JSX.Element {
  return (
    <div className='group flex items-center gap-1.5 rounded border border-border/40 bg-card/30 px-2 py-1'>
      <GripVertical className='size-3.5 shrink-0 text-muted-foreground opacity-30' />
      <span className='shrink-0 w-4 text-right text-[10px] font-mono text-muted-foreground'>
        {index + 1}.
      </span>
      <span className='min-w-0 flex-1 truncate text-xs'>{step.name}</span>
      <div className='invisible flex items-center gap-0.5 group-hover:visible'>
        <button
          type='button'
          disabled={index === 0}
          onClick={onMoveUp}
          className='size-4 rounded text-muted-foreground hover:text-foreground disabled:opacity-30'
          aria-label='Move up'
        >
          ↑
        </button>
        <button
          type='button'
          disabled={index === total - 1}
          onClick={onMoveDown}
          className='size-4 rounded text-muted-foreground hover:text-foreground disabled:opacity-30'
          aria-label='Move down'
        >
          ↓
        </button>
        <button
          type='button'
          onClick={onRemove}
          className='size-4 rounded text-muted-foreground hover:text-destructive'
          aria-label='Remove'
        >
          <X className='size-3' />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main modal
// ---------------------------------------------------------------------------

export function StepSetFormModal(): React.JSX.Element | null {
  const {
    isCreateSetOpen,
    editingSet,
    setIsCreateSetOpen,
    setEditingSet,
    handleCreateStepSet,
    handleUpdateStepSet,
    steps,
    isSaving,
    websites,
    flows,
  } = usePlaywrightStepSequencer();

  const isOpen = isCreateSetOpen || editingSet !== null;
  const isEditing = editingSet !== null;

  const [draft, setDraft] = useState<Partial<PlaywrightStepSet>>(buildEmpty);
  const [stepSearch, setStepSearch] = useState('');

  useEffect(() => {
    if (editingSet) {
      setDraft(editingSet);
    } else {
      setDraft(buildEmpty());
    }
    setStepSearch('');
  }, [editingSet, isCreateSetOpen]);

  if (!isOpen) return null;

  const close = (): void => {
    setIsCreateSetOpen(false);
    setEditingSet(null);
  };

  const setField = <K extends keyof PlaywrightStepSet>(
    key: K,
    value: PlaywrightStepSet[K]
  ): void => setDraft((prev) => ({ ...prev, [key]: value }));

  // Filtered available steps
  const availableSteps = useMemo(() => {
    const q = stepSearch.trim().toLowerCase();
    if (!q) return steps;
    return steps.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        PLAYWRIGHT_STEP_TYPE_LABELS[s.type].toLowerCase().includes(q)
    );
  }, [steps, stepSearch]);

  // Ordered selected steps
  const selectedStepIds = draft.stepIds ?? [];
  const orderedSelectedSteps = useMemo(
    () =>
      selectedStepIds
        .map((id) => steps.find((s) => s.id === id))
        .filter((s): s is PlaywrightStep => s !== undefined),
    [selectedStepIds, steps]
  );

  const toggleStep = (stepId: string): void => {
    const current = draft.stepIds ?? [];
    if (current.includes(stepId)) {
      setField('stepIds', current.filter((id) => id !== stepId));
    } else {
      setField('stepIds', [...current, stepId]);
    }
  };

  const removeStep = (index: number): void => {
    setField(
      'stepIds',
      (draft.stepIds ?? []).filter((_, i) => i !== index)
    );
  };

  const moveStep = (from: number, to: number): void => {
    const ids = [...(draft.stepIds ?? [])];
    const [moved] = ids.splice(from, 1);
    if (moved !== undefined) ids.splice(to, 0, moved);
    setField('stepIds', ids);
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const name = draft.name?.trim();
    if (!name) return;

    const payload = {
      name,
      description: draft.description?.trim() || null,
      stepIds: draft.stepIds ?? [],
      websiteId: draft.websiteId ?? null,
      flowId: draft.flowId ?? null,
      shared: draft.shared ?? true,
      tags: draft.tags ?? [],
    };

    if (isEditing && editingSet) {
      await handleUpdateStepSet(editingSet.id, payload);
    } else {
      await handleCreateStepSet(payload);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) close(); }}>
      <DialogContent className='max-w-2xl'>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Step Set' : 'New Step Set'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the step set composition and scope.'
              : 'Combine steps into a reusable ordered sequence.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(e)} className='space-y-4'>
          {/* Name */}
          <div className='space-y-1.5'>
            <Label htmlFor='set-name'>Name <span className='text-destructive'>*</span></Label>
            <Input
              id='set-name'
              value={draft.name ?? ''}
              onChange={(e) => setField('name', e.target.value)}
              placeholder='e.g. Add product to cart'
              required
            />
          </div>

          {/* Description */}
          <div className='space-y-1.5'>
            <Label htmlFor='set-desc'>Description</Label>
            <Textarea
              id='set-desc'
              value={draft.description ?? ''}
              onChange={(e) => setField('description', e.target.value || null)}
              placeholder='What does this set accomplish?'
              rows={2}
            />
          </div>

          {/* Scope */}
          <div className='space-y-2'>
            <Label>Scope</Label>
            <div className='flex items-center gap-2'>
              <Checkbox
                id='set-shared'
                checked={draft.shared ?? true}
                onCheckedChange={(checked) => {
                  setField('shared', Boolean(checked));
                  if (checked) {
                    setField('websiteId', null);
                    setField('flowId', null);
                  } else {
                    setField('websiteId', websites[0]?.id ?? null);
                  }
                }}
              />
              <label htmlFor='set-shared' className='cursor-pointer text-sm'>
                Shared (available to all websites)
              </label>
            </div>

            {!(draft.shared ?? true) ? (
              <div className='ml-6 space-y-2'>
                {/* Website select */}
                <div className='space-y-1'>
                  <Label className='text-xs text-muted-foreground'>Website</Label>
                  <Select
                    value={draft.websiteId ?? ''}
                    onValueChange={(v) => {
                      setField('websiteId', v || null);
                      setField('flowId', null);
                    }}
                  >
                    <SelectTrigger className='h-8 text-xs'>
                      <SelectValue placeholder='Select website…' />
                    </SelectTrigger>
                    <SelectContent>
                      {websites.map((w) => (
                        <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Flow select (optional) */}
                {draft.websiteId ? (
                  <div className='space-y-1'>
                    <Label className='text-xs text-muted-foreground'>Flow (optional)</Label>
                    <Select
                      value={draft.flowId ?? '__none__'}
                      onValueChange={(v) => setField('flowId', v === '__none__' ? null : v)}
                    >
                      <SelectTrigger className='h-8 text-xs'>
                        <SelectValue placeholder='Any flow' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='__none__'>Any flow</SelectItem>
                        {flows
                          .filter((f) => f.websiteId === draft.websiteId)
                          .map((f) => (
                            <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Tags */}
          <TagsInput
            id='set-tags'
            label='Tags'
            value={draft.tags ?? []}
            onChange={(tags) => setField('tags', tags)}
            placeholder='e.g. checkout, product…'
          />

          <Separator />

          {/* Step picker */}
          <div className='grid grid-cols-2 gap-3'>
            {/* Left: available steps */}
            <div className='space-y-2'>
              <Label className='text-xs text-muted-foreground'>
                Available steps ({availableSteps.length})
              </Label>
              <Input
                value={stepSearch}
                onChange={(e) => setStepSearch(e.target.value)}
                placeholder='Search steps…'
                className='h-7 text-xs'
                aria-label='Search steps'
              />
              <div className='h-[220px] overflow-y-auto rounded border border-border/40 bg-card/20 p-1'>
                {availableSteps.length === 0 ? (
                  <p className='px-2 py-4 text-center text-xs text-muted-foreground'>
                    {steps.length === 0
                      ? 'No steps yet — create steps first.'
                      : 'No matches.'}
                  </p>
                ) : (
                  availableSteps.map((step) => (
                    <StepPickerRow
                      key={step.id}
                      step={step}
                      isSelected={selectedStepIds.includes(step.id)}
                      onToggle={() => toggleStep(step.id)}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Right: ordered selection */}
            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <Label className='text-xs text-muted-foreground'>
                  Sequence ({orderedSelectedSteps.length} steps)
                </Label>
                {orderedSelectedSteps.length > 0 ? (
                  <button
                    type='button'
                    onClick={() => setField('stepIds', [])}
                    className='text-[11px] text-muted-foreground hover:text-destructive'
                  >
                    Clear all
                  </button>
                ) : null}
              </div>
              <div className='h-[252px] overflow-y-auto rounded border border-border/40 bg-card/20 p-1'>
                {orderedSelectedSteps.length === 0 ? (
                  <div className='flex h-full flex-col items-center justify-center gap-1 text-center text-xs text-muted-foreground'>
                    <Plus className='size-5 opacity-20' />
                    <p>Check steps on the left to add them here.</p>
                  </div>
                ) : (
                  <div className='space-y-1'>
                    {orderedSelectedSteps.map((step, idx) => (
                      <OrderedStepItem
                        key={`${step.id}_${idx}`}
                        step={step}
                        index={idx}
                        total={orderedSelectedSteps.length}
                        onRemove={() => removeStep(idx)}
                        onMoveUp={() => moveStep(idx, idx - 1)}
                        onMoveDown={() => moveStep(idx, idx + 1)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type='button' variant='outline' onClick={close} disabled={isSaving}>
              Cancel
            </Button>
            <Button type='submit' disabled={isSaving || !draft.name?.trim()}>
              {isSaving
                ? 'Saving…'
                : isEditing
                  ? 'Update Step Set'
                  : `Create Step Set${orderedSelectedSteps.length > 0 ? ` (${orderedSelectedSteps.length} steps)` : ''}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
