// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ToggleRow } from './toggle-row';

vi.mock('./card', () => ({
  Card: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => (
    <div {...props}>{children}</div>
  ),
}));

vi.mock('./checkbox', () => ({
  Checkbox: ({
    checked,
    onCheckedChange,
    disabled,
    ...props
  }: {
    checked: boolean;
    onCheckedChange?: (next: boolean) => void;
  } & React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
      type='checkbox'
      checked={checked}
      onChange={(event) => {
        if (!disabled) onCheckedChange?.(event.currentTarget.checked);
      }}
      disabled={disabled}
      {...props}
    />
  ),
}));

vi.mock('./switch', () => ({
  Switch: ({
    checked,
    onCheckedChange,
    disabled,
    ...props
  }: {
    checked: boolean;
    onCheckedChange?: (next: boolean) => void;
  } & React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
      type='checkbox'
      role='switch'
      checked={checked}
      onChange={(event) => {
        if (!disabled) onCheckedChange?.(event.currentTarget.checked);
      }}
      disabled={disabled}
      {...props}
    />
  ),
}));

describe('ToggleRow', () => {
  it('renders checkbox mode and forwards description/error accessibility ids', () => {
    const onCheckedChange = vi.fn();

    render(
      <ToggleRow
        label='Enable thing'
        description='Extra details'
        error='Something is wrong'
        checked={false}
        onCheckedChange={onCheckedChange}
      />
    );

    const checkbox = screen.getByRole('checkbox', { name: 'Enable thing' });
    const describedBy = checkbox.getAttribute('aria-describedby');

    expect(describedBy).toBeTruthy();
    expect(screen.getByText('Extra details').id).toContain('-description');
    expect(screen.getByText('Something is wrong').id).toContain('-error');

    fireEvent.click(checkbox);

    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('renders switch mode and disables it while loading', () => {
    const onCheckedChange = vi.fn();

    render(
      <ToggleRow
        label='Headless mode'
        checked
        loading
        variant='switch'
        onCheckedChange={onCheckedChange}
      />
    );

    const toggle = screen.getByRole('switch', { name: 'Headless mode' });
    expect(toggle).toBeDisabled();

    fireEvent.click(toggle);

    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});
