'use client';

import React, { useEffect, useMemo, useState } from 'react';

import {
  useDeleteSupplier1688SelectorRegistryEntryMutation,
  useSaveSupplier1688SelectorRegistryEntryMutation,
  useSupplier1688SelectorRegistry,
  useSyncSupplier1688SelectorRegistryMutation,
} from '@/features/integrations/hooks/useSupplier1688SelectorRegistry';
import type { Supplier1688SelectorRegistryEntry } from '@/shared/contracts/integrations/supplier-1688-selector-registry';
import {
  SUPPLIER_1688_PROBE_SCAN_RUNTIME_KEY,
  SUPPLIER_1688_PROBE_SCAN_SELECTOR_PROFILE,
} from '@/shared/lib/browser-execution/supplier-1688-runtime-constants';

const DEFAULT_PROFILE = SUPPLIER_1688_PROBE_SCAN_SELECTOR_PROFILE;

const formatJson = (value: string): string => {
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
};

const collectProfiles = (
  entries: readonly Supplier1688SelectorRegistryEntry[],
  activeProfile: string
): string[] =>
  Array.from(new Set([activeProfile, DEFAULT_PROFILE, ...entries.map((entry) => entry.profile)]))
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));

export default function Supplier1688SelectorRegistryPage(): React.JSX.Element {
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [draftValueJson, setDraftValueJson] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const registryQuery = useSupplier1688SelectorRegistry({ profile });
  const syncMutation = useSyncSupplier1688SelectorRegistryMutation();
  const saveMutation = useSaveSupplier1688SelectorRegistryEntryMutation();
  const deleteMutation = useDeleteSupplier1688SelectorRegistryEntryMutation();

  const entries = registryQuery.data?.entries ?? [];
  const profiles = useMemo(() => collectProfiles(entries, profile), [entries, profile]);
  const selectedEntry = useMemo(
    () => entries.find((entry) => entry.key === selectedKey) ?? entries[0] ?? null,
    [entries, selectedKey]
  );

  useEffect(() => {
    if (!selectedEntry) {
      setSelectedKey(null);
      setDraftValueJson('');
      return;
    }
    setSelectedKey(selectedEntry.key);
    setDraftValueJson(formatJson(selectedEntry.valueJson));
  }, [selectedEntry?.key, selectedEntry?.valueJson]);

  const handleSync = async (): Promise<void> => {
    const response = await syncMutation.mutateAsync({ profile });
    setNotice(response.message);
  };

  const handleSave = async (): Promise<void> => {
    if (!selectedEntry) return;
    const response = await saveMutation.mutateAsync({
      profile,
      key: selectedEntry.key,
      valueJson: draftValueJson,
    });
    setNotice(response.message);
  };

  const handleDelete = async (): Promise<void> => {
    if (!selectedEntry) return;
    const response = await deleteMutation.mutateAsync({
      profile,
      key: selectedEntry.key,
    });
    setNotice(response.message);
  };

  const busy =
    registryQuery.isLoading ||
    syncMutation.isPending ||
    saveMutation.isPending ||
    deleteMutation.isPending;
  const runHistoryHref = `/admin/playwright/step-sequencer/runs?${new URLSearchParams({
    runtimeKey: SUPPLIER_1688_PROBE_SCAN_RUNTIME_KEY,
    selectorProfile: SUPPLIER_1688_PROBE_SCAN_SELECTOR_PROFILE,
  }).toString()}`;

  return (
    <main className='mx-auto flex w-full max-w-7xl flex-col gap-5 px-6 py-6'>
      <header className='space-y-2'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <p className='text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground'>
              Playwright selectors
            </p>
            <h1 className='text-2xl font-semibold tracking-tight'>
              1688 Selector Registry
            </h1>
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <a
              className='rounded-md border border-border px-3 py-2 text-sm hover:bg-muted'
              href={runHistoryHref}
            >
              1688 run history
            </a>
            <a
              className='rounded-md border border-border px-3 py-2 text-sm hover:bg-muted'
              href='/admin/playwright/step-sequencer'
            >
              Step Sequencer
            </a>
          </div>
        </div>
        <p className='max-w-3xl text-sm text-muted-foreground'>
          Seeded 1688 selectors, hints, and extraction patterns can be synced into MongoDB,
          overridden per profile, and connected from modular Playwright Step Sequencer steps.
        </p>
      </header>

      <section className='grid gap-4 rounded-lg border border-border bg-card/40 p-4 lg:grid-cols-[320px_minmax(0,1fr)]'>
        <aside className='space-y-3'>
          <div className='space-y-1'>
            <label className='text-xs font-medium text-muted-foreground' htmlFor='profile'>
              Profile
            </label>
            <div className='flex gap-2'>
              <input
                id='profile'
                className='min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm'
                value={profile}
                onChange={(event) => setProfile(event.target.value || DEFAULT_PROFILE)}
                list='supplier-1688-selector-profiles'
              />
              <button
                type='button'
                className='rounded-md border border-border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50'
                disabled={busy}
                onClick={() => void handleSync()}
              >
                Sync
              </button>
            </div>
            <datalist id='supplier-1688-selector-profiles'>
              {profiles.map((entry) => (
                <option key={entry} value={entry} />
              ))}
            </datalist>
          </div>

          {notice ? (
            <div className='rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-950'>
              {notice}
            </div>
          ) : null}

          {registryQuery.error ? (
            <div className='rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive'>
              {registryQuery.error instanceof Error
                ? registryQuery.error.message
                : 'Failed to load 1688 selector registry.'}
            </div>
          ) : null}

          <div className='max-h-[620px] space-y-2 overflow-auto pr-1'>
            {entries.map((entry) => (
              <button
                key={entry.key}
                type='button'
                className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${
                  selectedEntry?.key === entry.key
                    ? 'border-sky-400 bg-sky-50 text-sky-950'
                    : 'border-border bg-background hover:bg-muted'
                }`}
                onClick={() => {
                  setSelectedKey(entry.key);
                  setNotice(null);
                }}
              >
                <span className='block font-medium'>{entry.key}</span>
                <span className='mt-1 block text-xs text-muted-foreground'>
                  {entry.kind} · {entry.valueType} · {entry.source}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <section className='min-w-0 space-y-4'>
          {selectedEntry ? (
            <>
              <div className='rounded-md border border-border bg-background/70 p-4'>
                <div className='flex flex-wrap items-start justify-between gap-3'>
                  <div>
                    <h2 className='text-lg font-semibold'>{selectedEntry.key}</h2>
                    <p className='mt-1 text-sm text-muted-foreground'>
                      {selectedEntry.description || 'No description.'}
                    </p>
                  </div>
                  <div className='flex flex-wrap gap-2 text-xs'>
                    <span className='rounded-full border border-border px-2 py-1'>
                      {selectedEntry.group}
                    </span>
                    <span className='rounded-full border border-border px-2 py-1'>
                      {selectedEntry.kind}
                    </span>
                    <span className='rounded-full border border-border px-2 py-1'>
                      {selectedEntry.valueType}
                    </span>
                    <span className='rounded-full border border-border px-2 py-1'>
                      {selectedEntry.source}
                    </span>
                  </div>
                </div>
              </div>

              <div className='grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]'>
                <div className='space-y-2'>
                  <label className='text-xs font-medium text-muted-foreground' htmlFor='valueJson'>
                    JSON value
                  </label>
                  <textarea
                    id='valueJson'
                    className='min-h-[420px] w-full rounded-md border border-input bg-background p-3 font-mono text-xs leading-relaxed'
                    value={draftValueJson}
                    onChange={(event) => setDraftValueJson(event.target.value)}
                    spellCheck={false}
                  />
                  <div className='flex flex-wrap gap-2'>
                    <button
                      type='button'
                      className='rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50'
                      disabled={busy}
                      onClick={() => void handleSave()}
                    >
                      Save override
                    </button>
                    <button
                      type='button'
                      className='rounded-md border border-border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50'
                      disabled={busy}
                      onClick={() => setDraftValueJson(formatJson(selectedEntry.valueJson))}
                    >
                      Reset editor
                    </button>
                    <button
                      type='button'
                      className='rounded-md border border-destructive/40 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50'
                      disabled={busy || selectedEntry.source !== 'mongo'}
                      onClick={() => void handleDelete()}
                    >
                      Delete override
                    </button>
                  </div>
                </div>

                <div className='space-y-2'>
                  <h3 className='text-sm font-semibold'>Preview</h3>
                  <div className='rounded-md border border-border bg-background/70 p-3'>
                    {selectedEntry.preview.length > 0 ? (
                      <ul className='space-y-2 text-xs'>
                        {selectedEntry.preview.map((item, index) => (
                          <li key={`${item}-${index}`} className='break-all rounded bg-muted px-2 py-1 font-mono'>
                            {item}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className='text-xs text-muted-foreground'>No preview values.</p>
                    )}
                  </div>
                  <div className='rounded-md border border-border bg-background/70 p-3 text-xs text-muted-foreground'>
                    <p>Items: {selectedEntry.itemCount}</p>
                    <p>Created: {selectedEntry.createdAt}</p>
                    <p>Updated: {selectedEntry.updatedAt}</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className='rounded-md border border-border bg-background/70 p-8 text-center text-sm text-muted-foreground'>
              {registryQuery.isLoading ? 'Loading 1688 selector registry...' : 'No selector entries available.'}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
