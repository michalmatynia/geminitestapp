'use client';

/* eslint-disable max-lines */

import { Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { type JSX, useCallback, useState } from 'react';

import { createListQueryV2, createMutationV2 } from '@/shared/lib/query-factories-v2';
import {
  Alert,
  Badge,
  Button,
  Card,
  Input,
  Label,
} from '@/shared/ui/primitives.public';

import type { ScripterRegistryListEntry } from '../scripter-registry';
import type {
  FieldMap,
  ScripterDefinition,
  ScripterExtractionStep,
} from '../types';

import { ScripterDiffPanel } from './ScripterDiffPanel';
import { ScripterDryRunPanel } from './ScripterDryRunPanel';
import { ScripterFieldMapForm } from './ScripterFieldMapForm';
import { ScripterImportFromConnectionPanel } from './ScripterImportFromConnectionPanel';
import { ScripterProbePanel } from './ScripterProbePanel';
import { ScripterStepForm } from './ScripterStepForm';

const blankDefinition = (id = 'new-scripter'): ScripterDefinition => ({
  id,
  version: 1,
  siteHost: 'example.com',
  entryUrl: 'https://example.com/products',
  steps: [
    { id: 'open', kind: 'goto', url: 'https://example.com/products' },
  ],
  fieldMap: { bindings: { title: { path: 'name' } } },
});

const SCRIPTER_REGISTRY_QUERY_KEY = ['playwright', 'scripters', 'registry'] as const;

const apiList = async (): Promise<ScripterRegistryListEntry[]> => {
  const res = await fetch('/api/playwright/scripters');
  if (!res.ok) throw new Error(`List failed (${res.status})`);
  const json = (await res.json()) as { scripters: ScripterRegistryListEntry[] };
  return json.scripters;
};

const apiGet = async (id: string): Promise<ScripterDefinition> => {
  const res = await fetch(`/api/playwright/scripters/${id}`);
  if (!res.ok) throw new Error(`Get failed (${res.status})`);
  return (await res.json()) as ScripterDefinition;
};

const apiSave = async (definition: ScripterDefinition): Promise<ScripterDefinition> => {
  const res = await fetch('/api/playwright/scripters', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(definition),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { errors?: string[] };
    throw new Error(body.errors?.join('; ') ?? `Save failed (${res.status})`);
  }
  return (await res.json()) as ScripterDefinition;
};

const apiDelete = async (id: string): Promise<void> => {
  const res = await fetch(`/api/playwright/scripters/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Delete failed (${res.status})`);
};

const apiCommit = async (id: string): Promise<void> => {
  const res = await fetch(`/api/playwright/scripters/${id}/commit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Commit failed (${res.status})`);
  }
};

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const toPositiveVersion = (value: string): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

const newStep = (kind: ScripterExtractionStep['kind']): ScripterExtractionStep => {
  const id = `${kind}-${Math.random().toString(36).slice(2, 7)}`;
  switch (kind) {
    case 'goto':
      return { id, kind, url: 'https://example.com/products' };
    case 'dismissConsent':
      return { id, kind, selectors: ['#cookie-banner button.accept'] };
    case 'waitFor':
      return { id, kind, state: 'visible' };
    case 'extractJsonLd':
      return { id, kind, filterType: 'Product' };
    case 'extractList':
      return {
        id,
        kind,
        itemSelector: '.product-card',
        fields: { title: { selector: 'h2' } },
      };
    case 'paginate':
      return { id, kind, strategy: 'queryParam', queryParam: 'page', maxPages: 5 };
    default:
      return { id, kind: 'goto', url: 'https://example.com/products' };
  }
};

