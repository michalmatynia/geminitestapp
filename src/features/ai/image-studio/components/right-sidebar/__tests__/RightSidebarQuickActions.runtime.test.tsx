import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RightSidebarQuickActions } from '../RightSidebarQuickActions';
import { renderWithRightSidebarContext } from './rightSidebarContextTestUtils';

const mocks = vi.hoisted(() => ({
  onOpenControls: vi.fn(),
  onOpenPromptControl: vi.fn(),
  onOpenRequestPreview: vi.fn(),
  onRunGeneration: vi.fn(),
  onRunSequenceGeneration: vi.fn(),
}));

vi.mock('@/shared/ui', async () => {
  const mocks = await import('./rightSidebarRuntimeMockComponents');
  return {
    Button: mocks.MockButton,
    Input: mocks.MockInput,
  };
});

describe('RightSidebarQuickActions runtime path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the provider-managed actions and forwards clicks', () => {
    renderWithRightSidebarContext(<RightSidebarQuickActions />, {
      estimatedGenerationCost: 0.123,
      estimatedPromptTokens: 1234,
      generationBusy: false,
      generationLabel: 'Generate From Prompt',
      hasExtractedControls: true,
      modelSupportsSequenceGeneration: true,
      onOpenControls: mocks.onOpenControls,
      onOpenPromptControl: mocks.onOpenPromptControl,
      onOpenRequestPreview: mocks.onOpenRequestPreview,
      onRunGeneration: mocks.onRunGeneration,
      onRunSequenceGeneration: mocks.onRunSequenceGeneration,
      selectedModelId: 'gpt-image-1',
      sequenceRunBusy: false,
    });

    expect(screen.getByRole('textbox', { name: 'Brain-managed generation model' })).toHaveValue(
      'gpt-image-1'
    );
    expect(screen.getByText('Tokens ~1,234')).toBeInTheDocument();
    expect(screen.getByText('Est. Cost (gpt-image-1) $0.123')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Generate From Prompt' }));
    expect(mocks.onRunGeneration).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Generate sequence' }));
    expect(mocks.onRunSequenceGeneration).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Open prompt controls' }));
    expect(mocks.onOpenPromptControl).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Preview generation request payload and input images' }));
    expect(mocks.onOpenRequestPreview).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Open extracted controls' }));
    expect(mocks.onOpenControls).toHaveBeenCalledTimes(1);
  });

  it('falls back to the brain placeholder and disables unavailable actions', () => {
    renderWithRightSidebarContext(<RightSidebarQuickActions />, {
      generationBusy: true,
      hasExtractedControls: false,
      modelSupportsSequenceGeneration: false,
      selectedModelId: '',
      sequenceRunBusy: false,
    });

    expect(screen.getByRole('textbox', { name: 'Brain-managed generation model' })).toHaveValue(
      'Not configured in AI Brain'
    );
    expect(screen.queryByRole('button', { name: 'Generate sequence' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generate' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Open extracted controls' })).toBeDisabled();
  });
});
