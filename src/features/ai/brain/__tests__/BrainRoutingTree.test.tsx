import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { BrainRoutingTree } from '../components/BrainRoutingTree';
import {
  defaultBrainAssignment,
  defaultBrainSettings,
  BRAIN_FEATURE_KEYS,
  BRAIN_CAPABILITY_KEYS,
} from '@/shared/lib/ai-brain/settings';

const useMasterFolderTreeShellMock = vi.fn();
let latestTreeOptions: unknown = null;

vi.mock('@/shared/lib/foldertree/v2', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/lib/foldertree/v2')>();
  return {
    ...actual,
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
      renderNode,
    }: {
      controller: {
        nodes: Array<{ id: string; name: string; parentId: string | null }>;
      };
      renderNode: (input: {
        node: { id: string; name: string; parentId: string | null };
        depth: number;
        hasChildren: boolean;
        isExpanded: boolean;
        isSelected: boolean;
        isDragging: boolean;
        select: () => void;
        toggleExpand: () => void;
      }) => React.ReactNode;
    }) => (
      <div>
        {controller.nodes.map((node) => (
          <div key={node.id}>
            {renderNode({
              node,
              depth: node.parentId ? 1 : 0,
              hasChildren: controller.nodes.some((candidate) => candidate.parentId === node.id),
              isExpanded: true,
              isSelected: false,
              isDragging: false,
              select: () => {},
              toggleExpand: () => {},
            })}
          </div>
        ))}
      </div>
    ),
  };
});

describe('BrainRoutingTree', () => {
  it('binds to brain routing master instance and renders grouped route nodes', () => {
    useMasterFolderTreeShellMock.mockImplementation((options: { nodes: unknown[] }) => ({
      capabilities: {
        multiSelect: { enabled: false },
        search: { enabled: true },
      },
      search: {
        state: { isActive: false, matchNodeIds: new Set() },
        resultCountLabel: '',
        placeholder: 'Search...',
      },
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
    const effectiveAssignments = Object.fromEntries(
      BRAIN_FEATURE_KEYS.map((feature) => [feature, { ...defaultBrainAssignment }])
    );

    render(
      <BrainRoutingTree
        settings={defaultBrainSettings}
        effectiveAssignments={effectiveAssignments}
        effectiveCapabilityAssignments={effectiveCapabilityAssignments}
        onToggleFeatureEnabled={vi.fn()}
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

  it('shows capability nodes as feature-disabled when their parent feature is off', () => {
    useMasterFolderTreeShellMock.mockImplementation((options: { nodes: unknown[] }) => ({
      capabilities: {
        multiSelect: { enabled: false },
        search: { enabled: true },
      },
      search: {
        state: { isActive: false, matchNodeIds: new Set() },
        resultCountLabel: '',
        placeholder: 'Search...',
      },
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

    const effectiveAssignments = Object.fromEntries(
      BRAIN_FEATURE_KEYS.map((feature) => [
        feature,
        {
          ...defaultBrainAssignment,
          enabled: feature === 'cms_builder' ? false : defaultBrainAssignment.enabled,
        },
      ])
    );
    const effectiveCapabilityAssignments = Object.fromEntries(
      BRAIN_CAPABILITY_KEYS.map((capability) => [capability, { ...defaultBrainAssignment }])
    );

    render(
      <BrainRoutingTree
        settings={defaultBrainSettings}
        effectiveAssignments={effectiveAssignments}
        effectiveCapabilityAssignments={effectiveCapabilityAssignments}
        onToggleFeatureEnabled={vi.fn()}
        onToggleEnabled={vi.fn()}
        onEdit={vi.fn()}
      />
    );

    expect(screen.getByText('Feature disabled')).toBeInTheDocument();
  });
});
