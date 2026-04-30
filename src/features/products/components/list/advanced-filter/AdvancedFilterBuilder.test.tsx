/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdvancedFilterBuilder } from './AdvancedFilterBuilder';

vi.mock('@/shared/ui/button', () => ({
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
}));

vi.mock('@/shared/ui/checkbox', () => ({
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
}));

vi.mock('@/shared/ui/input', () => ({
  Input: React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
    function Input(props, ref) {
      return <input ref={ref} {...props} />;
    }
  ),
}));

vi.mock('@/shared/ui/label', () => ({
  Label: ({ children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
    <label {...props}>{children}</label>
  ),
}));

vi.mock('@/shared/ui/multi-select', () => ({
  MultiSelect: ({
    ariaLabel,
    onChange,
    options,
    searchPlaceholder,
    selected,
  }: {
    ariaLabel?: string;
    onChange: (values: string[]) => void;
    options: Array<{ value: string; label: string }>;
    searchPlaceholder?: string;
    selected: string[];
  }) => (
    <div
      aria-label={ariaLabel}
      data-testid={
        ariaLabel === 'Condition Tradera status value'
          ? 'tradera-status-value-select'
          : 'category-value-select'
      }
    >
      <input aria-label={searchPlaceholder ?? 'Search'} placeholder={searchPlaceholder} />
      <div data-testid='selected-option-values'>{selected.join(',')}</div>
      {options.map((option) => (
        <button key={option.value} type='button' onClick={() => onChange([option.value])}>
          {option.label}
        </button>
      ))}
      <button type='button' onClick={() => onChange([])}>
        Clear category
      </button>
    </div>
  ),
}));

vi.mock('@/shared/ui/select-simple', () => ({
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

  it('renders category condition values as a selector with Unassigned and actual categories', () => {
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
              id: 'rule-category',
              field: 'categoryId',
              operator: 'eq',
              value: '__unassigned__',
            },
          ],
        }}
        onChange={onChange}
        fieldValueOptions={{
          categoryId: [
            { value: '__unassigned__', label: 'Unassigned' },
            { value: 'cat-keychains', label: 'Keychains' },
          ],
        }}
      />
    );

    expect(screen.getByTestId('category-value-select')).toHaveAccessibleName(
      'Condition category value'
    );
    expect(screen.getByLabelText('Search categories...')).toBeInTheDocument();
    expect(screen.getByTestId('selected-option-values')).toHaveTextContent('__unassigned__');

    fireEvent.click(screen.getByRole('button', { name: 'Keychains' }));

    const nextGroup = onChange.mock.lastCall?.[0];
    expect(nextGroup.rules[0]).toMatchObject({
      field: 'categoryId',
      operator: 'eq',
      value: 'cat-keychains',
    });
  });

  it('renders Tradera status values as a searchable selector and supports status options', () => {
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
              id: 'rule-tradera-status',
              field: 'traderaStatus',
              operator: 'eq',
              value: 'not_added',
            },
          ],
        }}
        onChange={onChange}
        fieldValueOptions={{
          traderaStatus: [
            { value: 'disabled', label: 'Disabled' },
            { value: 'not_added', label: 'Not added' },
            { value: 'active', label: 'Active' },
          ],
        }}
      />
    );

    expect(screen.getByTestId('tradera-status-value-select')).toHaveAccessibleName(
      'Condition Tradera status value'
    );
    expect(screen.getByLabelText('Search Tradera statuses...')).toBeInTheDocument();
    expect(screen.getByTestId('selected-option-values')).toHaveTextContent('not_added');

    fireEvent.click(screen.getByRole('button', { name: 'Active' }));

    const nextGroup = onChange.mock.lastCall?.[0];
    expect(nextGroup.rules[0]).toMatchObject({
      field: 'traderaStatus',
      operator: 'eq',
      value: 'active',
    });
  });
});
