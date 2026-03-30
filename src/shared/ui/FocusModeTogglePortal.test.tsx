/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { FocusModeTogglePortal } from './FocusModeTogglePortal';

describe('FocusModeTogglePortal', () => {
  it('mounts into the document body and toggles focus mode', async () => {
    const user = userEvent.setup();
    const onToggleFocusMode = vi.fn();

    render(
      <FocusModeTogglePortal
        isFocusMode={false}
        onToggleFocusMode={onToggleFocusMode}
      />
    );

    const button = await screen.findByRole('button', { name: 'Show canvas only' });
    expect(button).toHaveAttribute('aria-pressed', 'false');

    await user.click(button);

    expect(onToggleFocusMode).toHaveBeenCalledTimes(1);
  });
});
