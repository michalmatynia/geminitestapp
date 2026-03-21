import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MasterTreeSettingsButton } from '@/shared/ui/MasterTreeSettingsButton';

describe('MasterTreeSettingsButton', () => {
  it('delegates navigation to the custom open handler when provided', () => {
    const onOpen = vi.fn();

    render(<MasterTreeSettingsButton instance='notes' onOpen={onOpen} />);

    fireEvent.click(screen.getByRole('button', { name: 'Open master tree instance settings' }));

    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledWith('notes');
  });
});

