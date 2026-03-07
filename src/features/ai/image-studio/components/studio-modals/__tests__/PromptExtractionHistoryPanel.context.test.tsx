import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PromptExtractionHistoryPanel } from '../PromptExtractionHistoryPanel';

const mocks = vi.hoisted(() => ({
  setExtractHistory: vi.fn(),
  setSelectedExtractHistoryId: vi.fn(),
}));

vi.mock('@/shared/ui', () => ({
  Button: ({
    children,
    ...rest
  }: React.ButtonHTMLAttributes<HTMLButtonElement>): React.JSX.Element => (
    <button {...rest}>{children}</button>
  ),
}));

vi.mock('../StudioInlineEditContext', () => ({
  useStudioInlineEdit: () => ({
    extractHistory: [
      {
        id: 'history-1',
        createdAt: Date.parse('2026-03-07T10:00:00.000Z'),
        runKind: 'smart',
        source: 'gpt',
        modeRequested: 'smart',
        fallbackUsed: false,
        autofixApplied: true,
        promptBefore: 'before',
        promptAfter: 'after',
        validationBeforeCount: 2,
        validationAfterCount: 1,
      },
    ],
    selectedExtractHistory: {
      id: 'history-1',
      createdAt: Date.parse('2026-03-07T10:00:00.000Z'),
      runKind: 'smart',
      source: 'gpt',
      modeRequested: 'smart',
      fallbackUsed: false,
      autofixApplied: true,
      promptBefore: 'before',
      promptAfter: 'after',
      validationBeforeCount: 2,
      validationAfterCount: 1,
    },
    selectedExtractDiffLines: [{ before: 'before', after: 'after', changed: true }],
    selectedExtractChanged: true,
    setSelectedExtractHistoryId: mocks.setSelectedExtractHistoryId,
    setExtractHistory: mocks.setExtractHistory,
  }),
}));

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
