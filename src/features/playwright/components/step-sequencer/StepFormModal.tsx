'use client';

import { useEffect, useState } from 'react';

import {
  PLAYWRIGHT_STEP_TYPE_LABELS,
  type PlaywrightStep,
  type PlaywrightStepType,
} from '@/shared/contracts/playwright-steps';
import {
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

import { usePlaywrightStepSequencer } from '../../context/PlaywrightStepSequencerContext';
import { TagsInput } from './TagsInput';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STEP_TYPES = Object.entries(PLAYWRIGHT_STEP_TYPE_LABELS) as [PlaywrightStepType, string][];

/** Steps that use a CSS selector */
const SELECTOR_TYPES: PlaywrightStepType[] = [
  'click', 'fill', 'select', 'check', 'uncheck', 'hover',
  'wait_for_selector', 'assert_text', 'assert_visible', 'scroll',
];

/** Steps that use a value input */
const VALUE_TYPES: PlaywrightStepType[] = [
  'fill', 'select', 'press_key', 'assert_text',
];

/** Steps that use a URL */
const URL_TYPES: PlaywrightStepType[] = ['navigate', 'assert_url'];

/** Steps that use a timeout number */
const TIMEOUT_TYPES: PlaywrightStepType[] = ['wait_for_timeout', 'wait_for_selector'];

/** Steps that use a custom script textarea */
const SCRIPT_TYPES: PlaywrightStepType[] = ['custom_script'];

function buildEmpty(): Partial<PlaywrightStep> {
  return {
    name: '',
    description: null,
    type: 'click',
    selector: null,
    value: null,
    url: null,
    key: null,
    timeout: null,
    script: null,
    websiteId: null,
    flowId: null,
    tags: [],
    sortOrder: 0,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StepFormModal(): React.JSX.Element | null {
  const {
    isCreateStepOpen,
    editingStep,
    setIsCreateStepOpen,
    setEditingStep,
    handleCreateStep,
    handleUpdateStep,
    isSaving,
    websites,
    flows,
  } = usePlaywrightStepSequencer();

  const isOpen = isCreateStepOpen || editingStep !== null;
  const isEditing = editingStep !== null;

  const [draft, setDraft] = useState<Partial<PlaywrightStep>>(buildEmpty);

  // Sync draft when editing step changes
  useEffect(() => {
    if (editingStep) {
      setDraft(editingStep);
    } else {
      setDraft(buildEmpty());
    }
  }, [editingStep]);

  if (!isOpen) return null;

  const close = (): void => {
    setIsCreateStepOpen(false);
    setEditingStep(null);
  };

  const set = <K extends keyof PlaywrightStep>(key: K, value: PlaywrightStep[K]): void =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const name = draft.name?.trim();
    if (!name || !draft.type) return;

    const payload = {
      name,
      description: draft.description?.trim() || null,
      type: draft.type,
      selector: draft.selector?.trim() || null,
      value: draft.value?.trim() || null,
      url: draft.url?.trim() || null,
      key: draft.key?.trim() || null,
      timeout: draft.timeout ?? null,
      script: draft.script?.trim() || null,
      websiteId: draft.websiteId ?? null,
      flowId: draft.flowId ?? null,
      tags: draft.tags ?? [],
      sortOrder: draft.sortOrder ?? 0,
    };

    if (isEditing && editingStep) {
      await handleUpdateStep(editingStep.id, payload);
    } else {
      await handleCreateStep(payload);
    }
  };

  const stepType = draft.type ?? 'click';
  const showSelector = SELECTOR_TYPES.includes(stepType);
  const showValue = VALUE_TYPES.includes(stepType);
  const showUrl = URL_TYPES.includes(stepType);
  const showTimeout = TIMEOUT_TYPES.includes(stepType);
  const showScript = SCRIPT_TYPES.includes(stepType);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) close(); }}>
      <DialogContent className='max-w-lg'>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Step' : 'New Step'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the step parameters and scope.'
              : 'Define a reusable browser automation step.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(e)} className='space-y-4'>
          {/* Name */}
          <div className='space-y-1.5'>
            <Label htmlFor='step-name'>Name <span className='text-destructive'>*</span></Label>
            <Input
              id='step-name'
              value={draft.name ?? ''}
              onChange={(e) => set('name', e.target.value)}
              placeholder='e.g. Click Add to Cart'
              required
            />
          </div>

          {/* Description */}
          <div className='space-y-1.5'>
            <Label htmlFor='step-desc'>Description</Label>
            <Textarea
              id='step-desc'
              value={draft.description ?? ''}
              onChange={(e) => set('description', e.target.value || null)}
              placeholder='What does this step do?'
              rows={2}
            />
          </div>

          {/* Type */}
          <div className='space-y-1.5'>
            <Label>Type <span className='text-destructive'>*</span></Label>
            <Select
              value={draft.type}
              onValueChange={(v) => set('type', v as PlaywrightStepType)}
            >
              <SelectTrigger>
                <SelectValue placeholder='Select type…' />
              </SelectTrigger>
              <SelectContent>
                {STEP_TYPES.map(([type, label]) => (
                  <SelectItem key={type} value={type}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Type-specific parameters */}
          {showSelector ? (
            <div className='space-y-1.5'>
              <Label htmlFor='step-selector'>CSS Selector</Label>
              <Input
                id='step-selector'
                value={draft.selector ?? ''}
                onChange={(e) => set('selector', e.target.value || null)}
                placeholder='e.g. button[data-testid="add-to-cart"]'
                className='font-mono text-xs'
              />
            </div>
          ) : null}

          {showUrl ? (
            <div className='space-y-1.5'>
              <Label htmlFor='step-url'>URL</Label>
              <Input
                id='step-url'
                value={draft.url ?? ''}
                onChange={(e) => set('url', e.target.value || null)}
                placeholder='https://…'
              />
            </div>
          ) : null}

          {showValue ? (
            <div className='space-y-1.5'>
              <Label htmlFor='step-value'>
                {stepType === 'press_key' ? 'Key' : 'Value'}
              </Label>
              <Input
                id='step-value'
                value={draft.value ?? ''}
                onChange={(e) => set('value', e.target.value || null)}
                placeholder={stepType === 'press_key' ? 'e.g. Enter' : 'e.g. Hello World'}
              />
            </div>
          ) : null}

          {showTimeout ? (
            <div className='space-y-1.5'>
              <Label htmlFor='step-timeout'>Timeout (ms)</Label>
              <Input
                id='step-timeout'
                type='number'
                min={0}
                value={draft.timeout ?? ''}
                onChange={(e) =>
                  set('timeout', e.target.value ? Number(e.target.value) : null)
                }
                placeholder='e.g. 5000'
              />
            </div>
          ) : null}

          {showScript ? (
            <div className='space-y-1.5'>
              <Label htmlFor='step-script'>Script</Label>
              <Textarea
                id='step-script'
                value={draft.script ?? ''}
                onChange={(e) => set('script', e.target.value || null)}
                placeholder='// Custom Playwright script…'
                rows={5}
                className='font-mono text-xs'
              />
            </div>
          ) : null}

          <Separator />

          {/* Scope */}
          <div className='space-y-2'>
            <Label>Scope</Label>
            <div className='flex items-center gap-2'>
              <Checkbox
                id='step-shared'
                checked={draft.websiteId === null}
                onCheckedChange={(checked) => {
                  if (checked) {
                    set('websiteId', null);
                    set('flowId', null);
                  } else {
                    set('websiteId', websites[0]?.id ?? null);
                    set('flowId', null);
                  }
                }}
              />
              <label htmlFor='step-shared' className='cursor-pointer text-sm'>
                Shared (available to all websites)
              </label>
            </div>

            {draft.websiteId !== null ? (
              <div className='ml-6 space-y-2'>
                {/* Website select */}
                <div className='space-y-1'>
                  <Label className='text-xs text-muted-foreground'>Website</Label>
                  <Select
                    value={draft.websiteId ?? ''}
                    onValueChange={(v) => {
                      set('websiteId', v || null);
                      set('flowId', null);
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
                      onValueChange={(v) => set('flowId', v === '__none__' ? null : v)}
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
            id='step-tags'
            label='Tags'
            value={draft.tags ?? []}
            onChange={(tags) => set('tags', tags)}
            placeholder='e.g. checkout, login…'
          />

          <DialogFooter>
            <Button type='button' variant='outline' onClick={close} disabled={isSaving}>
              Cancel
            </Button>
            <Button type='submit' disabled={isSaving || !draft.name?.trim()}>
              {isSaving ? 'Saving…' : isEditing ? 'Update Step' : 'Create Step'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
