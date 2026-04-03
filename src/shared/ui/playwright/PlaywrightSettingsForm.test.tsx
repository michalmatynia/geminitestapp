// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, renderHook, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { PlaywrightSettings } from '@/shared/contracts/playwright';
import { defaultPlaywrightSettings } from '@/shared/lib/playwright/settings';

import {
  PlaywrightSettingsForm,
  PlaywrightSettingsFormContent,
  PlaywrightSettingsProvider,
  usePlaywrightSettings,
} from './PlaywrightSettingsForm';

vi.mock('@/shared/ui', () => ({
  CollapsibleSection: ({
    children,
    title,
  }: {
    children?: React.ReactNode;
    title?: React.ReactNode;
  }) => (
    <section>
      <div>{title}</div>
      {children}
    </section>
  ),
  FormActions: ({
    onSave,
    saveText,
  }: {
    onSave?: () => void;
    saveText?: string;
    className?: string;
  }) => (
    <button type='button' onClick={onSave}>
      {saveText ?? 'Save'}
    </button>
  ),
  FormField: ({
    children,
    label,
  }: {
    children?: React.ReactNode;
    label?: React.ReactNode;
  }) => (
    <label>
      <span>{label}</span>
      {children}
    </label>
  ),
  FormSection: ({
    children,
    title,
    description,
    className,
    variant,
  }: {
    children?: React.ReactNode;
    title?: React.ReactNode;
    description?: React.ReactNode;
    className?: string;
    variant?: string;
  }) => (
    <section data-class-name={className} data-variant={variant}>
      {title ? <h2>{title}</h2> : null}
      {description ? <p>{description}</p> : null}
      {children}
    </section>
  ),
  Hint: ({ children }: { children?: React.ReactNode; variant?: string }) => <div>{children}</div>,
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  SelectSimple: ({
    value,
    onValueChange,
    options,
    ariaLabel,
    title,
  }: {
    value?: string;
    onValueChange?: (value: string) => void;
    options: Array<{ value: string; label: string }>;
    ariaLabel?: string;
    title?: string;
    size?: string;
    placeholder?: string;
  }) => (
    <select
      aria-label={ariaLabel}
      title={title}
      value={value}
      onChange={(event) => onValueChange?.(event.currentTarget.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
  ToggleRow: ({
    label,
    checked,
    onCheckedChange,
    variant,
  }: {
    label: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    variant?: string;
    description?: string;
    className?: string;
  }) => (
    <label>
      <span>{label}</span>
      <input
        type='checkbox'
        role={variant === 'switch' ? 'switch' : 'checkbox'}
        aria-label={label}
        checked={checked}
        onChange={(event) => onCheckedChange(event.currentTarget.checked)}
      />
    </label>
  ),
  UI_GRID_RELAXED_CLASSNAME: 'ui-grid-relaxed',
}));

describe('PlaywrightSettingsForm', () => {
  it('throws from usePlaywrightSettings outside the provider', () => {
    expect(() => renderHook(() => usePlaywrightSettings())).toThrow(
      'usePlaywrightSettings must be used within a PlaywrightSettingsProvider'
    );
  });

  it('throws from content when the view provider is missing', () => {
    expect(() => render(<PlaywrightSettingsFormContent />)).toThrow(
      'usePlaywrightSettingsFormView must be used within PlaywrightSettingsFormViewProvider'
    );
  });

  it('returns the settings context inside the provider', () => {
    const setSettings = vi.fn();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <PlaywrightSettingsProvider settings={defaultPlaywrightSettings} setSettings={setSettings}>
        {children}
      </PlaywrightSettingsProvider>
    );

    const { result } = renderHook(() => usePlaywrightSettings(), { wrapper });

    expect(result.current.settings.headless).toBe(true);
    expect(result.current.setSettings).toBe(setSettings);
  });

  it('updates headless mode and renders save actions in the full form', () => {
    const setSettings = vi.fn();
    const onSave = vi.fn();

    render(
      <PlaywrightSettingsForm
        settings={defaultPlaywrightSettings}
        setSettings={setSettings}
        onSave={onSave}
        saveLabel='Persist settings'
      />
    );

    fireEvent.click(screen.getByRole('switch', { name: 'Headless mode' }));
    fireEvent.click(screen.getByRole('button', { name: 'Persist settings' }));

    expect(setSettings).toHaveBeenCalled();
    const updater = setSettings.mock.calls[0]?.[0] as ((prev: PlaywrightSettings) => PlaywrightSettings);
    expect(updater(defaultPlaywrightSettings).headless).toBe(false);
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
