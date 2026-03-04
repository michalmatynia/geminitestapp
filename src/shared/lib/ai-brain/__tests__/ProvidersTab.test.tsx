import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { catalogToEntries } from '@/shared/lib/ai-brain/catalog-entries';
import { ProvidersTab } from '@/shared/lib/ai-brain/components/ProvidersTab';
import { useBrain } from '@/shared/lib/ai-brain/context/BrainContext';
import type { AiBrainProviderCatalog } from '@/shared/lib/ai-brain/settings';
import { ToastProvider } from '@/shared/ui/toast';

vi.mock('@/shared/lib/ai-brain/context/BrainContext', () => ({
  useBrain: vi.fn(),
}));

vi.mock('@/shared/lib/ai-brain/components/BrainCatalogTree', () => ({
  BrainCatalogTree: ({
    entries,
    onEdit,
    onChange,
  }: {
    entries: Array<{ pool: string; value: string }>;
    onEdit: (entry: { pool: string; value: string }) => void;
    onChange: (entries: Array<{ pool: string; value: string }>) => void;
  }) => (
    <div>
      <div>Mock Catalog Tree</div>
      {entries.map((entry) => (
        <div key={`${entry.pool}:${entry.value}`}>{entry.value}</div>
      ))}
      <button type='button' onClick={() => onEdit(entries[0]!)} aria-label='mock-edit-first'>
        Edit First
      </button>
      <button
        type='button'
        onClick={() => onChange([...entries].reverse())}
        aria-label='mock-reorder'
      >
        Reorder
      </button>
    </div>
  ),
}));

describe('ProvidersTab', () => {
  const setProviderCatalog = vi.fn();

  const baseCatalog: AiBrainProviderCatalog = {
    entries: [
      { pool: 'modelPresets', value: 'gpt-4o-mini' },
      { pool: 'paidModels', value: 'gpt-4.1' },
    ],
  };

  beforeEach(() => {
    setProviderCatalog.mockReset();
    vi.mocked(useBrain).mockReturnValue({
      openaiApiKey: '',
      setOpenaiApiKey: vi.fn(),
      anthropicApiKey: '',
      setAnthropicApiKey: vi.fn(),
      geminiApiKey: '',
      setGeminiApiKey: vi.fn(),
      providerCatalog: baseCatalog,
      setProviderCatalog,
      ollamaModelsQuery: {
        isFetching: false,
        isLoading: false,
        error: null,
        data: { warning: undefined },
        refetch: vi.fn(),
      },
      liveOllamaModels: [],
      syncPlaywrightPersonas: vi.fn(),
      saving: false,
    } as unknown as ReturnType<typeof useBrain>);
  });

  it('opens edit modal and saves edited entry through setProviderCatalog', async () => {
    render(
      <ToastProvider>
        <ProvidersTab />
      </ToastProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'mock-edit-first' }));

    const itemIdInput = screen.getByDisplayValue('gpt-4o-mini');
    fireEvent.change(itemIdInput, { target: { value: 'gpt-4o' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(setProviderCatalog).toHaveBeenCalled());
    const updater = setProviderCatalog.mock.calls[0]?.[0] as
      | ((prev: AiBrainProviderCatalog) => AiBrainProviderCatalog)
      | undefined;
    expect(typeof updater).toBe('function');

    const nextCatalog = updater!(baseCatalog);
    expect(catalogToEntries(nextCatalog)).toEqual([
      { pool: 'modelPresets', value: 'gpt-4o' },
      { pool: 'paidModels', value: 'gpt-4.1' },
    ]);
  });

  it('applies reordered entries from the tree callback', () => {
    render(
      <ToastProvider>
        <ProvidersTab />
      </ToastProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'mock-reorder' }));

    expect(setProviderCatalog).toHaveBeenCalled();
    const updater = setProviderCatalog.mock.calls[0]?.[0] as
      | ((prev: AiBrainProviderCatalog) => AiBrainProviderCatalog)
      | undefined;
    const nextCatalog = updater!(baseCatalog);
    expect(catalogToEntries(nextCatalog)).toEqual([
      { pool: 'paidModels', value: 'gpt-4.1' },
      { pool: 'modelPresets', value: 'gpt-4o-mini' },
    ]);
  });
});
