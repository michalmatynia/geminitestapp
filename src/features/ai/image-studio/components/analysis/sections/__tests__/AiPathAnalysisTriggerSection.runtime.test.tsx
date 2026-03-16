import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { LabeledOptionWithDisabledDto } from '@/shared/contracts/base';
import {
  AiPathAnalysisTriggerProvider,
  AiPathAnalysisTriggerSection,
} from '../AiPathAnalysisTriggerSection';

import type { UseAiPathsObjectAnalysisReturn } from '@/features/ai/image-studio/hooks/useAiPathsObjectAnalysis';

vi.mock('@/shared/ui', () => ({
  Button: ({
    children,
    loading: _loading,
    ...rest
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    loading?: boolean;
  }): React.JSX.Element => (
    <button {...rest}>{children}</button>
  ),
  Card: ({ children }: { children: React.ReactNode }): React.JSX.Element => <div>{children}</div>,
  SelectSimple: ({
    value,
    onValueChange,
    options,
    ariaLabel,
    disabled,
  }: {
    value?: string;
    onValueChange: (value: string) => void;
    options: Array<LabeledOptionWithDisabledDto<string>>;
    ariaLabel?: string;
    disabled?: boolean;
  }): React.JSX.Element => (
    <select
      aria-label={ariaLabel}
      value={value}
      disabled={disabled}
      onChange={(event) => onValueChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value} disabled={option.disabled}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));

const createAnalysisRuntime = (
  overrides?: Partial<UseAiPathsObjectAnalysisReturn>
): UseAiPathsObjectAnalysisReturn => ({
  status: 'idle',
  errorMessage: null,
  lastResult: null,
  config: {
    pathId: 'path-1',
    fieldMapping: {},
    applyPreviewOffset: true,
    autoApplyTarget: 'both',
    runAfterApply: false,
  },
  pathMetas: [{ id: 'path-1', name: 'Primary Path' }],
  pathMetasLoading: false,
  setConfig: vi.fn(),
  triggerAnalysis: vi.fn(async () => {}),
  triggerAnalysisForPath: vi.fn(async () => {}),
  cancelAnalysis: vi.fn(),
  ...overrides,
});

describe('AiPathAnalysisTriggerSection runtime', () => {
  it('supports the shared provider path when explicit analysis is omitted', () => {
    render(
      <AiPathAnalysisTriggerProvider value={createAnalysisRuntime()}>
        <AiPathAnalysisTriggerSection variant='compact' />
      </AiPathAnalysisTriggerProvider>
    );

    expect(screen.getByRole('button', { name: 'Trigger AI Analysis' })).toBeEnabled();
    expect(screen.getByRole('combobox', { name: 'AI Path for object analysis' })).toHaveValue(
      'path-1'
    );
  });

  it('throws when no shared runtime or explicit analysis is provided', () => {
    expect(() => render(<AiPathAnalysisTriggerSection variant='compact' />)).toThrow(
      'AiPathAnalysisTriggerSection must be used within AiPathAnalysisTriggerProvider or receive explicit analysis'
    );
  });
});
