/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { Text } from 'react-native';
import { render, screen, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { KangurMobileI18nProvider } from '../i18n/kangurMobileI18n';
import { useKangurAppBootstrap } from './KangurAppBootstrapContext';

const {
  runAfterInteractionsMock,
  cancelInteractionTaskMock,
  useKangurAppStartupMock,
} = vi.hoisted(() => ({
  runAfterInteractionsMock: vi.fn(),
  cancelInteractionTaskMock: vi.fn(),
  useKangurAppStartupMock: vi.fn(),
}));

vi.mock('react-native', async () => {
  const reactNative = await vi.importActual<typeof import('react-native')>('react-native');

  return {
    ...reactNative,
    InteractionManager: {
      runAfterInteractions: runAfterInteractionsMock,
    },
  };
});

vi.mock('./useKangurAppStartup', () => ({
  useKangurAppStartup: useKangurAppStartupMock,
}));

import { KangurAppBootstrapGate } from './KangurAppBootstrapGate';

const renderGate = () =>
  render(
    <KangurMobileI18nProvider locale='pl'>
      <KangurAppBootstrapGate>
        <Text>Ready content</Text>
      </KangurAppBootstrapGate>
    </KangurMobileI18nProvider>,
  );

function BootstrapBypassProbe(): React.JSX.Element {
  const { consumeInitialRouteBootstrapBypass } = useKangurAppBootstrap();
  const [didBypass] = React.useState(() => consumeInitialRouteBootstrapBypass());

  return <Text>{didBypass ? 'Bypass active' : 'Bypass expired'}</Text>;
}

describe('KangurAppBootstrapGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    useKangurAppStartupMock.mockReturnValue({
      bootError: null,
      hasCachedStartupData: false,
      isAuthResolved: false,
      isBootLoading: true,
    });

    runAfterInteractionsMock.mockImplementation((callback: () => void) => {
      const interactionTimeoutId = setTimeout(callback, 0);
      return {
        cancel: () => {
          clearTimeout(interactionTimeoutId);
          cancelInteractionTaskMock();
        },
      };
    });
  });

  afterEach(() => {
    act(() => {
      vi.runOnlyPendingTimers();
    });
    vi.useRealTimers();
  });

  it('renders the branded bootstrap screen immediately on app boot', () => {
    renderGate();

    expect(screen.getByText('Kangur mobilnie')).toBeTruthy();
    expect(
      screen.getByText('Przygotowujemy logowanie, ostatnie wyniki i dane startowe.'),
    ).toBeTruthy();
    expect(screen.queryByText('Ready content')).toBeNull();
  });

  it('keeps the branded bootstrap screen visible until startup readiness resolves', () => {
    const view = renderGate();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.queryByText('Ready content')).toBeNull();
    expect(screen.getByText('Kangur mobilnie')).toBeTruthy();

    useKangurAppStartupMock.mockReturnValue({
      bootError: null,
      hasCachedStartupData: false,
      isAuthResolved: true,
      isBootLoading: false,
    });

    act(() => {
      view.rerender(
        <KangurMobileI18nProvider locale='pl'>
          <KangurAppBootstrapGate>
            <Text>Ready content</Text>
          </KangurAppBootstrapGate>
        </KangurMobileI18nProvider>,
      );
      vi.runAllTimers();
    });

    expect(screen.getByText('Ready content')).toBeTruthy();
    expect(screen.queryByText('Kangur mobilnie')).toBeNull();
  });

  it('dismisses the branded bootstrap screen after startup is ready and the first interaction frame clears', () => {
    useKangurAppStartupMock.mockReturnValue({
      bootError: null,
      hasCachedStartupData: false,
      isAuthResolved: true,
      isBootLoading: false,
    });

    renderGate();

    act(() => {
      vi.runAllTimers();
    });

    expect(screen.getByText('Ready content')).toBeTruthy();
    expect(screen.queryByText('Kangur mobilnie')).toBeNull();
  });

  it('falls back to the timeout when interactions never resolve', () => {
    useKangurAppStartupMock.mockReturnValue({
      bootError: null,
      hasCachedStartupData: false,
      isAuthResolved: true,
      isBootLoading: false,
    });
    runAfterInteractionsMock.mockImplementation(() => ({
      cancel: cancelInteractionTaskMock,
    }));

    renderGate();

    act(() => {
      vi.advanceTimersByTime(220);
      vi.runAllTimers();
    });

    expect(screen.getByText('Ready content')).toBeTruthy();
    expect(runAfterInteractionsMock).toHaveBeenCalledTimes(1);
  });

  it('fails open when startup readiness never resolves', () => {
    renderGate();

    act(() => {
      vi.advanceTimersByTime(1_800);
      vi.runAllTimers();
    });

    expect(screen.getByText('Ready content')).toBeTruthy();
    expect(screen.queryByText('Kangur mobilnie')).toBeNull();
  });

  it('expires the initial route bypass after the first post-boot commit', () => {
    useKangurAppStartupMock.mockReturnValue({
      bootError: null,
      hasCachedStartupData: false,
      isAuthResolved: true,
      isBootLoading: false,
    });

    const view = renderGate();

    act(() => {
      vi.runAllTimers();
    });

    expect(screen.getByText('Ready content')).toBeTruthy();

    act(() => {
      view.rerender(
        <KangurMobileI18nProvider locale='pl'>
          <KangurAppBootstrapGate>
            <BootstrapBypassProbe />
          </KangurAppBootstrapGate>
        </KangurMobileI18nProvider>,
      );
    });

    expect(screen.getByText('Bypass expired')).toBeTruthy();
  });
});
