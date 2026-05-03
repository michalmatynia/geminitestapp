'use client';

import { Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { type JSX, useCallback, useEffect, useState } from 'react';

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

const apiList = async (): Promise<ScripterRegistryListEntry[]> => {
  const res = await fetch('/api/playwright/scripters');
  if (!res.ok) throw new Error(`List failed (${res.status})`);
  const json = (await res.json()) as { scripters: ScripterRegistryListEntry[] };
  return json.scripters ?? [];
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
  }
};

export function ScripterEditorPageRuntime(): JSX.Element {
  const [list, setList] = useState<ScripterRegistryListEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [definition, setDefinition] = useState<ScripterDefinition | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [committing, setCommitting] = useState(false);

  const refreshList = useCallback(async () => {
    try {
      setList(await apiList());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    void refreshList();
  }, [refreshList]);

  const select = useCallback(async (id: string) => {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const fetched = await apiGet(id);
      setSelectedId(id);
      setDefinition(fetched);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }, []);

  const createNew = (): void => {
    const draft = blankDefinition(`scripter-${Date.now().toString(36)}`);
    setSelectedId(null);
    setDefinition(draft);
  };

  const save = async (): Promise<void> => {
    if (!definition) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const saved = await apiSave(definition);
      setSelectedId(saved.id);
      setInfo(`Saved scripter "${saved.id}" v${saved.version}`);
      await refreshList();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string): Promise<void> => {
    if (!window.confirm(`Delete scripter "${id}"?`)) return;
    setBusy(true);
    try {
      await apiDelete(id);
      if (selectedId === id) {
        setSelectedId(null);
        setDefinition(null);
      }
      await refreshList();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const commit = async (): Promise<void> => {
    if (!selectedId) return;
    setCommitting(true);
    setError(null);
    setInfo(null);
    try {
      await apiCommit(selectedId);
      setInfo('Drafts committed');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCommitting(false);
    }
  };

  const updateDefinition = (patch: Partial<ScripterDefinition>): void => {
    if (!definition) return;
    setDefinition({ ...definition, ...patch });
  };

  const updateStep = (index: number, step: ScripterExtractionStep): void => {
    if (!definition) return;
    const steps = [...definition.steps];
    steps[index] = step;
    setDefinition({ ...definition, steps });
  };

  const moveStep = (index: number, direction: -1 | 1): void => {
    if (!definition) return;
    const steps = [...definition.steps];
    const target = index + direction;
    if (target < 0 || target >= steps.length) return;
    [steps[index], steps[target]] = [steps[target]!, steps[index]!];
    setDefinition({ ...definition, steps });
  };

  const removeStep = (index: number): void => {
    if (!definition) return;
    setDefinition({ ...definition, steps: definition.steps.filter((_, i) => i !== index) });
  };

  const updateFieldMap = (fieldMap: FieldMap): void => {
    if (!definition) return;
    setDefinition({ ...definition, fieldMap });
  };

  const insertSelectorIntoFirstExtractList = (selector: string): void => {
    if (!definition) return;
    const steps = definition.steps.map((step) => {
      if (step.kind === 'extractList' && !step.itemSelector) {
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
                  onClick={() => void select(entry.id)}
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
                  onClick={() => void remove(entry.id)}
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
        {error ? <Alert variant='destructive'>{error}</Alert> : null}
        {info ? <Alert>{info}</Alert> : null}

        <ScripterImportFromConnectionPanel
          onImported={({ definition: imported, warnings }) => {
            setSelectedId(null);
            setDefinition(imported);
            if (warnings.length > 0) setInfo(warnings.join(' '));
            else setInfo(`Imported "${imported.id}" draft — review and save.`);
          }}
        />

        {definition ? (
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
                    onChange={(e) => updateDefinition({ version: Number(e.target.value) || 1 })}
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

            {selectedId ? (
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
