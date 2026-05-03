/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import * as React from 'react';

import { RadioGroup, RadioGroupItem } from '@/shared/ui/radio-group';
import { Switch } from '@/shared/ui/switch';

describe('radio and switch primitives', () => {
  it('renders controlled radio items without ref-driven update loops', () => {
    const onValueChange = vi.fn();

    render(
      <RadioGroup value='route-a' onValueChange={onValueChange}>
        <div>
          <RadioGroupItem id='route-a' value='route-a' />
          <label htmlFor='route-a'>Route A</label>
        </div>
        <div>
          <RadioGroupItem id='route-b' value='route-b' />
          <label htmlFor='route-b'>Route B</label>
        </div>
      </RadioGroup>
    );

    expect(screen.getByRole('radio', { name: 'Route A' })).toHaveAttribute(
      'aria-checked',
      'true'
    );

    fireEvent.click(screen.getByRole('radio', { name: 'Route B' }));

    expect(onValueChange).toHaveBeenCalledWith('route-b');
  });

  it('supports uncontrolled switch toggles without Radix callback refs', () => {
    const onCheckedChange = vi.fn();

    render(
      <>
        <label htmlFor='publish-switch'>Published</label>
        <Switch id='publish-switch' onCheckedChange={onCheckedChange} />
      </>
    );

    const toggle = screen.getByRole('switch', { name: 'Published' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });
});
