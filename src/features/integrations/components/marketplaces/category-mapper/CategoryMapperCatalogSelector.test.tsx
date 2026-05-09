import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CategoryMapperCatalogSelector } from './CategoryMapperCatalogSelector';

const mocks = vi.hoisted(() => ({
  setSelectedCatalogId: vi.fn<(value: string) => void>(),
  useCategoryMapperConfig: vi.fn(),
  useCategoryMapperData: vi.fn(),
}));

vi.mock('@/features/integrations/context/CategoryMapperContext', () => ({
  useCategoryMapperConfig: mocks.useCategoryMapperConfig,
  useCategoryMapperData: mocks.useCategoryMapperData,
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  Label: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <label className={className}>{children}</label>,
}));

vi.mock('@/shared/ui/forms-and-actions.public', () => ({
  SelectSimple: ({
    value,
    onValueChange,
    options,
    placeholder,
    disabled,
    ariaLabel,
    title,
  }: {
    value: string | undefined;
    onValueChange: (value: string) => void;
    options: Array<{ value: string; label: string }>;
    placeholder?: string;
    disabled?: boolean;
    ariaLabel?: string;
    title?: string;
  }) => (
    <select
      aria-label={ariaLabel}
      title={title}
      value={value ?? ''}
      disabled={disabled}
      onChange={(event) => onValueChange(event.target.value)}
    >
      <option value=''>{placeholder ?? 'Select catalog'}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));

describe('CategoryMapperCatalogSelector', () => {
  beforeEach(() => {
    mocks.setSelectedCatalogId.mockReset();
    mocks.useCategoryMapperConfig.mockReturnValue({
      integrationSlug: 'base',
    });
    mocks.useCategoryMapperData.mockReturnValue({
      selectedCatalogId: 'catalog-2',
      setSelectedCatalogId: mocks.setSelectedCatalogId,
      catalogsLoading: false,
      catalogs: [
        { id: 'catalog-1', name: 'Main Catalog' },
        { id: 'catalog-2', name: 'Mentio' },
      ],
      internalCategories: [{ id: 'internal-1' }, { id: 'internal-2' }],
    });
  });

  it('renders the catalog as a standard dropdown with the current selection', () => {
    render(<CategoryMapperCatalogSelector />);

    expect(screen.getByRole('combobox', { name: 'Target catalog' })).toHaveValue('catalog-2');
    expect(screen.getByText('2 internal categories')).toBeInTheDocument();
  });

  it('updates the selected catalog when the dropdown value changes', async () => {
    const user = userEvent.setup();

    render(<CategoryMapperCatalogSelector />);

    await user.selectOptions(screen.getByRole('combobox', { name: 'Target catalog' }), 'catalog-1');

    expect(mocks.setSelectedCatalogId).toHaveBeenCalledWith('catalog-1');
  });

  it('shows the global category scope for Tradera connections', () => {
    mocks.useCategoryMapperConfig.mockReturnValue({
      integrationSlug: 'tradera',
    });

    render(<CategoryMapperCatalogSelector />);

    expect(screen.queryByRole('combobox', { name: 'Target catalog' })).not.toBeInTheDocument();
    expect(screen.getByText('All internal categories')).toBeInTheDocument();
  });
});
