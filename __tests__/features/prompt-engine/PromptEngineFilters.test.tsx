import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PromptEngineFilters } from '@/features/prompt-engine/components/PromptEngineFilters';
import {
  usePromptEngineActions,
  usePromptEngineConfig,
  usePromptEngineData,
  usePromptEngineFilters,
} from '@/features/prompt-engine/context/PromptEngineContext';

vi.mock('@/features/prompt-engine/context/PromptEngineContext', () => ({
  usePromptEngineConfig: vi.fn(),
  usePromptEngineFilters: vi.fn(),
  usePromptEngineData: vi.fn(),
  usePromptEngineActions: vi.fn(),
}));

vi.mock('@/shared/ui/forms-and-actions.public', () => ({
  SegmentedControl: ({
    options,
  }: {
    options: Array<{ label: React.ReactNode; value: string }>;
  }) => (
    <div>
      {options.map((option) => (
        <button key={option.value} data-value={option.value}>
          {option.label}
        </button>
      ))}
    </div>
  ),
}));

vi.mock('@/shared/ui/templates/FilterPanel', () => ({
  FilterPanel: ({ onReset }: { onReset: () => void }) => (
    <button type='button' onClick={onReset}>
      reset-filters
    </button>
  ),
}));

type PromptEngineFiltersContextStub = ReturnType<typeof buildContextStub>;

const buildContextStub = (overrides: Partial<Record<string, unknown>> = {}) => {
  const stub = {
    query: '',
    setQuery: vi.fn(),
    severity: 'all',
    setSeverity: vi.fn(),
    scope: 'all',
    setScope: vi.fn(),
    patternTab: 'prompt_exploder',
    patternTabLocked: false,
    setPatternTab: vi.fn(),
    exploderSubTab: 'prompt_exploder_rules',
    exploderSubTabLocked: false,
    setExploderSubTab: vi.fn(),
    includeDisabled: true,
    setIncludeDisabled: vi.fn(),
    filteredDrafts: [],
    ...overrides,
  } as const;

  return stub;
};

const setup = (
  overrides: Partial<Record<string, unknown>> = {}
): PromptEngineFiltersContextStub => {
  const context = buildContextStub(overrides);
  vi.mocked(usePromptEngineConfig).mockReturnValue({
    patternTab: context.patternTab,
    patternTabLocked: context.patternTabLocked,
    exploderSubTab: context.exploderSubTab,
    exploderSubTabLocked: context.exploderSubTabLocked,
    scopeLocked: false,
    promptEngineSettings: {} as never,
    isUsingDefaults: false,
  });
  vi.mocked(usePromptEngineFilters).mockReturnValue({
    query: context.query,
    setQuery: context.setQuery,
    severity: context.severity,
    setSeverity: context.setSeverity,
    scope: context.scope,
    setScope: context.setScope,
    includeDisabled: context.includeDisabled,
    setIncludeDisabled: context.setIncludeDisabled,
  });
  vi.mocked(usePromptEngineData).mockReturnValue({
    filteredDrafts: context.filteredDrafts,
  } as never);
  vi.mocked(usePromptEngineActions).mockReturnValue({
    setPatternTab: context.setPatternTab,
    setExploderSubTab: context.setExploderSubTab,
  } as never);
  render(<PromptEngineFilters />);
  return context;
};

describe('PromptEngineFilters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows both tab switchers and resets tabs when unlocked', () => {
    const context = setup({
      patternTab: 'prompt_exploder',
      patternTabLocked: false,
      exploderSubTabLocked: false,
      exploderSubTab: 'prompt_exploder_rules',
    });

    expect(screen.getByText('Core Patterns')).toBeInTheDocument();
    expect(screen.getByText('Exploder')).toBeInTheDocument();
    expect(screen.getByText('Prompt Exploder')).toBeInTheDocument();
    expect(screen.getByText('Image Studio')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'reset-filters' }));

    expect(context.setPatternTab).toHaveBeenCalledWith('core');
    expect(context.setExploderSubTab).toHaveBeenCalledWith('prompt_exploder_rules');
  });

  it('hides tab switchers and preserves locked tabs on reset', () => {
    const context = setup({
      patternTab: 'prompt_exploder',
      patternTabLocked: true,
      exploderSubTabLocked: true,
      exploderSubTab: 'prompt_exploder_rules',
    });

    expect(screen.queryByText('Core Patterns')).not.toBeInTheDocument();
    expect(screen.queryByText('Exploder')).not.toBeInTheDocument();
    expect(screen.queryByText('Image Studio')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'reset-filters' }));

    expect(context.setPatternTab).not.toHaveBeenCalled();
    expect(context.setExploderSubTab).not.toHaveBeenCalled();
  });
});
