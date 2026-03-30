import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BrainSettingsHeader } from '../components/BrainSettingsHeader';
import { useBrain } from '../context/BrainContext';

vi.mock('../context/BrainContext', () => ({
  useBrain: vi.fn(),
}));

vi.mock('@/shared/ui', () => ({
  Button: ({
    children,
    disabled,
    onClick,
    variant,
    size,
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
    variant?: string;
    size?: string;
  }) => (
    <button
      type='button'
      data-variant={variant}
      data-size={size}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  ),
  SectionHeader: ({
    eyebrow,
    title,
    description,
    actions,
  }: {
    eyebrow: string;
    title: string;
    description: string;
    actions?: React.ReactNode;
  }) => (
    <section>
      <div>{eyebrow}</div>
      <h1>{title}</h1>
      <p>{description}</p>
      {actions}
    </section>
  ),
}));

describe('BrainSettingsHeader', () => {
  const handleReset = vi.fn();
  const handleSave = vi.fn();

  beforeEach(() => {
    handleReset.mockReset();
    handleSave.mockReset().mockResolvedValue(undefined);
  });

  it('renders brain header copy and forwards reset/save actions', () => {
    vi.mocked(useBrain).mockReturnValue({
      handleReset,
      handleSave,
      saving: false,
    } as unknown as ReturnType<typeof useBrain>);

    render(<BrainSettingsHeader />);

    expect(screen.getByText('System')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Brain' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Unified control center for AI routing, provider keys, report schedules, prompt steering, and deep metrics.',
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(handleReset).toHaveBeenCalledTimes(1);
    expect(handleSave).toHaveBeenCalledTimes(1);
  });

  it('shows the saving state and disables the save button while a save is in flight', () => {
    vi.mocked(useBrain).mockReturnValue({
      handleReset,
      handleSave,
      saving: true,
    } as unknown as ReturnType<typeof useBrain>);

    render(<BrainSettingsHeader />);

    const saveButton = screen.getByRole('button', { name: 'Saving...' });
    expect(saveButton).toBeDisabled();
  });
});
