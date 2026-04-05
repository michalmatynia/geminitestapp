// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { createEmptyConnectionForm } from '@/features/integrations/context/integrations-context-types';

vi.mock('@/shared/ui/primitives.public', () => ({
  Button: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props} />,
  Checkbox: ({
    checked,
    onCheckedChange,
    id,
  }: {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    id?: string;
  }) => (
    <input
      id={id}
      type='checkbox'
      checked={checked}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  Label: (props: React.LabelHTMLAttributes<HTMLLabelElement>) => <label {...props} />,
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} />,
}));

vi.mock('@/shared/ui/forms-and-actions.public', () => ({
  FormField: ({
    label,
    children,
  }: {
    label: string;
    children: React.ReactNode;
  }) => (
    <div>
      <div>{label}</div>
      {children}
    </div>
  ),
  SelectSimple: ({
    value,
    onValueChange,
    options,
    ariaLabel,
  }: {
    value?: string;
    onValueChange?: (value: string) => void;
    options: Array<{ value: string; label: string }>;
    ariaLabel?: string;
  }) => (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(event) => onValueChange?.(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));

vi.mock('@/shared/ui/navigation-and-layout.public', () => ({
  UI_CENTER_ROW_SPACED_CLASSNAME: 'row',
}));

import { ConnectionFormFields } from './ConnectionFormFields';

function renderFields(integrationSlug: string): void {
  function Wrapper(): React.JSX.Element {
    const [form, setForm] = React.useState(createEmptyConnectionForm());

    return (
      <ConnectionFormFields
        integrationSlug={integrationSlug}
        form={form}
        setForm={setForm}
        mode='create'
      />
    );
  }

  render(<Wrapper />);
}

describe('ConnectionFormFields', () => {
  it('shows scripted Tradera browser controls without persisting a managed script body by default', () => {
    renderFields('tradera');

    expect(screen.getByLabelText('Browser automation mode')).toBeInTheDocument();
    expect(screen.queryByLabelText('Playwright listing script')).toBeNull();

    fireEvent.change(screen.getByLabelText('Browser automation mode'), {
      target: { value: 'scripted' },
    });

    const textarea = screen.getByLabelText('Playwright listing script');
    expect(textarea).toBeInTheDocument();
    expect((textarea as HTMLTextAreaElement).value).toBe('');
  });

  it('does not show scripted browser controls for Tradera API connections', () => {
    renderFields('tradera-api');

    expect(screen.queryByLabelText('Browser automation mode')).toBeNull();
    expect(screen.queryByLabelText('Playwright listing script')).toBeNull();
  });
});
