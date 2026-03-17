'use client';

import React from 'react';

import type { MasterFolderTreeController } from '@/shared/contracts/master-folder-tree';
import type { TreeContextMenuItem } from '@/shared/contracts/ui';
import { TreeContextMenu } from '@/shared/ui/tree/TreeContextMenu';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

export type FolderTreeContextMenuItem = {
  /** Unique key for this item. */
  key: string;
  /** Display label. Undefined renders a separator. */
  label?: string | undefined;
  /** Optional icon node shown before the label. */
  icon?: React.ReactNode | undefined;
  /** When true, renders as a visual separator line (label/onSelect are ignored). */
  separator?: boolean | undefined;
  /** When true, the item is shown but not clickable. */
  disabled?: boolean | undefined;
  /** Semantic tone. 'danger' renders in red. */
  tone?: 'default' | 'danger' | undefined;
  /** Called when the user clicks this menu item. */
  onSelect?: ((node: MasterTreeNode, controller: MasterFolderTreeController) => void) | undefined;
};

export type FolderTreeContextMenuProps = {
  /** The node this context menu is anchored to. */
  node: MasterTreeNode;
  /** The tree controller — passed to `item.onSelect` handlers. */
  controller: MasterFolderTreeController;
  /**
   * Menu items to display. When empty or undefined, no context menu is shown
   * and children are rendered as-is.
   */
  items: FolderTreeContextMenuItem[];
  /** The trigger element (typically a tree row). */
  children: React.ReactNode;
};

/**
 * Wraps a tree row with a right-click context menu.
 * Uses the project's existing TreeContextMenu primitive.
 *
 * Consumers pass `contextMenuItems` to FolderTreeViewportV2 and the viewport
 * wraps each rendered row in this component automatically.
 */
export function FolderTreeContextMenu({
  node,
  controller,
  items,
  children,
}: FolderTreeContextMenuProps): React.JSX.Element {
  if (items.length === 0) {
    return <>{children}</>;
  }

  const menuItems: TreeContextMenuItem[] = items.map((item) => ({
    id: item.key,
    label: item.label,
    icon: item.icon,
    separator: item.separator,
    disabled: item.disabled,
    tone: item.tone,
    onSelect: item.onSelect
      ? (): void => {
          item.onSelect!(node, controller);
      }
      : undefined,
  }));

  return <TreeContextMenu items={menuItems}>{children}</TreeContextMenu>;
}
