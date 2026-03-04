import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { BrainRoutingTree } from '@/shared/lib/ai-brain/components/BrainRoutingTree';
import {
  defaultBrainAssignment,
  defaultBrainSettings,
  BRAIN_CAPABILITY_KEYS,
} from '@/shared/lib/ai-brain/settings';

const useMasterFolderTreeShellMock = vi.fn();
let latestTreeOptions: unknown = null;

vi.mock('@/features/foldertree/v2', () => ({
  createMasterFolderTreeTransactionAdapter: ({
    onApply,
  }: {
    onApply?: (tx: {
      nextNodes: unknown[];
      previousNodes: unknown[];
      operation: { type: string };
    }) => Promise<void> | void;
  }) => ({
    prepare: async (tx: unknown) => ({ tx, preparedAt: Date.now() }),
    apply: async (tx: {
      nextNodes: unknown[];
      previousNodes: unknown[];
      operation: { type: string };
    }) => {
      await onApply?.(tx);
      return { tx, appliedAt: Date.now() };
    },
    commit: async () => {},
    rollback: async () => {},
  }),
  useMasterFolderTreeShell: (options: unknown) => {
    latestTreeOptions = options;
    return useMasterFolderTreeShellMock(options);
  },
  FolderTreeViewportV2: ({
    controller,
  }: {
    controller: {
      nodes: Array<{ id: string; name: string }>;
    };
  }) => (
    <div>
      {controller.nodes.map((node) => (
        <div key={node.id}>{node.name}</div>
      ))}
    </div>
  ),
}));

describe('BrainRoutingTree', () => {
  it('binds to brain routing master instance and renders grouped route nodes', () => {
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
      },
      viewport: {
        scrollToNodeRef: { current: null },
      },
    }));

    const effectiveCapabilityAssignments = Object.fromEntries(
      BRAIN_CAPABILITY_KEYS.map((capability) => [capability, { ...defaultBrainAssignment }])
    );

    render(
      <BrainRoutingTree
        settings={defaultBrainSettings}
        effectiveCapabilityAssignments={effectiveCapabilityAssignments}
        onToggleEnabled={vi.fn()}
        onEdit={vi.fn()}
      />
    );

    expect(screen.getByText('CMS Builder')).toBeInTheDocument();
    expect(screen.getByText('AI Paths Model')).toBeInTheDocument();

    const options = latestTreeOptions as {
      instance: string;
      nodes: Array<{ type: string; parentId: string | null }>;
      initiallyExpandedNodeIds: string[];
    };
    expect(options.instance).toBe('brain_routing_tree');
    expect(options.initiallyExpandedNodeIds.length).toBeGreaterThan(0);
    expect(options.nodes.some((node) => node.type === 'folder' && node.parentId === null)).toBe(
      true
    );
    expect(options.nodes.some((node) => node.type === 'file' && node.parentId !== null)).toBe(true);
  });
});
