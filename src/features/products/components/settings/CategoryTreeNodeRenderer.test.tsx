import { GripVertical } from 'lucide-react';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ProductCategoryWithChildren } from '@/shared/contracts/products/categories';
import type { FolderTreeViewportRenderNodeInput } from '@/shared/lib/foldertree/public';
import { CategoryTreeNodeRuntimeProvider } from './CategoryTreeNodeRuntimeContext';
import { CategoryTreeNodeRenderer } from './CategoryTreeNodeRenderer';

const createCategory = (
  overrides?: Partial<ProductCategoryWithChildren>
): ProductCategoryWithChildren => ({
  id: 'cat-1',
  name: 'Anime Pins',
  name_en: 'Anime Pins',
  name_pl: 'Przypinki Anime',
  name_de: null,
  color: null,
  parentId: null,
  catalogId: 'catalog-1',
  sortIndex: 0,
  createdAt: '2026-04-11T00:00:00.000Z',
  updatedAt: '2026-04-11T00:00:00.000Z',
  children: [],
  ...overrides,
});

const createNodeProps = (): FolderTreeViewportRenderNodeInput => ({
  node: {
    id: 'category:cat-1',
    type: 'folder',
    kind: 'category',
    parentId: null,
    name: 'Anime Pins',
    path: 'Anime Pins',
    sortOrder: 0,
    children: [],
  },
  depth: 0,
  hasChildren: false,
  isExpanded: false,
  isSelected: false,
  isMultiSelected: false,
  isRenaming: false,
  isDragging: false,
  isDropTarget: false,
  dropPosition: null,
  nodeStatus: null,
  isSearchMatch: false,
  select: vi.fn(),
  toggleExpand: vi.fn(),
  startRename: vi.fn(),
});

const renderRenderer = (category: ProductCategoryWithChildren): void => {
  const nodeProps = createNodeProps();
  render(
    <CategoryTreeNodeRuntimeProvider
      value={{
        categoryById: new Map([[category.id, category]]),
        placeholderClasses: {
          rootIdle: '',
          rootActive: '',
          lineIdle: '',
          lineActive: '',
          badgeIdle: '',
          badgeActive: '',
        },
        DragHandleIcon: GripVertical,
        onCreateCategory: vi.fn(),
        onEditCategory: vi.fn(),
        onDeleteCategory: vi.fn(),
      }}
    >
      <CategoryTreeNodeRenderer {...nodeProps} />
    </CategoryTreeNodeRuntimeProvider>
  );
};

describe('CategoryTreeNodeRenderer', () => {
  it('renders translated category subtext when a distinct translation exists', () => {
    renderRenderer(createCategory());

    expect(screen.getByText('Anime Pins')).toBeInTheDocument();
    expect(screen.getByText('Przypinki Anime')).toBeInTheDocument();
  });

  it('hides translated subtext when the translated label is missing or identical', () => {
    renderRenderer(
      createCategory({
        name: 'Breloki',
        name_en: 'Breloki',
        name_pl: 'Breloki',
        name_de: null,
      })
    );

    expect(screen.getByText('Breloki')).toBeInTheDocument();
    expect(screen.queryByText('Przypinki Anime')).not.toBeInTheDocument();
  });

  it('falls back to another distinct localized label when Polish translation is absent', () => {
    renderRenderer(
      createCategory({
        name: 'Pins',
        name_en: 'Pins',
        name_pl: null,
        name_de: 'Anstecker',
      })
    );

    expect(screen.getByText('Pins')).toBeInTheDocument();
    expect(screen.getByText('Anstecker')).toBeInTheDocument();
  });
});
