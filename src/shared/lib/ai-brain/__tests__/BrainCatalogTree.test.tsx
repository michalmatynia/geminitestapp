import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/shared/ui/toast';
import { BrainCatalogTree } from '@/shared/lib/ai-brain/components/BrainCatalogTree';
import type { AiBrainCatalogEntry } from '@/shared/lib/ai-brain/settings';

const useMasterFolderTreeShellMock = vi.fn();
let latestTreeOptions: unknown = null;

vi.mock('@/features/foldertree/v2', () => ({
  useMasterFolderTreeShell: (options: unknown) => {
    latestTreeOptions = options;
    return useMasterFolderTreeShellMock(options);
  },
  FolderTreeViewportV2: ({
    controller,
  }: {
    controller: {
      nodes: Array<{ id: string; name: string; sortOrder: number }>;
      reorderNode?: (
        draggedNodeId: string,
        targetNodeId: string,
        position: 'before' | 'after'
      ) => Promise<unknown> | unknown;
    };
  }) => (
    <div>
      {controller.nodes.map((node) => (
        <div key={node.id}>{node.name}</div>
      ))}
      <button
        type='button'
        onClick={() => {
          void controller.reorderNode?.(
            controller.nodes[0]?.id ?? '',
            controller.nodes[controller.nodes.length - 1]?.id ?? '',
            'after'
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

  it('renders a flat list and binds to the brain catalog master instance', () => {
    useMasterFolderTreeShellMock.mockImplementation((options: { nodes: unknown[] }) => ({
      appearance: {
        rootDropUi: {
          label: 'Move here',
          idleClassName: '',
          activeClassName: '',
        },
      },
      controller: {
        nodes: options.nodes,
        reorderNode: vi.fn(),
      },
      viewport: {
        scrollToNodeRef: { current: null },
      },
    }));

    render(
      <ToastProvider>
        <BrainCatalogTree
          entries={entries}
          onChange={vi.fn()}
          onEdit={vi.fn()}
          onRemove={vi.fn()}
        />
      </ToastProvider>
    );

    expect(screen.getByText('gpt-4o-mini')).toBeInTheDocument();
    expect(screen.getByText('gpt-4.1')).toBeInTheDocument();
    expect(screen.getByText('llama3.1')).toBeInTheDocument();

    const options = latestTreeOptions as {
      instance: string;
      nodes: unknown[];
      adapter: unknown;
    };
    expect(options.instance).toBe('brain_catalog_tree');
    expect(options.nodes).toHaveLength(entries.length);
    expect(options.adapter).toBeTruthy();
  });

  it('forwards reorder results to onChange in new order', async () => {
    const onChange = vi.fn();
    useMasterFolderTreeShellMock.mockImplementation(
      (options: {
        nodes: Array<{ id: string; sortOrder: number }>;
        adapter: {
          apply?: (tx: unknown) => Promise<unknown>;
        };
      }) => {
        const controller = {
          nodes: options.nodes,
          reorderNode: vi.fn(async () => {
            const previousNodes = controller.nodes;
            const nextNodes = [...previousNodes]
              .reverse()
              .map((node, index) => ({ ...node, sortOrder: (index + 1) * 1000 }));
            controller.nodes = nextNodes;
            await options.adapter.apply?.({
              id: 'tx_brain_catalog',
              instanceId: 'brain_catalog_tree',
              version: 1,
              createdAt: Date.now(),
              operation: {
                type: 'reorder',
                nodeId: nextNodes[0]?.id ?? '',
                targetId: nextNodes[1]?.id ?? '',
                position: 'before',
              },
              previousNodes,
              nextNodes,
            });
          }),
        };
        return {
          appearance: {
            rootDropUi: {
              label: 'Move here',
              idleClassName: '',
              activeClassName: '',
            },
          },
          controller,
          viewport: {
            scrollToNodeRef: { current: null },
          },
        };
      }
    );

    render(
      <ToastProvider>
        <BrainCatalogTree
          entries={entries}
          onChange={onChange}
          onEdit={vi.fn()}
          onRemove={vi.fn()}
        />
      </ToastProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Simulate Reorder' }));

    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith([entries[2], entries[1], entries[0]])
    );
  });
});
