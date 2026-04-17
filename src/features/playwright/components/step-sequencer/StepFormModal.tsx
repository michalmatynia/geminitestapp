'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  useSaveTraderaSelectorRegistryEntryMutation,
  useTraderaSelectorRegistry,
} from '@/features/integrations/hooks/useTraderaSelectorRegistry';
import type { TraderaSelectorRegistryEntry } from '@/shared/contracts/integrations/tradera-selector-registry';
import {
  PLAYWRIGHT_STEP_TYPE_LABELS,
  type PlaywrightStep,
  type PlaywrightStepInputBinding,
  type PlaywrightStepInputBindingMode,
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
const SELECTOR_REGISTRY_HREF = '/admin/integrations/marketplaces/tradera/selectors';
const AMAZON_SELECTOR_REGISTRY_HREF = '/admin/integrations/amazon/selectors';
const SUPPLIER_1688_SELECTOR_REGISTRY_HREF = '/admin/integrations/1688/selectors';

const resolveSelectorRegistryHref = (
  selectorProfile?: string | null,
  selectorKey?: string | null
): string =>
  selectorProfile === '1688' || selectorKey?.startsWith('supplier1688.')
    ? SUPPLIER_1688_SELECTOR_REGISTRY_HREF
    : selectorProfile === 'amazon' || selectorKey?.startsWith('amazon.')
      ? AMAZON_SELECTOR_REGISTRY_HREF
      : SELECTOR_REGISTRY_HREF;

const buildRegistryOverrideValueJson = (
  entry: TraderaSelectorRegistryEntry,
  selector: string
): string | null => {
  if (entry.valueType === 'string') return JSON.stringify(selector, null, 2);
  if (entry.valueType === 'string_array') return JSON.stringify([selector], null, 2);
  if (entry.valueType === 'nested_string_array') return JSON.stringify([[selector]], null, 2);
  return null;
};

type StepDraft = Partial<PlaywrightStep> & {
  selectorKey?: string | null;
  selectorProfile?: string | null;
};

function buildEmpty(): StepDraft {
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
    inputBindings: {},
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

  const [draft, setDraft] = useState<StepDraft>(buildEmpty);
  const registryQuery = useTraderaSelectorRegistry();
  const saveRegistryMutation = useSaveTraderaSelectorRegistryEntryMutation();
  const [registrySaveMessage, setRegistrySaveMessage] = useState<string | null>(null);
  const [registrySaveError, setRegistrySaveError] = useState<string | null>(null);
  const registrySelectorEntries = useMemo(
    () =>
      (registryQuery.data?.entries ?? [])
        .filter((entry) => entry.kind === 'selectors')
        .sort((left, right) =>
          `${left.profile}:${left.group}:${left.key}`.localeCompare(
            `${right.profile}:${right.group}:${right.key}`
          )
        ),
    [registryQuery.data?.entries]
  );
  const registryProfiles = useMemo(
    () => Array.from(new Set(registrySelectorEntries.map((entry) => entry.profile))).sort(),
    [registrySelectorEntries]
  );

  // Sync draft when editing step changes
  useEffect(() => {
    if (editingStep) {
      setDraft(editingStep);
    } else {
      setDraft(buildEmpty());
    }
    setRegistrySaveMessage(null);
    setRegistrySaveError(null);
  }, [editingStep]);

  const selectorBinding = draft.inputBindings?.['selector'];
  const selectorBindingMode: PlaywrightStepInputBindingMode =
    selectorBinding?.mode === 'selectorRegistry' || selectorBinding?.mode === 'disabled'
      ? selectorBinding.mode
      : 'literal';
  const selectorFallback = selectorBinding?.fallbackSelector ?? draft.selector ?? '';
  const selectedRegistryProfile =
    selectorBinding?.selectorProfile ?? registryProfiles[0] ?? 'default';
  const registryProfilesForSelect = useMemo(
    () =>
      registryProfiles.includes(selectedRegistryProfile)
        ? registryProfiles
        : [selectedRegistryProfile, ...registryProfiles],
    [registryProfiles, selectedRegistryProfile]
  );
  const selectedRegistryEntry = useMemo(
    () =>
      registrySelectorEntries.find(
        (entry) =>
          entry.key === selectorBinding?.selectorKey &&
          entry.profile === selectedRegistryProfile
      ) ??
      registrySelectorEntries.find((entry) => entry.key === selectorBinding?.selectorKey) ??
      null,
    [registrySelectorEntries, selectedRegistryProfile, selectorBinding?.selectorKey]
  );
  const registryEntriesForProfile = useMemo(
    () =>
      registrySelectorEntries.filter((entry) => entry.profile === selectedRegistryProfile),
    [registrySelectorEntries, selectedRegistryProfile]
  );

  if (!isOpen) return null;

  const close = (): void => {
    setIsCreateStepOpen(false);
    setEditingStep(null);
  };

  const set = <K extends keyof StepDraft>(key: K, value: StepDraft[K]): void =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const setSelectorBinding = (updates: Partial<PlaywrightStepInputBinding>): void => {
    setDraft((prev) => {
      const existing = prev.inputBindings?.['selector'];
      const nextBinding: PlaywrightStepInputBinding = {
        mode: existing?.mode ?? 'literal',
        ...existing,
        ...updates,
      };
      return {
        ...prev,
        inputBindings: {
          ...(prev.inputBindings ?? {}),
          selector: nextBinding,
        },
      };
    });
  };

  const connectSelectorRegistryEntry = (entry: TraderaSelectorRegistryEntry): void => {
    const fallbackSelector = (entry.preview[0] ?? selectorFallback) || null;
    setDraft((prev) => ({
      ...prev,
      selector: fallbackSelector,
      inputBindings: {
        ...(prev.inputBindings ?? {}),
        selector: {
          mode: 'selectorRegistry',
          selectorKey: entry.key,
          selectorProfile: entry.profile,
          fallbackSelector,
        },
      },
    }));
  };

  const handleSaveFallbackAsRegistryOverride = async (): Promise<void> => {
    if (!selectedRegistryEntry) return;
    const selector = selectorFallback.trim();
    if (!selector) return;
    const valueJson = buildRegistryOverrideValueJson(selectedRegistryEntry, selector);
    if (!valueJson) {
      setRegistrySaveMessage(null);
      setRegistrySaveError('This registry entry type cannot be updated from a single selector.');
      return;
    }

    setRegistrySaveMessage(null);
    setRegistrySaveError(null);
    try {
      const result = await saveRegistryMutation.mutateAsync({
        profile: selectedRegistryProfile,
        key: selectedRegistryEntry.key,
        valueJson,
      });
      setSelectorBinding({
        mode: 'selectorRegistry',
        selectorKey: result.key,
        selectorProfile: result.profile,
        fallbackSelector: result.preview[0] ?? selector,
      });
      set('selector', result.preview[0] ?? selector);
      setRegistrySaveMessage(`Saved registry override for ${result.profile}/${result.key}.`);
    } catch (error) {
      setRegistrySaveError(error instanceof Error ? error.message : 'Failed to save registry override.');
    }
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const name = draft.name?.trim();
    if (!name || !draft.type) return;
    const inputBindings: Record<string, PlaywrightStepInputBinding> = {
      ...(draft.inputBindings ?? {}),
    };
    const selector = draft.selector?.trim() || null;

    if (SELECTOR_TYPES.includes(draft.type)) {
      const selectorBinding = inputBindings['selector'];
      if (selectorBinding?.mode === 'selectorRegistry') {
        inputBindings['selector'] = {
          mode: 'selectorRegistry',
          selectorKey: selectorBinding.selectorKey?.trim() || null,
          selectorProfile: selectorBinding.selectorProfile?.trim() || null,
          fallbackSelector: selectorBinding.fallbackSelector?.trim() || selector,
        };
      } else if (selectorBinding?.mode === 'disabled') {
        inputBindings['selector'] = {
          mode: 'disabled',
          disabledReason: selectorBinding.disabledReason?.trim() || 'Selector intentionally disabled',
          fallbackSelector: selectorBinding.fallbackSelector?.trim() || selector,
        };
      } else {
        inputBindings['selector'] = {
          mode: 'literal',
          value: selector,
        };
      }
    } else {
      delete inputBindings['selector'];
    }

    const payload = {
      name,
      description: draft.description?.trim() || null,
      type: draft.type,
      selector,
      value: draft.value?.trim() || null,
      url: draft.url?.trim() || null,
      key: draft.key?.trim() || null,
      timeout: draft.timeout ?? null,
      script: draft.script?.trim() || null,
      inputBindings,
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
            <div className='space-y-3 rounded border border-border/50 bg-card/20 p-3'>
              <div className='space-y-1.5'>
                <Label>Selector binding</Label>
                <Select
                  value={selectorBindingMode}
                  onValueChange={(value) => {
                    const mode = value as PlaywrightStepInputBindingMode;
                    if (mode === 'selectorRegistry') {
                      setSelectorBinding({
                        mode,
                        fallbackSelector: draft.selector ?? null,
                      });
                      return;
                    }
                    if (mode === 'disabled') {
                      setSelectorBinding({
                        mode,
                        disabledReason: 'Selector intentionally disabled',
                        fallbackSelector: draft.selector ?? null,
                      });
                      return;
                    }
                    setSelectorBinding({
                      mode: 'literal',
                      value: draft.selector ?? null,
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='literal'>Literal/local selector</SelectItem>
                    <SelectItem value='selectorRegistry'>Selector registry</SelectItem>
                    <SelectItem value='disabled'>Disabled selector</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectorBindingMode === 'selectorRegistry' ? (
                <div className='space-y-3'>
                  <div className='grid gap-3 sm:grid-cols-2'>
                    <div className='space-y-1.5'>
                      <Label>Registry profile</Label>
                      <Select
                        value={selectedRegistryProfile}
                        onValueChange={(profile) => {
                          const entry = registrySelectorEntries.find(
                            (candidate) =>
                              candidate.profile === profile &&
                              candidate.key === selectorBinding?.selectorKey
                          );
                          setSelectorBinding({
                            mode: 'selectorRegistry',
                            selectorProfile: profile,
                            ...(entry?.preview[0]
                              ? { fallbackSelector: entry.preview[0] }
                              : {}),
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder='Select profile' />
                        </SelectTrigger>
                        <SelectContent>
                          {registryProfilesForSelect.length === 0 ? (
                            <SelectItem value='default'>default</SelectItem>
                          ) : (
                            registryProfilesForSelect.map((profile) => (
                              <SelectItem key={profile} value={profile}>
                                {profile}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className='space-y-1.5'>
                      <Label>Registry entry</Label>
                      <Select
                        value={selectedRegistryEntry?.id ?? '__manual__'}
                        onValueChange={(entryId) => {
                          const entry = registrySelectorEntries.find(
                            (candidate) => candidate.id === entryId
                          );
                          if (entry) connectSelectorRegistryEntry(entry);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder='Choose selector entry' />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='__manual__'>Manual registry key</SelectItem>
                          {registryEntriesForProfile.map((entry) => (
                            <SelectItem key={entry.id} value={entry.id}>
                              {entry.group} / {entry.key}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className='space-y-1.5'>
                    <Label htmlFor='step-selector-key'>Registry selector key</Label>
                    <Input
                      id='step-selector-key'
                      value={selectorBinding?.selectorKey ?? ''}
                      onChange={(e) => setSelectorBinding({
                        mode: 'selectorRegistry',
                        selectorKey: e.target.value || null,
                      })}
                      placeholder='e.g. tradera.search.submitButton'
                      className='font-mono text-xs'
                    />
                  </div>
                  <div className='space-y-1.5'>
                    <Label htmlFor='step-selector-fallback'>Fallback CSS selector</Label>
                    <Input
                      id='step-selector-fallback'
                      value={selectorFallback}
                      onChange={(e) => {
                        set('selector', e.target.value || null);
                        setSelectorBinding({
                          mode: 'selectorRegistry',
                          fallbackSelector: e.target.value || null,
                        });
                      }}
                      placeholder='Used if registry lookup is unavailable'
                      className='font-mono text-xs'
                    />
                  </div>
                  {selectedRegistryEntry ? (
                    <div className='rounded border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100'>
                      Connected to {selectedRegistryEntry.profile}/{selectedRegistryEntry.key}
                      {selectedRegistryEntry.preview.length > 0 ? (
                        <span className='mt-1 block break-all text-emerald-100/75'>
                          Preview: {selectedRegistryEntry.preview.join(', ')}
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <div className='rounded border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100'>
                      No registry entry is currently matched. Enter a key manually or select one from
                      the loaded registry entries.
                    </div>
                  )}
                  <div className='flex flex-wrap items-center gap-2'>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      className='h-7 text-xs'
                      disabled={!selectedRegistryEntry?.preview[0]}
                      onClick={() => {
                        const selector = selectedRegistryEntry?.preview[0];
                        if (!selector) return;
                        set('selector', selector);
                        setSelectorBinding({
                          mode: 'selectorRegistry',
                          fallbackSelector: selector,
                        });
                      }}
                    >
                      Use registry preview as fallback
                    </Button>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      className='h-7 text-xs'
                      disabled={
                        !selectedRegistryEntry ||
                        !selectorFallback.trim() ||
                        saveRegistryMutation.isPending
                      }
                      loading={saveRegistryMutation.isPending}
                      onClick={() => {
                        handleSaveFallbackAsRegistryOverride().catch(() => undefined);
                      }}
                    >
                      Save fallback as registry override
                    </Button>
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      className='h-7 text-xs'
                      onClick={() => {
                        setSelectorBinding({
                          mode: 'literal',
                          value: selectorFallback || draft.selector || null,
                        });
                      }}
                    >
                      Disconnect to local selector
                    </Button>
                    <a
                      href={resolveSelectorRegistryHref(
                        selectorBinding?.selectorProfile ?? draft.selectorProfile ?? null,
                        selectorBinding?.selectorKey ?? draft.selectorKey ?? null
                      )}
                      className='inline-flex h-7 items-center rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground'
                    >
                      Open selector registry
                    </a>
                  </div>
                  {registrySaveMessage ? (
                    <div className='rounded border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100'>
                      {registrySaveMessage}
                    </div>
                  ) : null}
                  {registrySaveError ? (
                    <div className='rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive'>
                      {registrySaveError}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {selectorBindingMode === 'literal' ? (
                <div className='space-y-1.5'>
                  <Label htmlFor='step-selector'>CSS Selector</Label>
                  <Input
                    id='step-selector'
                    value={draft.selector ?? ''}
                    onChange={(e) => {
                      set('selector', e.target.value || null);
                      setSelectorBinding({
                        mode: 'literal',
                        value: e.target.value || null,
                      });
                    }}
                    placeholder='e.g. button[data-testid="add-to-cart"]'
                    className='font-mono text-xs'
                  />
                </div>
              ) : null}

              {selectorBindingMode === 'disabled' ? (
                <div className='rounded border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100'>
                  This step keeps selector metadata disabled. You can reconnect it to a literal selector
                  or selector registry entry at any time.
                </div>
              ) : null}
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
