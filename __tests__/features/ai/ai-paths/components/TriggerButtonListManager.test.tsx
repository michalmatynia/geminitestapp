import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import {
  TriggerButtonListManager,
  type AiTriggerButtonRecord,
} from '@/features/ai/ai-paths/components/TriggerButtonListManager';

const buildRecord = (id: string, name: string, sortIndex: number): AiTriggerButtonRecord => ({
  id,
  name,
  iconId: null,
  locations: ['product_modal'],
  mode: 'click',
  display: {
    label: name,
    showLabel: true,
  },
  isActive: true,
  enabled: true,
  sortIndex,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const createDataTransfer = (): DataTransfer => {
  const store = new Map<string, string>();
  return {
    dropEffect: 'move',
    effectAllowed: 'move',
    setData: vi.fn((type: string, value: string) => {
      store.set(type, value);
    }),
    getData: vi.fn((type: string) => store.get(type) ?? ''),
    clearData: vi.fn(),
    setDragImage: vi.fn(),
  } as unknown as DataTransfer;
};

const createTestQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const renderWithQueryClient = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

describe('TriggerButtonListManager', () => {
  const baseData: AiTriggerButtonRecord[] = [
    buildRecord('btn-a', 'Alpha', 0),
    buildRecord('btn-b', 'Beta', 1),
    buildRecord('btn-c', 'Gamma', 2),
  ];

  it('reorders when dragging from handle and dropping anywhere on target row', () => {
    const onOrderChange = vi.fn();
    const { container } = renderWithQueryClient(
      <TriggerButtonListManager
        data={baseData}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onOrderChange={onOrderChange}
        onToggleVisibility={vi.fn()}
        isLoading={false}
      />
    );

    const handle = screen.getByTestId('trigger-reorder-handle-btn-a');
    const targetRow = container.querySelector('tr[data-row-id="btn-c"]');
    if (!targetRow) throw new Error('Target row btn-c not found');
    const dataTransfer = createDataTransfer();

    fireEvent.pointerDown(handle);
    fireEvent.dragStart(handle, { dataTransfer });
    fireEvent.dragOver(targetRow, { dataTransfer });
    fireEvent.drop(targetRow, { dataTransfer });
    fireEvent.dragEnd(handle, { dataTransfer });

    expect(onOrderChange).toHaveBeenCalledWith(['btn-b', 'btn-c', 'btn-a']);
  });

  it('does not reorder unless drag is armed from the handle', () => {
    const onOrderChange = vi.fn();
    const { container } = renderWithQueryClient(
      <TriggerButtonListManager
        data={baseData}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onOrderChange={onOrderChange}
        onToggleVisibility={vi.fn()}
        isLoading={false}
      />
    );

    const handle = screen.getByTestId('trigger-reorder-handle-btn-a');
    const targetRow = container.querySelector('tr[data-row-id="btn-c"]');
    if (!targetRow) throw new Error('Target row btn-c not found');
    const dataTransfer = createDataTransfer();

    fireEvent.dragStart(handle, { dataTransfer });
    fireEvent.dragOver(targetRow, { dataTransfer });
    fireEvent.drop(targetRow, { dataTransfer });
    fireEvent.dragEnd(handle, { dataTransfer });

    expect(onOrderChange).not.toHaveBeenCalled();
  });

  it('does not render arrow reorder buttons', () => {
    renderWithQueryClient(
      <TriggerButtonListManager
        data={baseData}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onOrderChange={vi.fn()}
        onToggleVisibility={vi.fn()}
        isLoading={false}
      />
    );

    expect(screen.queryByTitle('Move up')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Move down')).not.toBeInTheDocument();
  });
});
