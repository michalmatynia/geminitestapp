/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RefreshButton } from '@/shared/ui/RefreshButton';

describe('RefreshButton', () => {
  it('uses an explicit aria-label for icon buttons and blocks clicks while refreshing', () => {
    const onRefresh = vi.fn();
    const { rerender } = render(
      <RefreshButton onRefresh={onRefresh} size='icon' label='Reload analytics' />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Reload analytics' }));
    expect(onRefresh).toHaveBeenCalledTimes(1);

    rerender(<RefreshButton onRefresh={onRefresh} size='icon' isRefreshing label='Reload analytics' />);

    const button = screen.getByRole('button', { name: 'Reload analytics' });
    expect(button).toBeDisabled();
    expect(button.querySelector('svg')).toHaveClass('animate-spin');
  });
});
