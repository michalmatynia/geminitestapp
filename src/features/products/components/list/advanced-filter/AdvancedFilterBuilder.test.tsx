/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdvancedFilterBuilder } from './AdvancedFilterBuilder';

vi.mock('@/features/products/ui', () => ({
  Button: ({
    children,
    onClick,
    type = 'button',
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type={type} onClick={onClick} {...props}>
      {children}
    </button>
  ),
  Checkbox: ({
    checked,
    onCheckedChange,
    ...props
  }: {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  } & React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
      type='checkbox'
      checked={checked}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
      {...props}
    />
  ),
  Input: React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
    function Input(props, ref) {
      return <input ref={ref} {...props} />;
    }
  ),
  Label: ({ children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
    <label {...props}>{children}</label>
  ),
  SelectSimple: ({
    value,
    onValueChange,
    options,
    placeholder,
    ariaLabel,
  }: {
    value?: string;
    onValueChange?: (value: string) => void;
    options: Array<{ value: string; label: string }>;
    placeholder?: string;
    ariaLabel?: string;
  }) => (
    <select
      aria-label={ariaLabel ?? placeholder ?? 'select'}
      value={value ?? ''}
      onChange={(event) => onValueChange?.(event.target.value)}
    >
      {placeholder ? <option value=''>{placeholder}</option> : null}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));

describe('AdvancedFilterBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adds a new condition at the root without relying on a runtime provider', () => {
    const onChange = vi.fn();

    render(
      <AdvancedFilterBuilder
        group={{
          type: 'group',
          id: 'group-root',
          combinator: 'and',
          not: false,
          rules: [
            {
              type: 'condition',
              id: 'rule-1',
              field: 'name',
              operator: 'contains',
              value: 'shoe',
            },
          ],
        }}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Add Condition' }));

    const nextGroup = onChange.mock.calls[0]?.[0];
    expect(nextGroup.rules).toHaveLength(2);
    expect(nextGroup.rules[1]).toMatchObject({
      type: 'condition',
      field: 'name',
      operator: 'contains',
    });
    expect(nextGroup.rules[1].id).not.toBe('rule-1');
  });

  it('duplicates nested rules through the recursive editor props path', () => {
    const onChange = vi.fn();

    render(
      <AdvancedFilterBuilder
        group={{
          type: 'group',
          id: 'group-root',
          combinator: 'and',
          not: false,
          rules: [
            {
              type: 'group',
              id: 'group-nested',
              combinator: 'or',
              not: false,
              rules: [
                {
                  type: 'condition',
                  id: 'rule-1',
                  field: 'sku',
                  operator: 'eq',
                  value: 'SKU-1',
                },
              ],
            },
          ],
        }}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Duplicate rule' }));

    const nextGroup = onChange.mock.calls[0]?.[0];
    const nestedGroup = nextGroup.rules[0];

    expect(nestedGroup.rules).toHaveLength(2);
    expect(nestedGroup.rules[0]).toMatchObject({
      type: 'condition',
      id: 'rule-1',
      field: 'sku',
      operator: 'eq',
      value: 'SKU-1',
    });
    expect(nestedGroup.rules[1]).toMatchObject({
      type: 'condition',
      field: 'sku',
      operator: 'eq',
      value: 'SKU-1',
    });
    expect(nestedGroup.rules[1].id).not.toBe('rule-1');
  });
});
