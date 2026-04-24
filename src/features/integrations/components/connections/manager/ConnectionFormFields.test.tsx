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
    description,
    children,
  }: {
    label: string;
    description?: string;
    children: React.ReactNode;
  }) => (
    <div>
      <div>{label}</div>
      {description ? <div>{description}</div> : null}
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

  it('explains strict mapped categories versus Tradera automatic category selection', () => {
    renderFields('tradera');

    const strategySelect = screen.getByLabelText('Category selection strategy');

    expect(screen.getByText('Category mapper (strict mapped category)')).toBeInTheDocument();
    expect(screen.getByText('Top suggested by Tradera (automatic)')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Uses the synced Category Mapper match and stops the listing if that Tradera category cannot be selected.'
      )
    ).toBeInTheDocument();

    fireEvent.change(strategySelect, {
      target: { value: 'top_suggested' },
    });

    expect(
      screen.getByText('Lets Tradera choose the category automatically during listing.')
    ).toBeInTheDocument();
  });

  it('shows optional Vinted credential fields for reusable browser sessions', () => {
    renderFields('vinted');

    expect(screen.getByLabelText('Integration name (e.g. Vinted Browser)')).toBeInTheDocument();
    expect(screen.getByLabelText('Vinted email (optional)')).toBeInTheDocument();
    expect(screen.getByLabelText('Vinted password (optional)')).toBeInTheDocument();
    expect(
      screen.getAllByText(
        'Optional. Leave blank if you will sign in through the login window and reuse the stored browser session.'
      )
    ).toHaveLength(2);
    expect(screen.queryByLabelText('Browser automation mode')).toBeNull();
  });

  it('shows 1688 profile fields and keeps search mode in sync with URL fallback', () => {
    renderFields('1688');

    expect(screen.getByLabelText('1688 start URL')).toBeInTheDocument();
    expect(screen.getByLabelText('1688 login mode')).toBeInTheDocument();
    expect(screen.getByLabelText('1688 search mode')).toBeInTheDocument();
    expect(screen.getByLabelText('1688 candidate cap override')).toBeInTheDocument();
    expect(screen.getByLabelText('1688 minimum score override')).toBeInTheDocument();
    expect(screen.getByLabelText('1688 max extracted images override')).toBeInTheDocument();

    const searchMode = screen.getByLabelText('1688 search mode') as HTMLSelectElement;
    const urlFallback = screen.getByLabelText(
      'Allow image URL fallback for 1688 search'
    ) as HTMLInputElement;

    expect(searchMode.value).toBe('local_image');
    expect(urlFallback.checked).toBe(false);

    fireEvent.change(searchMode, {
      target: { value: 'image_url_fallback' },
    });

    expect(urlFallback.checked).toBe(true);

    fireEvent.click(urlFallback);

    expect(searchMode.value).toBe('local_image');
    expect(urlFallback.checked).toBe(false);
  });
});
