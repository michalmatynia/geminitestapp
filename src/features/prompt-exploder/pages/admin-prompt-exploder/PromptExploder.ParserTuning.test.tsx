// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  PromptExploderParserTuningPanel,
  PromptExploderParserTuningProvider,
} from './PromptExploder.ParserTuning';
import {
  SettingsActionsContext,
  SettingsStateContext,
} from '../../context/SettingsContext';

const { routerPushMock } = vi.hoisted(() => ({
  routerPushMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: routerPushMock,
  }),
}));

vi.mock('nextjs-toploader/app', () => ({
  useRouter: () => ({
    push: routerPushMock,
  }),
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  Button: ({
    children,
    onClick,
    disabled,
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) => (
    <button type='button' onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  Label: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <label className={className}>{children}</label>
  ),
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} />,
}));

vi.mock('@/shared/ui/forms-and-actions.public', () => ({
  FormSection: ({ children }: { children?: React.ReactNode }) => <section>{children}</section>,
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
    size?: string;
    title?: string;
  }) => (
    <select
      aria-label={ariaLabel}
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
  StatusToggle: ({
    enabled,
    onToggle,
  }: {
    enabled: boolean;
    onToggle: () => void;
  }) => (
    <button type='button' aria-label='Enabled' onClick={onToggle}>
      {enabled ? 'on' : 'off'}
    </button>
  ),
}));

const draft = {
  id: 'rule-1',
  label: 'Rule 1',
  title: 'Original title',
  description: 'Original description',
  pattern: '^foo$',
  flags: 'i',
  enabled: true,
  promptExploderPriority: 1,
  promptExploderConfidenceBoost: 0.1,
  promptExploderTreatAsHeading: false,
  promptExploderSegmentType: null,
} as const;

describe('PromptExploderParserTuning', () => {
  it('throws when the panel renders outside the provider', () => {
    expect(() => render(<PromptExploderParserTuningPanel />)).toThrow(
      'usePromptExploderParserTuningContext must be used inside PromptExploderParserTuningProvider'
    );
  });

  it('uses an explicit provider value to drive the panel actions', () => {
    const onPatchDraft = vi.fn();
    const onSave = vi.fn();
    const onResetToPackDefaults = vi.fn();
    const onOpenValidationPatterns = vi.fn();

    render(
      <PromptExploderParserTuningProvider
        value={{
          drafts: [draft],
          onPatchDraft,
          onSave,
          onResetToPackDefaults,
          onOpenValidationPatterns,
          isBusy: false,
        }}
      >
        <PromptExploderParserTuningPanel />
      </PromptExploderParserTuningProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save Parser Tuning' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reset To Pack Defaults' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open Validation Patterns' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Enabled' })[0]!);
    fireEvent.change(screen.getByRole('textbox', { name: 'Title' }), {
      target: { value: 'Updated title' },
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onResetToPackDefaults).toHaveBeenCalledTimes(1);
    expect(onOpenValidationPatterns).toHaveBeenCalledTimes(1);
    expect(onPatchDraft).toHaveBeenCalledWith('rule-1', {
      enabled: false,
    });
    expect(onPatchDraft).toHaveBeenCalledWith('rule-1', {
      title: 'Updated title',
    });
  });

  it('derives its runtime from SettingsProvider contexts when no explicit value is passed', () => {
    const handleSaveParserTuningRules = vi.fn();
    const handleResetParserTuningDrafts = vi.fn();
    const patchParserTuningDraft = vi.fn();

    render(
      <SettingsStateContext.Provider
        value={
          {
            parserTuningDrafts: [draft],
            activeValidationRuleStack: 'prompt-exploder',
            validatorPatternLists: [],
            isBusy: false,
          } as never
        }
      >
        <SettingsActionsContext.Provider
          value={
            {
              handleSaveParserTuningRules,
              handleResetParserTuningDrafts,
              patchParserTuningDraft,
            } as never
          }
        >
          <PromptExploderParserTuningProvider>
            <PromptExploderParserTuningPanel />
          </PromptExploderParserTuningProvider>
        </SettingsActionsContext.Provider>
      </SettingsStateContext.Provider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save Parser Tuning' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reset To Pack Defaults' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open Validation Patterns' }));

    expect(handleSaveParserTuningRules).toHaveBeenCalledTimes(1);
    expect(handleResetParserTuningDrafts).toHaveBeenCalledTimes(1);
    expect(routerPushMock).toHaveBeenCalledWith(expect.stringContaining('/admin/validator?scope='));
  });
});
