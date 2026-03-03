import { describe, expect, it } from 'vitest';

import type { AdminMenuCustomNode, AdminNavNodeEntry, AdminNavItem } from '@/shared/contracts/admin';
import { moveMasterTreeNode, reorderMasterTreeNode } from '@/shared/utils/master-folder-tree-engine';

import {
  buildAdminMenuLayoutMasterNodes,
  createAdminMenuLayoutFallbackMap,
  rebuildAdminMenuCustomNavFromMasterNodes,
  readAdminMenuLayoutMetadata,
} from '../admin-menu-layout-master-tree';

const toLibraryEntry = (item: AdminNavItem, parents: string[] = []): AdminNavNodeEntry[] => {
  const entries: AdminNavNodeEntry[] = [
    {
      id: item.id,
      label: item.label,
      ...(item.href ? { href: item.href } : {}),
      parents,
      item,
    },
  ];

  (item.children ?? []).forEach((child) => {
    entries.push(...toLibraryEntry(child, [...parents, item.label]));
  });

  return entries;
};

const libraryItemMap = (() => {
  const entries = toLibraryEntry({
    id: 'system',
    label: 'System',
    href: '/admin/settings',
    children: [
      {
        id: 'system/settings',
        label: 'Settings',
        href: '/admin/settings',
        children: [
          {
            id: 'system/settings/menu',
            label: 'Admin Menu',
            href: '/admin/settings/menu',
          },
        ],
      },
    ],
  });
  return new Map(entries.map((entry) => [entry.id, entry]));
})();

const sampleCustomNav: AdminMenuCustomNode[] = [
  {
    id: 'system',
    label: 'System',
    href: '/admin/settings',
    children: [
      {
        id: 'system/settings/menu',
        label: 'Admin Menu',
        href: '/admin/settings/menu',
      },
    ],
  },
  {
    id: 'custom-root',
    label: 'Custom Root',
    children: [
      {
        id: 'custom-link',
        label: 'Custom Link',
        href: '/admin/custom-link',
      },
    ],
  },
];

describe('admin-menu-layout-master-tree', () => {
  it('builds canonical master nodes with folder/folder shape and metadata', () => {
    const nodes = buildAdminMenuLayoutMasterNodes(sampleCustomNav, libraryItemMap);
    expect(nodes).toHaveLength(4);

    nodes.forEach((node) => {
      expect(node.type).toBe('folder');
      expect(node.kind).toBe('folder');
    });

    const systemNode = nodes.find((node) => node.id === 'system');
    expect(systemNode).toBeDefined();
    expect(systemNode?.parentId).toBeNull();
    expect(systemNode?.path).toBe('system');

    const systemMeta = systemNode ? readAdminMenuLayoutMetadata(systemNode) : null;
    expect(systemMeta).toEqual({
      nodeId: 'system',
      isBuiltIn: true,
      semantic: 'link',
      href: '/admin/settings',
    });

    const customRoot = nodes.find((node) => node.id === 'custom-root');
    const customMeta = customRoot ? readAdminMenuLayoutMetadata(customRoot) : null;
    expect(customMeta?.isBuiltIn).toBe(false);
    expect(customMeta?.semantic).toBe('group');
    expect(customMeta?.href).toBeNull();
  });

  it('roundtrips custom nav while preserving hierarchy and href semantics', () => {
    const nodes = buildAdminMenuLayoutMasterNodes(sampleCustomNav, libraryItemMap);
    const fallback = createAdminMenuLayoutFallbackMap(nodes);
    const rebuilt = rebuildAdminMenuCustomNavFromMasterNodes(nodes, fallback);

    expect(rebuilt).toEqual(sampleCustomNav);
  });

  it('rebuilds expected custom nav after move + reorder operations', () => {
    const initialNodes = buildAdminMenuLayoutMasterNodes(sampleCustomNav, libraryItemMap);
    const fallback = createAdminMenuLayoutFallbackMap(initialNodes);

    const movedResult = moveMasterTreeNode({
      nodes: initialNodes,
      nodeId: 'custom-link',
      targetParentId: null,
    });
    expect(movedResult.ok).toBe(true);
    if (!movedResult.ok) {
      throw new Error('Expected move operation to succeed.');
    }

    const reorderedResult = reorderMasterTreeNode({
      nodes: movedResult.nodes,
      nodeId: 'custom-link',
      targetId: 'system',
      position: 'before',
    });
    expect(reorderedResult.ok).toBe(true);
    if (!reorderedResult.ok) {
      throw new Error('Expected reorder operation to succeed.');
    }

    const rebuilt = rebuildAdminMenuCustomNavFromMasterNodes(reorderedResult.nodes, fallback);

    expect(rebuilt.map((entry) => entry.id)).toEqual(['custom-link', 'system', 'custom-root']);
    expect(rebuilt.find((entry) => entry.id === 'custom-link')?.href).toBe('/admin/custom-link');
    expect(rebuilt.find((entry) => entry.id === 'custom-root')?.children).toBeUndefined();
  });

  it('keeps link/group semantics after reorder when metadata provides semantic/href', () => {
    const initialNodes = buildAdminMenuLayoutMasterNodes(sampleCustomNav, libraryItemMap);
    const fallback = createAdminMenuLayoutFallbackMap(initialNodes);

    const customRoot = initialNodes.find((node) => node.id === 'custom-root');
    expect(customRoot).toBeDefined();

    const promotedNodes = initialNodes.map((node) => {
      if (node.id !== 'custom-link') return node;
      return {
        ...node,
        parentId: null,
        sortOrder: 0,
      };
    });

    const rebuilt = rebuildAdminMenuCustomNavFromMasterNodes(promotedNodes, fallback);
    const promoted = rebuilt.find((entry) => entry.id === 'custom-link');

    expect(promoted?.href).toBe('/admin/custom-link');
    expect(promoted?.children).toBeUndefined();
  });
});
