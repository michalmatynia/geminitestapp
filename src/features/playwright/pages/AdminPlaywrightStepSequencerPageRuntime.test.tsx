// @vitest-environment jsdom

import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  useSearchParamsMock,
  usePlaywrightStepSequencerStateMock,
} = vi.hoisted(() => ({
  useSearchParamsMock: vi.fn(),
  usePlaywrightStepSequencerStateMock: vi.fn(),
}));

vi.mock('next/dynamic', () => ({
  default: () => () => <div>dynamic-component</div>,
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => useSearchParamsMock(),
}));

vi.mock('@/features/playwright/context/PlaywrightStepSequencerContext', () => ({
  PlaywrightStepSequencerProvider: ({
    children,
  }: {
    children?: React.ReactNode;
  }) => <>{children}</>,
}));

vi.mock('@/features/playwright/hooks/usePlaywrightStepSequencerState', () => ({
  usePlaywrightStepSequencerState: (...args: unknown[]) =>
    usePlaywrightStepSequencerStateMock(...args),
}));

import { AdminPlaywrightStepSequencerPageRuntime } from './AdminPlaywrightStepSequencerPageRuntime';

describe('AdminPlaywrightStepSequencerPageRuntime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSearchParamsMock.mockReturnValue({
      get: (key: string) => (key === 'actionId' ? 'draft-action-1' : null),
    });
    usePlaywrightStepSequencerStateMock.mockReturnValue({
      isSaveActionOpen: false,
      actionDraftName: '',
      actionBlocks: [],
      isSaving: false,
      setIsSaveActionOpen: vi.fn(),
      handleSaveAction: vi.fn(),
    });
  });

  it('passes the actionId query param into the sequencer state bootstrap', () => {
    render(<AdminPlaywrightStepSequencerPageRuntime />);

    expect(usePlaywrightStepSequencerStateMock).toHaveBeenCalledWith({
      initialActionId: 'draft-action-1',
    });
    expect(screen.getByText('dynamic-component')).toBeInTheDocument();
  });
});