// eslint-disable-next-line max-lines-per-function, complexity
export function ScripterEditorPageRuntime(): JSX.Element {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [definition, setDefinition] = useState<ScripterDefinition | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const registryQuery = createListQueryV2<
    ScripterRegistryListEntry,
    ScripterRegistryListEntry[],
    typeof SCRIPTER_REGISTRY_QUERY_KEY
  >({
    queryKey: SCRIPTER_REGISTRY_QUERY_KEY,
    queryFn: apiList,
    staleTime: 30_000,
    meta: {
      source: 'playwright.scripters.ScripterEditorPageRuntime.registry',
      operation: 'list',
      resource: 'playwright.scripters.registry',
      domain: 'playwright',
      queryKey: SCRIPTER_REGISTRY_QUERY_KEY,
      tags: ['playwright', 'scripters', 'registry'],
      description: 'Loads Playwright scripter registry entries.',
    },
  });
  const selectMutation = createMutationV2<ScripterDefinition, string>({
    mutationKey: ['playwright', 'scripters', 'select'],
    mutationFn: async (id: string) => await apiGet(id),
    onSuccess: (fetched: ScripterDefinition, id: string): void => {
      setSelectedId(id);
      setDefinition(fetched);
    },
    meta: {
      source: 'playwright.scripters.ScripterEditorPageRuntime.select',
      operation: 'detail',
      resource: 'playwright.scripters.definition',
      domain: 'playwright',
      mutationKey: ['playwright', 'scripters', 'select'],
      tags: ['playwright', 'scripters', 'definition'],
      description: 'Loads a Playwright scripter definition for editing.',
    },
  });
  const saveMutation = createMutationV2<ScripterDefinition, ScripterDefinition>({
    mutationKey: ['playwright', 'scripters', 'save'],
    mutationFn: async (input: ScripterDefinition) => await apiSave(input),
    invalidateKeys: [SCRIPTER_REGISTRY_QUERY_KEY],
    onSuccess: (saved: ScripterDefinition): void => {
      setSelectedId(saved.id);
      setDefinition(saved);
      setInfo(`Saved scripter "${saved.id}" v${saved.version}`);
    },
    meta: {
      source: 'playwright.scripters.ScripterEditorPageRuntime.save',
      operation: 'update',
      resource: 'playwright.scripters.definition',
      domain: 'playwright',
      mutationKey: ['playwright', 'scripters', 'save'],
      tags: ['playwright', 'scripters', 'definition', 'save'],
      description: 'Saves a Playwright scripter definition.',
    },
  });
  const deleteMutation = createMutationV2<void, string>({
    mutationKey: ['playwright', 'scripters', 'delete'],
    mutationFn: async (id: string) => await apiDelete(id),
    invalidateKeys: [SCRIPTER_REGISTRY_QUERY_KEY],
    onSuccess: (_data: void, id: string): void => {
      if (selectedId === id) {
        setSelectedId(null);
        setDefinition(null);
      }
      setInfo(`Deleted scripter "${id}"`);
    },
    meta: {
      source: 'playwright.scripters.ScripterEditorPageRuntime.delete',
      operation: 'delete',
      resource: 'playwright.scripters.definition',
      domain: 'playwright',
      mutationKey: ['playwright', 'scripters', 'delete'],
      tags: ['playwright', 'scripters', 'definition', 'delete'],
      description: 'Deletes a Playwright scripter definition.',
    },
  });
  const commitMutation = createMutationV2<void, string>({
    mutationKey: ['playwright', 'scripters', 'commit'],
    mutationFn: async (id: string) => await apiCommit(id),
    onSuccess: (): void => {
      setInfo('Drafts committed');
    },
    meta: {
      source: 'playwright.scripters.ScripterEditorPageRuntime.commit',
      operation: 'action',
      resource: 'playwright.scripters.commit',
      domain: 'playwright',
      mutationKey: ['playwright', 'scripters', 'commit'],
      tags: ['playwright', 'scripters', 'commit'],
      description: 'Commits Playwright scripter import drafts.',
    },
  });
  const list = registryQuery.data ?? [];
  const activeError =
    registryQuery.error ??
    selectMutation.error ??
    saveMutation.error ??
    deleteMutation.error ??
    commitMutation.error;
  const error = activeError !== null ? toErrorMessage(activeError) : null;
  const busy = selectMutation.isPending || saveMutation.isPending || deleteMutation.isPending;
  const committing = commitMutation.isPending;

  const resetActionState = useCallback((): void => {
    setInfo(null);
    selectMutation.reset();
    saveMutation.reset();
    deleteMutation.reset();
    commitMutation.reset();
  }, [commitMutation, deleteMutation, saveMutation, selectMutation]);

  const select = useCallback(
    (id: string): void => {
      resetActionState();
      selectMutation.mutate(id);
    },
    [resetActionState, selectMutation]
  );

  const createNew = (): void => {
    const draft = blankDefinition(`scripter-${Date.now().toString(36)}`);
    resetActionState();
    setSelectedId(null);
    setDefinition(draft);
  };

  const save = (): void => {
    if (definition === null) return;
    resetActionState();
    saveMutation.mutate(definition);
  };

  const remove = (id: string): void => {
    if (window.confirm(`Delete scripter "${id}"?`) === false) return;
    resetActionState();
    deleteMutation.mutate(id);
  };

  const commit = (): void => {
    if (selectedId === null) return;
    resetActionState();
    commitMutation.mutate(selectedId);
  };

  const updateDefinition = (patch: Partial<ScripterDefinition>): void => {
    if (definition === null) return;
    setDefinition({ ...definition, ...patch });
  };

  const updateStep = (index: number, step: ScripterExtractionStep): void => {
    if (definition === null) return;
    const steps = [...definition.steps];
    steps[index] = step;
    setDefinition({ ...definition, steps });
  };

  const moveStep = (index: number, direction: -1 | 1): void => {
    if (definition === null) return;
    const steps = [...definition.steps];
    const target = index + direction;
    if (target < 0 || target >= steps.length) return;
    const currentStep = steps[index];
    const targetStep = steps[target];
    if (currentStep === undefined || targetStep === undefined) return;
    steps[index] = targetStep;
    steps[target] = currentStep;
    setDefinition({ ...definition, steps });
  };

  const removeStep = (index: number): void => {
    if (definition === null) return;
    setDefinition({ ...definition, steps: definition.steps.filter((_, i) => i !== index) });
  };

  const updateFieldMap = (fieldMap: FieldMap): void => {
    if (definition === null) return;
    setDefinition({ ...definition, fieldMap });
  };

  const insertSelectorIntoFirstExtractList = (selector: string): void => {
    if (definition === null) return;
    const steps = definition.steps.map((step) => {
      const shouldUseSelector =
        step.kind === 'extractList' && step.itemSelector.trim() === '';
      if (shouldUseSelector) {
        return { ...step, itemSelector: selector };
      }
      return step;
    });
    setDefinition({ ...definition, steps });
    setInfo(`Selector copied — paste into the desired step (${selector})`);
  };

  return (
    <div className='grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)]'>
      <aside className='space-y-2'>
        <div className='flex items-center justify-between'>
          <h3 className='text-sm font-semibold'>Scripters</h3>
          <Button type='button' size='sm' variant='outline' onClick={createNew}>
            <Plus className='mr-1 size-4' />
            New
          </Button>
        </div>
        <Card className='divide-y divide-border/40'>
          {list.length === 0 ? (
            <p className='p-3 text-xs text-muted-foreground'>No scripters yet.</p>
          ) : (
            list.map((entry) => (
              <div
                key={entry.id}
                className={`flex items-center justify-between gap-2 px-2 py-1.5 text-sm ${
                  selectedId === entry.id ? 'bg-muted/50' : ''
                }`}
              >
                <button
                  type='button'
                  className='flex-1 truncate text-left'
                  onClick={() => select(entry.id)}
                >
                  <div className='truncate font-medium'>{entry.id}</div>
                  <div className='truncate text-xs text-muted-foreground'>{entry.siteHost}</div>
                </button>
                <Badge variant='outline' className='text-xs'>
                  v{entry.version}
                </Badge>
                <Button
                  type='button'
                  size='icon'
                  variant='ghost'
                  onClick={() => remove(entry.id)}
                  aria-label={`Delete ${entry.id}`}
                >
                  <Trash2 className='size-4 text-destructive' />
                </Button>
              </div>
            ))
          )}
        </Card>
      </aside>

      <main className='space-y-4'>
        {error !== null ? <Alert variant='destructive'>{error}</Alert> : null}
        {info !== null ? <Alert>{info}</Alert> : null}

        <ScripterImportFromConnectionPanel
          onImported={({ definition: imported, warnings }) => {
            setSelectedId(null);
            setDefinition(imported);
            if (warnings.length > 0) setInfo(warnings.join(' '));
            else setInfo(`Imported "${imported.id}" draft — review and save.`);
          }}
        />

        {definition !== null ? (
          <>
            <Card className='space-y-3 p-3'>
              <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                <div className='space-y-1'>
                  <Label>ID</Label>
                  <Input value={definition.id} onChange={(e) => updateDefinition({ id: e.target.value })} />
                </div>
                <div className='space-y-1'>
                  <Label>Version</Label>
                  <Input
                    type='number'
                    value={definition.version}
                    onChange={(e) => updateDefinition({ version: toPositiveVersion(e.target.value) })}
                  />
                </div>
                <div className='space-y-1'>
                  <Label>Site host</Label>
                  <Input
                    value={definition.siteHost}
                    onChange={(e) => updateDefinition({ siteHost: e.target.value })}
                  />
                </div>
                <div className='space-y-1'>
                  <Label>Entry URL</Label>
                  <Input
                    value={definition.entryUrl}
                    onChange={(e) => updateDefinition({ entryUrl: e.target.value })}
                    className='font-mono text-sm'
                  />
                </div>
              </div>
              <div className='flex items-center justify-end gap-2'>
                <Button type='button' size='sm' onClick={save} disabled={busy}>
                  {busy ? (
                    <Loader2 className='mr-2 size-4 animate-spin' />
                  ) : (
                    <Save className='mr-2 size-4' />
                  )}
                  Save scripter
                </Button>
              </div>
            </Card>

            <ScripterProbePanel
              initialUrl={definition.entryUrl}
              onSelectorChosen={insertSelectorIntoFirstExtractList}
            />

            <Card className='space-y-3 p-3'>
              <div className='flex items-center justify-between'>
                <h3 className='text-sm font-semibold'>Steps</h3>
                <div className='flex items-center gap-1 text-xs'>
                  <span className='text-muted-foreground'>Add:</span>
                  {(
                    [
                      'goto',
                      'dismissConsent',
                      'waitFor',
                      'extractJsonLd',
                      'extractList',
                      'paginate',
                    ] as const
                  ).map((kind) => (
                    <Button
                      key={kind}
                      type='button'
                      size='sm'
                      variant='outline'
                      onClick={() =>
                        setDefinition({
                          ...definition,
                          steps: [...definition.steps, newStep(kind)],
                        })
                      }
                    >
                      {kind}
                    </Button>
                  ))}
                </div>
              </div>
              <div className='space-y-3'>
                {definition.steps.map((step, idx) => (
                  <ScripterStepForm
                    key={`${step.id}-${idx}`}
                    step={step}
                    index={idx}
                    total={definition.steps.length}
                    onChange={(next) => updateStep(idx, next)}
                    onMove={moveStep}
                    onRemove={removeStep}
                    onProbeSelector={(selector) => setInfo(`Selector tried: ${selector}`)}
                  />
                ))}
              </div>
            </Card>

            <Card className='space-y-3 p-3'>
              <h3 className='text-sm font-semibold'>Field map</h3>
              <ScripterFieldMapForm
                fieldMap={definition.fieldMap}
                onChange={updateFieldMap}
              />
            </Card>

            {selectedId !== null ? (
              <>
                <ScripterDryRunPanel
                  scripterId={selectedId}
                  onCommit={commit}
                  committing={committing}
                />
                <ScripterDiffPanel scripterId={selectedId} />
              </>
            ) : (
              <Alert>Save the scripter before running a dry-run preview.</Alert>
            )}
          </>
        ) : (
          <Card className='p-6 text-sm text-muted-foreground'>
            Pick a scripter from the left or click <strong>New</strong> to start.
          </Card>
        )}
      </main>
    </div>
  );
}
