import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/ui', async () => {
  const React = await import('react');

  return {
    Badge: ({
      children,
      className,
    }: {
      children: React.ReactNode;
      className?: string;
    }): React.JSX.Element => <div className={className}>{children}</div>,
    StatusToggle: ({
      enabled,
      disabled,
      enabledLabel,
      disabledLabel,
      className,
      onToggle,
    }: {
      enabled: boolean;
      disabled?: boolean;
      enabledLabel?: string;
      disabledLabel?: string;
      className?: string;
      onToggle: (nextEnabled: boolean) => void;
    }): React.JSX.Element => (
      <button
        type='button'
        className={className}
        disabled={disabled}
        aria-pressed={enabled}
        onClick={(): void => onToggle(!enabled)}
      >
        {enabled ? enabledLabel : disabledLabel}
      </button>
    ),
    TreeCaret: ({
      ariaLabel,
      hasChildren,
      isOpen,
      onToggle,
    }: {
      ariaLabel?: string;
      hasChildren?: boolean;
      isOpen?: boolean;
      onToggle?: (event: React.MouseEvent<HTMLButtonElement>) => void;
    }): React.JSX.Element =>
      hasChildren ? (
        <button
          type='button'
          aria-label={ariaLabel}
          aria-expanded={isOpen}
          onClick={(event): void => onToggle?.(event)}
        >
          caret
        </button>
      ) : (
        <span aria-hidden='true'>caret</span>
      ),
    TreeContextMenu: ({ children }: { children: React.ReactNode }): React.JSX.Element => (
      <div>{children}</div>
    ),
    TreeRow: ({
      children,
      className,
      style,
    }: {
      children: React.ReactNode;
      className?: string;
      style?: React.CSSProperties;
    }): React.JSX.Element => (
      <div className={className} style={style}>
        {children}
      </div>
    ),
  };
});

import {
  BrainCatalogNodeItem,
  BrainCatalogNodeItemRuntimeContext,
} from '@/shared/lib/ai-brain/components/BrainCatalogNodeItem';
import {
  BrainRoutingCapabilityNodeItem,
  BrainRoutingCapabilityNodeItemRuntimeContext,
} from '@/shared/lib/ai-brain/components/BrainRoutingCapabilityNodeItem';
import { BrainRoutingFeatureNodeItem } from '@/shared/lib/ai-brain/components/BrainRoutingFeatureNodeItem';
import { ROUTING_GROUPS } from '@/shared/lib/ai-brain/components/brain-routing-master-tree';
import { BRAIN_CAPABILITY_KEYS, getBrainCapabilityDefinition } from '@/shared/lib/ai-brain/settings';

describe('AI Brain tree accessibility', () => {
  it('renders catalog rows with separate select, edit, and remove buttons', () => {
    const entry = { pool: 'default', value: 'Catalog item', label: 'Catalog item' } as const;
    const onEdit = vi.fn();
    const onRemove = vi.fn();
    const select = vi.fn();

    render(
      <BrainCatalogNodeItemRuntimeContext.Provider value={{ onEdit, onRemove, isPending: false }}>
        <BrainCatalogNodeItem
          node={{
            id: 'catalog-1',
            type: 'file',
            kind: 'brain-catalog-entry',
            parentId: null,
            name: 'Catalog item',
            path: 'default/Catalog item',
            sortOrder: 1,
          }}
          entry={entry}
          depth={0}
          isSelected={false}
          isDragging={false}
          select={select}
        />
      </BrainCatalogNodeItemRuntimeContext.Provider>
    );

    const selectButton = screen.getByRole('button', { name: 'Catalog item' });
    const editButton = screen.getByRole('button', { name: 'Edit Catalog item' });
    const removeButton = screen.getByRole('button', { name: 'Remove Catalog item' });

    expect(within(selectButton).queryByRole('button')).not.toBeInTheDocument();

    fireEvent.click(editButton);
    expect(onEdit).toHaveBeenCalledWith(entry);
    expect(select).not.toHaveBeenCalled();

    fireEvent.click(removeButton);
    expect(onRemove).toHaveBeenCalledWith(entry);

    fireEvent.click(selectButton);
    expect(select).toHaveBeenCalledTimes(1);
  });

  it('renders routing feature rows with separate expand and select buttons', () => {
    const group = ROUTING_GROUPS[0];
    const select = vi.fn();
    const toggleExpand = vi.fn();

    render(
      <BrainRoutingFeatureNodeItem
        node={{
          id: `feature:${group.key}`,
          type: 'folder',
          kind: 'brain-routing-feature',
          parentId: null,
          name: group.label,
          path: group.key,
          sortOrder: 1,
        }}
        group={group}
        depth={0}
        hasChildren
        isExpanded={false}
        isSelected={false}
        isDragging={false}
        select={select}
        toggleExpand={toggleExpand}
      />
    );

    const expandButton = screen.getByRole('button', { name: `Expand ${group.label}` });
    const selectButton = screen.getByRole('button', {
      name: new RegExp(`${group.label}.*route`, 'i'),
    });

    expect(within(selectButton).queryByRole('button')).not.toBeInTheDocument();

    fireEvent.click(expandButton);
    expect(toggleExpand).toHaveBeenCalledTimes(1);

    fireEvent.click(selectButton);
    expect(select).toHaveBeenCalledTimes(1);
  });

  it('renders routing capability rows with separate select, toggle, and edit buttons', () => {
    const capability = BRAIN_CAPABILITY_KEYS[0];
    const definition = getBrainCapabilityDefinition(capability);
    const onToggleEnabled = vi.fn();
    const onEdit = vi.fn();
    const select = vi.fn();

    render(
      <BrainRoutingCapabilityNodeItemRuntimeContext.Provider
        value={{ onToggleEnabled, onEdit, isPending: false }}
      >
        <BrainRoutingCapabilityNodeItem
          node={{
            id: `capability:${capability}`,
            type: 'file',
            kind: 'brain-routing-capability',
            parentId: 'feature:root',
            name: definition.label,
            path: capability,
            sortOrder: 1,
          }}
          capability={capability}
          depth={1}
          isSelected={false}
          isDragging={false}
          select={select}
          enabled={true}
          sourceLabel='Global defaults'
        />
      </BrainRoutingCapabilityNodeItemRuntimeContext.Provider>
    );

    const selectButton = screen.getByRole('button', { name: definition.label });
    const toggleButton = screen.getByRole('button', { name: 'ENABLED' });
    const editButton = screen.getByRole('button', { name: `Edit ${definition.label}` });

    expect(within(selectButton).queryByRole('button')).not.toBeInTheDocument();
    expect(toggleButton).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(toggleButton);
    expect(onToggleEnabled).toHaveBeenCalledWith(capability, false);
    expect(select).not.toHaveBeenCalled();

    fireEvent.click(editButton);
    expect(onEdit).toHaveBeenCalledWith(capability);
    expect(select).not.toHaveBeenCalled();

    fireEvent.click(selectButton);
    expect(select).toHaveBeenCalledTimes(1);
  });
});
