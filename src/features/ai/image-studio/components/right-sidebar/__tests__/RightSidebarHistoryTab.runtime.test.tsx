import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RightSidebarHistoryTab } from '../RightSidebarHistoryTab';
import { renderWithRightSidebarContext } from './rightSidebarContextTestUtils';

const mocks = vi.hoisted(() => ({
  onRestoreActionStep: vi.fn(),
  setHistoryMode: vi.fn(),
}));

vi.mock('@/shared/ui', async () => {
  const mocks = await import('./rightSidebarRuntimeMockComponents');
  return {
    Button: mocks.MockButton,
  };
});

vi.mock('../../ProjectGenerationHistoryTab', () => ({
  ProjectGenerationHistoryTab: (): React.JSX.Element => <div>Project Generation History</div>,
}));

describe('RightSidebarHistoryTab runtime path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders action history from RightSidebarContext and restores steps', () => {
    renderWithRightSidebarContext(<RightSidebarHistoryTab />, {
      actionHistoryEntriesLength: 2,
      actionHistoryItems: [
        {
          entry: {
            id: 'action-1',
            label: 'Updated Prompt',
            createdAt: '2026-03-07T10:00:00.000Z',
          },
          index: 1,
        },
      ],
      actionHistoryMaxSteps: 20,
      activeActionHistoryIndex: 1,
      historyMode: 'actions',
      onRestoreActionStep: mocks.onRestoreActionStep,
      setHistoryMode: mocks.setHistoryMode,
    });

    expect(
      screen.getByText('Tracks editor state changes (up to 20 steps). Click any step to restore it.')
    ).toBeInTheDocument();
    expect(screen.getByText('Updated Prompt')).toBeInTheDocument();
    expect(screen.getByText('Step 2 of 2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Updated Prompt/i }));
    expect(mocks.onRestoreActionStep).toHaveBeenCalledWith(1);

    fireEvent.click(screen.getByRole('button', { name: 'Generation Runs' }));
    expect(mocks.setHistoryMode).toHaveBeenCalledWith('runs');
  });

  it('renders the generation history branch when runs mode is active', () => {
    renderWithRightSidebarContext(<RightSidebarHistoryTab />, {
      historyMode: 'runs',
      setHistoryMode: mocks.setHistoryMode,
    });

    expect(screen.getByText('Project Generation History')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Action Steps' }));
    expect(mocks.setHistoryMode).toHaveBeenCalledWith('actions');
  });
});
