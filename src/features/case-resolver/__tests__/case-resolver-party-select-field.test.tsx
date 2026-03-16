import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { LabeledOptionDto, LabeledOptionWithDescriptionDto } from '@/shared/contracts/base';
import { CaseResolverPartySelectField } from '@/features/case-resolver/components/page/CaseResolverPartySelectField';
import { CaseResolverPartyFieldRuntimeProvider } from '@/features/case-resolver/components/page/CaseResolverPartyFieldRuntimeContext';
import type { LabeledOptionDto } from '@/shared/contracts/base';

vi.mock('@/shared/ui', () => ({
  SelectSimple: ({
    value,
    onValueChange,
    options,
    placeholder,
    disabled,
  }: {
    value?: string;
    onValueChange: (value: string) => void;
    options: Array<LabeledOptionWithDescriptionDto<string>>;
    placeholder?: string;
    disabled?: boolean;
  }): React.JSX.Element => (
    <select
      aria-label={placeholder ?? 'party-select'}
      value={value}
      disabled={disabled}
      onChange={(event) => onValueChange(event.target.value)}
    >
      <option value=''>{placeholder ?? 'Select'}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
  SegmentedControl: ({
    value,
    onChange,
    options,
  }: {
    value: string;
    onChange: (value: string) => void;
    options: Array<LabeledOptionDto<string>>;
  }): React.JSX.Element => (
    <div>
      {options.map((option) => (
        <button
          key={option.value}
          type='button'
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  ),
  Button: ({
    children,
    ...rest
  }: React.ButtonHTMLAttributes<HTMLButtonElement>): React.JSX.Element => (
    <button {...rest}>{children}</button>
  ),
}));

const PARTY_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'person:1', label: 'Alice' },
  { value: 'organization:1', label: 'Acme Org' },
] as const satisfies ReadonlyArray<LabeledOptionDto<string>>;

describe('CaseResolverPartySelectField', () => {
  it('supports the shared party-field runtime path when explicit options are omitted', () => {
    const onValueChange = vi.fn();

    render(
      <CaseResolverPartyFieldRuntimeProvider value={{ options: PARTY_OPTIONS, disabled: false }}>
        <CaseResolverPartySelectField
          label='From'
          value='person:1'
          onValueChange={onValueChange}
          placeholder='From...'
        />
      </CaseResolverPartyFieldRuntimeProvider>
    );

    expect(screen.getByText('From')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Org' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'From...' }), {
      target: { value: 'organization:1' },
    });

    expect(onValueChange).toHaveBeenCalledWith('organization:1');
  });

  it('throws when explicit options are omitted without shared runtime', () => {
    expect(() =>
      render(
        <CaseResolverPartySelectField label='From' value='' onValueChange={vi.fn()} />
      )
    ).toThrow(
      'CaseResolverPartySelectField must be used within CaseResolverPartyFieldRuntimeProvider or receive explicit options'
    );
  });
});
