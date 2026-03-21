/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { JSX } from 'react';
import { describe, expect, it } from 'vitest';

import { AdminLayoutProvider, useAdminLayoutState } from '@/features/admin/context/AdminLayoutContext';
import { KangurAdminMenuToggle } from '@/features/kangur/admin/KangurAdminMenuToggle';

function MenuHiddenStateProbe(): JSX.Element {
  const { isMenuHidden } = useAdminLayoutState();
  return <div data-testid='menu-hidden-state'>{String(isMenuHidden)}</div>;
}

function Harness({ showToggle = true }: { showToggle?: boolean }): JSX.Element {
  return (
    <AdminLayoutProvider>
      {showToggle ? <KangurAdminMenuToggle /> : null}
      <MenuHiddenStateProbe />
    </AdminLayoutProvider>
  );
}

describe('KangurAdminMenuToggle', () => {
  it('toggles admin menu visibility with eye button', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    expect(screen.getByTestId('menu-hidden-state')).toHaveTextContent('false');

    const hideButton = await screen.findByLabelText('Show canvas only');
    await user.click(hideButton);

    expect(screen.getByLabelText('Show side panels')).toBeInTheDocument();
    expect(screen.getByTestId('menu-hidden-state')).toHaveTextContent('true');
  });

  it('restores menu visibility when the toggle unmounts', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Harness />);

    const hideButton = await screen.findByLabelText('Show canvas only');
    await user.click(hideButton);
    expect(screen.getByTestId('menu-hidden-state')).toHaveTextContent('true');

    rerender(<Harness showToggle={false} />);

    expect(screen.getByTestId('menu-hidden-state')).toHaveTextContent('false');
  });
});
