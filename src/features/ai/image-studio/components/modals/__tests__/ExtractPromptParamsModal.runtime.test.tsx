import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ExtractPromptParamsModal } from '../ExtractPromptParamsModalImpl';

const mocks = vi.hoisted(() => ({
  handleAiExtraction: vi.fn(),
  handleApplyExtraction: vi.fn(),
  handleProgrammaticExtraction: vi.fn(),
  handleSmartExtraction: vi.fn(),
  handleSuggestUiControls: vi.fn(),
  setExtractDraftPrompt: vi.fn(),
  setExtractReviewOpen: vi.fn(),
  runtime: {
    extractBusy: 'none' as 'none' | 'programmatic' | 'smart' | 'ai' | 'ui',
    extractDraftPrompt: 'Prompt with {{style}}',
    extractError: 'Prompt needs cleanup',
    extractHistory: [{ id: 'history-1' }],
    extractReviewOpen: true,
    previewControls: { style: 'chips' },
    previewLeaves: [{ path: 'style', value: 'storybook' }],
    previewParams: { style: 'storybook' } as Record<string, unknown> | null,
    previewValidation: {
      before: [{ ruleId: 'before-1', title: 'Before Issue', message: 'before warning' }],
      after: [],
    },
    studioSettings: {
      promptExtraction: {
        showValidationSummary: true,
      },
    },
  },
}));

vi.mock('@/shared/ui/navigation-and-layout.public', async () => {
  const mocks = await import('../../studio-modals/__tests__/studioInlineEditRuntimeMockComponents');
  return {
    CompactEmptyState: mocks.MockEmptyState,
    UI_GRID_RELAXED_CLASSNAME: mocks.UI_GRID_RELAXED_CLASSNAME,
  };
});

vi.mock('@/shared/ui/forms-and-actions.public', async () => {
  const mocks = await import('../../studio-modals/__tests__/studioInlineEditRuntimeMockComponents');
  return {
    FormModal: mocks.MockFormModal,
  };
});

vi.mock('@/shared/ui/primitives.public', async () => {
  const mocks = await import('../../studio-modals/__tests__/studioInlineEditRuntimeMockComponents');
  return {
    Label: mocks.MockLabel,
  };
});

vi.mock('@/shared/ui/templates.public', async () => {
  const mocks = await import('../../studio-modals/__tests__/studioInlineEditRuntimeMockComponents');
  return {
    StandardDataTablePanel: mocks.MockStandardDataTablePanel,
  };
});

vi.mock('../StudioActionButtonRow', async () => {
  const mocks = await import('./studioPromptRuntimeMockComponents');
  return {
    StudioActionButtonRow: mocks.MockStudioActionButtonRow,
  };
});

vi.mock('../StudioPromptTextSection', async () => {
  const mocks = await import('./studioPromptRuntimeMockComponents');
  return {
    StudioPromptTextSection: (props: {
      label: string;
      onValueChange: (value: string) => void;
      value: string;
    }): React.JSX.Element => (
      <mocks.MockStudioPromptTextSection id='prompt-source' {...props} />
    ),
  };
});

vi.mock('../../studio-modals/PromptExtractionHistoryPanel', () => ({
  PromptExtractionHistoryPanel: (): React.JSX.Element => <div>Prompt History</div>,
}));

vi.mock(
  '../../studio-modals/StudioInlineEditContext',
  async () => {
    const { createStudioInlineEditMockModule } = await import(
      '../../studio-modals/__tests__/studioInlineEditTestUtils'
    );
    return createStudioInlineEditMockModule(() => ({
      extractDraftPrompt: mocks.runtime.extractDraftPrompt,
      setExtractDraftPrompt: mocks.setExtractDraftPrompt,
      extractBusy: mocks.runtime.extractBusy,
      handleSmartExtraction: mocks.handleSmartExtraction,
      handleProgrammaticExtraction: mocks.handleProgrammaticExtraction,
      handleAiExtraction: mocks.handleAiExtraction,
      handleSuggestUiControls: mocks.handleSuggestUiControls,
      handleApplyExtraction: mocks.handleApplyExtraction,
      previewParams: mocks.runtime.previewParams,
      extractError: mocks.runtime.extractError,
      extractHistory: mocks.runtime.extractHistory,
      studioSettings: mocks.runtime.studioSettings,
      previewValidation: mocks.runtime.previewValidation,
      previewLeaves: mocks.runtime.previewLeaves,
      previewControls: mocks.runtime.previewControls,
      extractReviewOpen: mocks.runtime.extractReviewOpen,
      setExtractReviewOpen: mocks.setExtractReviewOpen,
    }));
  }
);

describe('ExtractPromptParamsModal runtime path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runtime.extractBusy = 'none';
    mocks.runtime.extractDraftPrompt = 'Prompt with {{style}}';
    mocks.runtime.extractError = 'Prompt needs cleanup';
    mocks.runtime.extractHistory = [{ id: 'history-1' }];
    mocks.runtime.extractReviewOpen = true;
    mocks.runtime.previewControls = { style: 'chips' };
    mocks.runtime.previewLeaves = [{ path: 'style', value: 'storybook' }];
    mocks.runtime.previewParams = { style: 'storybook' };
    mocks.runtime.previewValidation = {
      before: [{ ruleId: 'before-1', title: 'Before Issue', message: 'before warning' }],
      after: [],
    };
    mocks.runtime.studioSettings = {
      promptExtraction: {
        showValidationSummary: true,
      },
    };
  });

  it('renders from StudioInlineEditContext and forwards modal actions', () => {
    render(<ExtractPromptParamsModal />);

    expect(screen.getByTestId('form-modal')).toBeInTheDocument();
    expect(screen.getByText('Extract Prompt Params')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Prompt with {{style}}')).toBeInTheDocument();
    expect(screen.getByText('Prompt needs cleanup')).toBeInTheDocument();
    expect(screen.getByText('Prompt History')).toBeInTheDocument();
    expect(screen.getByText('style:storybook')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Smart' }));
    expect(mocks.handleSmartExtraction).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Updated prompt text' },
    });
    expect(mocks.setExtractDraftPrompt).toHaveBeenCalledWith('Updated prompt text');

    fireEvent.click(screen.getByRole('button', { name: 'Apply Changes' }));
    expect(mocks.handleApplyExtraction).toHaveBeenCalledTimes(1);
  });

  it('shows the empty state and closes through StudioInlineEditContext', () => {
    mocks.runtime.extractError = null;
    mocks.runtime.extractHistory = [];
    mocks.runtime.previewLeaves = [];
    mocks.runtime.previewParams = null;
    mocks.runtime.previewValidation = null;

    render(<ExtractPromptParamsModal />);

    expect(screen.getByText('No parameters')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(mocks.setExtractReviewOpen).toHaveBeenCalledWith(false);

    expect(screen.getByRole('button', { name: 'Apply Changes' })).toBeDisabled();
  });
});
