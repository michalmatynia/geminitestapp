import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { CategoryMapperTableHeaderActions } from '../CategoryMapperTableHeaderActions';

vi.mock('@/shared/ui/forms-and-actions.public', () => ({
  SelectSimple: ({
    value,
    onValueChange,
    options,
    ariaLabel,
    title,
  }: {
    value: string | undefined;
    onValueChange: (value: string) => void;
    options: Array<{ value: string; label: string }>;
    ariaLabel?: string;
    title?: string;
  }) => (
    <select
      aria-label={ariaLabel}
      title={title}
      value={value ?? ''}
      onChange={(event) => onValueChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));

describe('CategoryMapperTableHeaderActions', () => {
  it('renders the auto-match button', () => {
    render(
      <CategoryMapperTableHeaderActions
        onFetch={() => {}}
        isFetching={false}
        onAutoMatchByName={() => {}}
        autoMatchDisabled={false}
        onSave={() => {}}
        isSaving={false}
        pendingCount={0}
      />
    );

    expect(screen.getByRole('button', { name: 'Auto-match Paths & Names' })).toBeInTheDocument();
  });

  it('invokes the auto-match handler when clicked', async () => {
    const user = userEvent.setup();
    const onAutoMatchByName = vi.fn();

    render(
      <CategoryMapperTableHeaderActions
        onFetch={() => {}}
        isFetching={false}
        onAutoMatchByName={onAutoMatchByName}
        autoMatchDisabled={false}
        onSave={() => {}}
        isSaving={false}
        pendingCount={0}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Auto-match Paths & Names' }));

    expect(onAutoMatchByName).toHaveBeenCalledTimes(1);
  });

  it('hides the fetch method selector when only the listing form picker option is available', () => {
    render(
      <CategoryMapperTableHeaderActions
        onFetch={() => {}}
        isFetching={false}
        onAutoMatchByName={() => {}}
        autoMatchDisabled={false}
        onSave={() => {}}
        isSaving={false}
        pendingCount={0}
        categoryFetchMethod='playwright_listing_form'
        onCategoryFetchMethodChange={() => {}}
      />
    );

    expect(screen.queryByLabelText('Category fetch method')).not.toBeInTheDocument();
  });

  it('renders the fetch method selector when callers supply multiple options', () => {
    render(
      <CategoryMapperTableHeaderActions
        onFetch={() => {}}
        isFetching={false}
        onAutoMatchByName={() => {}}
        autoMatchDisabled={false}
        onSave={() => {}}
        isSaving={false}
        pendingCount={0}
        categoryFetchMethod='playwright_listing_form'
        onCategoryFetchMethodChange={() => {}}
        categoryFetchMethodOptions={[
          { value: 'playwright_listing_form', label: 'Listing form picker' },
          { value: 'playwright', label: 'Public taxonomy pages' },
        ]}
      />
    );

    const optionLabels = screen
      .getAllByRole('option')
      .map((option) => option.textContent?.trim() ?? '');

    expect(optionLabels).toEqual([
      'Listing form picker',
      'Public taxonomy pages',
    ]);
  });
});
