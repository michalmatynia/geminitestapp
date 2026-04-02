import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useCategoryMapperPageSelection: vi.fn(),
}));

vi.mock('@/features/integrations/context/CategoryMapperPageContext', () => ({
  useCategoryMapperPageSelection: mocks.useCategoryMapperPageSelection,
}));

vi.mock('@/features/integrations/context/CategoryMapperContext', () => ({
  CategoryMapperProvider: ({
    children,
  }: {
    connectionId: string;
    connectionName: string;
    children: React.ReactNode;
  }) => <div data-testid='category-mapper-provider'>{children}</div>,
}));

vi.mock('./CategoryMapperTable', () => ({
  CategoryMapperTable: () => <div data-testid='category-mapper-table'>categories</div>,
}));

vi.mock('./BaseProducerMapper', () => ({
  BaseProducerMapper: () => <div data-testid='base-producer-mapper'>producers</div>,
}));

vi.mock('./BaseTagMapper', () => ({
  BaseTagMapper: () => <div data-testid='base-tag-mapper'>tags</div>,
}));

import { BaseCategoryMapper } from './BaseCategoryMapper';

describe('BaseCategoryMapper', () => {
  it('renders categories, producers, and tags for Base connections', () => {
    mocks.useCategoryMapperPageSelection.mockReturnValue({
      selectedConnection: {
        id: 'base-connection',
        name: 'Base connection',
        integration: {
          slug: 'base-com',
        },
      },
    });

    render(<BaseCategoryMapper />);

    expect(screen.getByTestId('category-mapper-table')).toBeInTheDocument();
    expect(screen.getByTestId('base-producer-mapper')).toBeInTheDocument();
    expect(screen.getByTestId('base-tag-mapper')).toBeInTheDocument();
  });

  it('renders category mapping only for Tradera connections', () => {
    mocks.useCategoryMapperPageSelection.mockReturnValue({
      selectedConnection: {
        id: 'tradera-connection',
        name: 'Tradera connection',
        integration: {
          slug: 'tradera',
        },
      },
    });

    render(<BaseCategoryMapper />);

    expect(screen.getByTestId('category-mapper-table')).toBeInTheDocument();
    expect(screen.queryByTestId('base-producer-mapper')).not.toBeInTheDocument();
    expect(screen.queryByTestId('base-tag-mapper')).not.toBeInTheDocument();
  });
});
