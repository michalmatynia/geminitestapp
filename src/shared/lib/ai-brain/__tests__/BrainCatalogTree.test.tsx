import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/shared/ui/toast';
import { BrainCatalogTree } from '@/shared/lib/ai-brain/components/BrainCatalogTree';
import type { AiBrainCatalogEntry } from '@/shared/lib/ai-brain/settings';

const useFolderTreeInstanceV2Mock = vi.fn();
const applyInternalMasterTreeDropMock = vi.fn();
let latestTreeOptions: unknown = null;

vi.mock('@/features/foldertree/v2', () => ({
  useFolderTreeInstanceV2: (options: unknown) => {
    latestTreeOptions = options;
    return useFolderTreeInstanceV2Mock(options);
  },
  applyInternalMasterTreeDrop: (input: unknown) => applyInternalMasterTreeDropMock(input),
  MasterFolderTreeRuntimeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  FolderTreeViewportV2: ({
    controller,
    onNodeDrop,
  }: {
    controller: {
      nodes: Array<{ id: string; name: string; sortOrder: number }>;
    };
    onNodeDrop?: (
      input: {
        draggedNodeId: string;
        targetId: string | null;
        position: 'inside' | 'before' | 'after';
        rootDropZone?: 'top' | 'bottom';
      },
      controller: {
        nodes: Array<{ id: string; name: string; sortOrder: number }>;
      }
    ) => Promise<void> | void;
  }) => (
    <div>
      {controller.nodes.map((node) => (
        <div key={node.id}>{node.name}</div>
      ))}
      <button
        type='button'
        onClick={() => {
          const reordered = [...controller.nodes]
            .reverse()
            .map((node, index) => ({ ...node, sortOrder: (index + 1) * 1000 }));
          controller.nodes = reordered;
          void onNodeDrop?.(
            {
              draggedNodeId: reordered[0]?.id ?? '',
              targetId: reordered[1]?.id ?? null,
              position: 'before',
            },
            controller
          );
        }}
      >
        Simulate Reorder
      </button>
    </div>
  ),
}));

describe('BrainCatalogTree', () => {
  const entries: AiBrainCatalogEntry[] = [
    { pool: 'modelPresets', value: 'gpt-4o-mini' },
    { pool: 'paidModels', value: 'gpt-4.1' },
    { pool: 'ollamaModels', value: 'llama3.1' },
  ];

  it('renders a flat list and configures profile without nesting', () => {
    useFolderTreeInstanceV2Mock.mockImplementation((options: { initialNodes: unknown[] }) => ({
      nodes: options.initialNodes,
      replaceNodes: vi.fn(),
    }));

    render(
      <ToastProvider>
        <BrainCatalogTree entries={entries} onChange={vi.fn()} onEdit={vi.fn()} onRemove={vi.fn()} />
      </ToastProvider>
    );

    expect(screen.getByText('gpt-4o-mini')).toBeInTheDocument();
    expect(screen.getByText('gpt-4.1')).toBeInTheDocument();
    expect(screen.getByText('llama3.1')).toBeInTheDocument();

    const options = latestTreeOptions as {
      profile: {
        nesting: {
          defaultAllow: boolean;
          rules: Array<{ targetType: string; childType: string; allow: boolean }>;
        };
      };
    };
    expect(options.profile.nesting.defaultAllow).toBe(false);
    expect(options.profile.nesting.rules).toEqual([
      {
        childType: 'file',
        childKinds: ['brain-catalog-entry'],
        targetType: 'root',
        targetKinds: ['*'],
        allow: true,
      },
    ]);
  });

  it('forwards reorder results to onChange in new order', async () => {
    const onChange = vi.fn();
    useFolderTreeInstanceV2Mock.mockImplementation((options: { initialNodes: unknown[] }) => ({
      nodes: options.initialNodes,
      replaceNodes: vi.fn(),
    }));
    applyInternalMasterTreeDropMock.mockResolvedValue(undefined);

    render(
      <ToastProvider>
        <BrainCatalogTree entries={entries} onChange={onChange} onEdit={vi.fn()} onRemove={vi.fn()} />
      </ToastProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Simulate Reorder' }));

    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith([
        entries[2],
        entries[1],
        entries[0],
      ])
    );
  });
});
