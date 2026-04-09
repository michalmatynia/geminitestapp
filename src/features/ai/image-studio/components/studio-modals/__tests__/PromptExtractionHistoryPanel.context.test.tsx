import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PromptExtractionHistoryPanel } from '../PromptExtractionHistoryPanel';

const mocks = vi.hoisted(() => ({
  setExtractHistory: vi.fn(),
  setSelectedExtractHistoryId: vi.fn(),
}));

vi.mock('@/shared/ui/primitives.public', async () => {
  const mocks = await import('./studioInlineEditRuntimeMockComponents');
  return {
    Button: mocks.MockButton,
  };
});

vi.mock(
  '../StudioInlineEditContext',
  async () => {
    const { createStudioInlineEditMockModule } = await import('./studioInlineEditTestUtils');
    return createStudioInlineEditMockModule(() => ({
      setSelectedExtractHistoryId: mocks.setSelectedExtractHistoryId,
      setExtractHistory: mocks.setExtractHistory,
    }));
  }
);

describe('PromptExtractionHistoryPanel context path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders history from StudioInlineEditContext and selects entries', () => {
    render(<PromptExtractionHistoryPanel />);

    expect(screen.getByText('Extraction History')).toBeInTheDocument();
    expect(screen.getAllByText('Smart Extract')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: /Smart Extract/i }));
    expect(mocks.setSelectedExtractHistoryId).toHaveBeenCalledWith('history-1');
  });

  it('clears history through StudioInlineEditContext actions', () => {
    render(<PromptExtractionHistoryPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'Clear History' }));

    expect(mocks.setExtractHistory).toHaveBeenCalledWith([]);
    expect(mocks.setSelectedExtractHistoryId).toHaveBeenCalledWith(null);
  });
});
