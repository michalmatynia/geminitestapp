import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { CategoryMapperTableHeaderActions } from '../CategoryMapperTableHeaderActions';

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
});
