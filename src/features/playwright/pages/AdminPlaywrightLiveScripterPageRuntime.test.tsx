// @vitest-environment jsdom

import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  useSearchParamsMock,
  usePlaywrightStepSequencerStateMock,
  liveScripterPanelPropsMock,
} = vi.hoisted(() => ({
  useSearchParamsMock: vi.fn(),
  usePlaywrightStepSequencerStateMock: vi.fn(),
  liveScripterPanelPropsMock: vi.fn(),
}));

vi.mock('next/dynamic', () => ({
  default: () => (props: unknown) => {
    liveScripterPanelPropsMock(props);
    return <div>live-scripter-panel</div>;
  },
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

import { AdminPlaywrightLiveScripterPageRuntime } from './AdminPlaywrightLiveScripterPageRuntime';

describe('AdminPlaywrightLiveScripterPageRuntime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSearchParamsMock.mockReturnValue({
      get: (key: string) =>
        (
          {
            url: 'https://example.com',
            websiteId: 'website-1',
            flowId: 'flow-2',
            personaId: 'persona-3',
          } as Record<string, string | null>
        )[key] ?? null,
    });
    usePlaywrightStepSequencerStateMock.mockReturnValue({});
  });

  it('passes search-param defaults into the live scripter panel', () => {
    render(<AdminPlaywrightLiveScripterPageRuntime />);

    expect(usePlaywrightStepSequencerStateMock).toHaveBeenCalledWith();
    expect(liveScripterPanelPropsMock).toHaveBeenCalledWith({
      initialUrl: 'https://example.com',
      initialWebsiteId: 'website-1',
      initialFlowId: 'flow-2',
      initialPersonaId: 'persona-3',
    });
    expect(screen.getByText('live-scripter-panel')).toBeInTheDocument();
  });
});
