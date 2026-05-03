/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { KANGUR_CMS_PROJECT_SETTING_KEY } from '@/features/kangur/cms-builder/project-contracts';
import { GAME_HOME_SECONDARY_DATA_IDLE_DELAY_MS } from '@/features/kangur/ui/pages/GameHome.constants';
import { clearLatchedKangurTopBarHeightCssValue } from '@/features/kangur/ui/utils/readKangurTopBarHeightCssValue';
import {
  authStateMock,
  routeNavigatorMock,
  routingStateMock,
  settingsStoreStateMock,
  setupKangurFeatureAppTest,
  topNavigationHostVisibleMock,
  useKangurDeferredStandaloneHomeReadyMock,
} from '@/features/kangur/ui/KangurFeatureApp.test-support';

const BOOT_SKELETON_MIN_VISIBLE_MS = 50;

let KangurFeatureApp: typeof import('@/features/kangur/ui/KangurFeatureApp').KangurFeatureApp;

describe('KangurFeatureApp auth and theme loading', () => {
  beforeEach(async () => {
    KangurFeatureApp = await setupKangurFeatureAppTest();
  });

  afterEach(() => {
    cleanup();
    clearLatchedKangurTopBarHeightCssValue();
    document.documentElement.style.removeProperty('--kangur-top-bar-height');
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('keeps core routes visible during boot loading states', () => {
    authStateMock.mockReturnValue({
      isLoadingAuth: true,
      isLoadingPublicSettings: false,
      authError: null,
      navigateToLogin: vi.fn(),
      isAuthenticated: true,
    });
    routingStateMock.mockReturnValue({
      pageKey: 'Game',
      embedded: false,
      requestedPath: '/kangur',
      basePath: '/kangur',
    });

    render(<KangurFeatureApp />);

    expect(screen.getByTestId('kangur-route-content')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-route-content')).toHaveAttribute(
      'data-route-capture-ready',
      'false'
    );
    expect(screen.queryByTestId('kangur-app-loader')).toBeNull();
    expect(screen.queryByTestId('kangur-page-transition-skeleton')).toBeNull();
  });

  it('redirects anonymous users away from the parent dashboard route', async () => {
    authStateMock.mockReturnValue({
      hasResolvedAuth: true,
      isLoadingAuth: false,
      isLoadingPublicSettings: false,
      authError: null,
      navigateToLogin: vi.fn(),
      isAuthenticated: false,
    });
    routingStateMock.mockReturnValue({
      pageKey: 'ParentDashboard',
      embedded: false,
      requestedPath: '/parent-dashboard',
      basePath: '/',
    });

    render(<KangurFeatureApp />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(routeNavigatorMock.replace).toHaveBeenCalledWith('/', {
      pageKey: 'Game',
      sourceId: 'kangur-auth:redirect-parent-dashboard',
    });
  });

  it('does not redirect away from the parent dashboard while auth is still unresolved', async () => {
    authStateMock.mockReturnValue({
      hasResolvedAuth: false,
      isLoadingAuth: false,
      isLoadingPublicSettings: false,
      authError: null,
      navigateToLogin: vi.fn(),
      isAuthenticated: false,
    });
    routingStateMock.mockReturnValue({
      pageKey: 'ParentDashboard',
      embedded: false,
      requestedPath: '/parent-dashboard',
      basePath: '/',
    });

    render(<KangurFeatureApp />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(routeNavigatorMock.replace).not.toHaveBeenCalled();
    expect(screen.getByTestId('kangur-route-content')).toBeInTheDocument();
  });

  it('does not render the app loader over visible route content during theme loading', async () => {
    settingsStoreStateMock.mockReturnValue({
      map: new Map(),
      isLoading: true,
      isFetching: false,
      error: null,
      get: vi.fn(),
      getBoolean: vi.fn(),
      getNumber: vi.fn(),
      refetch: vi.fn(),
    });

    render(<KangurFeatureApp />);

    // Advance past the initial mount settling frame
    await act(async () => {
      vi.runAllTimers();
    });

    expect(screen.queryByTestId('kangur-app-loader')).toBeNull();
    expect(screen.queryByTestId('kangur-top-navigation-skeleton')).toBeNull();
    expect(screen.getByTestId('kangur-top-navigation-host')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-route-content')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-page-lessons')).toBeInTheDocument();
  });

  it('renders the navbar skeleton instead of the app loader when top navigation is still unregistered during theme loading', async () => {
    topNavigationHostVisibleMock.mockReturnValue(false);
    settingsStoreStateMock.mockReturnValue({
      map: new Map(),
      isLoading: true,
      isFetching: false,
      error: null,
      get: vi.fn(),
      getBoolean: vi.fn(),
      getNumber: vi.fn(),
      refetch: vi.fn(),
    });

    render(<KangurFeatureApp />);

    // Advance past the initial mount settling frame
    await act(async () => {
      vi.runAllTimers();
    });

    expect(screen.getByTestId('kangur-top-navigation-skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('kangur-top-navigation-host')).toBeNull();
    expect(screen.queryByTestId('kangur-app-loader')).toBeNull();
    expect(screen.getByTestId('kangur-route-content')).toBeInTheDocument();
  });

  it('keeps the navbar skeleton mounted for standalone routes even when route content is temporarily null', async () => {
    topNavigationHostVisibleMock.mockReturnValue(false);
    authStateMock.mockReturnValue({
      hasResolvedAuth: true,
      isLoadingAuth: false,
      isLoadingPublicSettings: false,
      authError: null,
      navigateToLogin: vi.fn(),
      isAuthenticated: false,
    });
    routingStateMock.mockReturnValue({
      pageKey: 'ParentDashboard',
      embedded: false,
      requestedPath: '/parent-dashboard',
      basePath: '/',
    });

    render(<KangurFeatureApp />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByTestId('kangur-top-navigation-skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('kangur-route-content')).toBeNull();
  });

  it('keeps route content visible while cached theme settings are refreshing', () => {
    routingStateMock.mockReturnValue({
      pageKey: 'Game',
      embedded: false,
      requestedPath: '/kangur',
      basePath: '/kangur',
    });

    settingsStoreStateMock.mockReturnValue({
      map: new Map(),
      isLoading: false,
      isFetching: true,
      error: null,
      get: vi.fn(),
      getBoolean: vi.fn(),
      getNumber: vi.fn(),
      refetch: vi.fn(),
    });

    render(<KangurFeatureApp />);

    expect(screen.queryByTestId('kangur-app-loader')).toBeNull();
    expect(screen.getByTestId('kangur-route-content')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-page-game')).toBeInTheDocument();
  });

  it('switches to the CMS runtime screen when the project setting arrives after initial loading', () => {
    const rawCmsProject = JSON.stringify({
      screens: {
        Game: { components: [] },
        Lessons: { components: [] },
        LearnerProfile: { components: [] },
        ParentDashboard: { components: [] },
      },
    });
    let currentRawProject: string | undefined;
    let currentIsLoading = true;

    settingsStoreStateMock.mockImplementation(() => ({
      map: new Map(),
      isLoading: currentIsLoading,
      isFetching: false,
      error: null,
      get: vi.fn((key: string) =>
        key === KANGUR_CMS_PROJECT_SETTING_KEY ? currentRawProject : undefined
      ),
      getBoolean: vi.fn(),
      getNumber: vi.fn(),
      refetch: vi.fn(),
    }));

    const { rerender } = render(<KangurFeatureApp />);

    expect(screen.queryByTestId('kangur-cms-runtime-screen')).toBeNull();
    expect(screen.getByTestId('kangur-page-lessons')).toBeInTheDocument();

    currentRawProject = rawCmsProject;
    currentIsLoading = false;
    rerender(<KangurFeatureApp />);

    expect(screen.getByTestId('kangur-route-content')).toBeInTheDocument();
    expect(screen.queryByTestId('kangur-page-lessons')).toBeNull();
  });

  it('dismisses the boot skeleton after the 50ms minimum visibility elapses', async () => {
    // To make the boot loader visible, route content must be null. This happens
    // when shouldBlockRouteContent is true (anonymous user on ParentDashboard)
    // AND the theme is still loading.
    authStateMock.mockReturnValue({
      hasResolvedAuth: true,
      isLoadingAuth: false,
      isLoadingPublicSettings: false,
      authError: null,
      navigateToLogin: vi.fn(),
      isAuthenticated: false,
    });
    routingStateMock.mockReturnValue({
      pageKey: 'ParentDashboard',
      embedded: false,
      requestedPath: '/parent-dashboard',
      requestedHref: '/parent-dashboard',
      basePath: '/',
    });
    settingsStoreStateMock.mockReturnValue({
      map: new Map(),
      isLoading: true,
      isFetching: false,
      error: null,
      get: vi.fn(),
      getBoolean: vi.fn(),
      getNumber: vi.fn(),
      refetch: vi.fn(),
    });
    topNavigationHostVisibleMock.mockReturnValue(false);

    const { rerender } = render(<KangurFeatureApp />);

    // Advance past the initial mount settling frame so boot loader can appear
    await act(async () => {
      vi.runAllTimers();
    });

    // Boot loader should be visible: theme loading + no visible route content
    expect(screen.getByTestId('kangur-app-loader')).toBeInTheDocument();

    // Simulate theme settings finished loading
    settingsStoreStateMock.mockReturnValue({
      map: new Map(),
      isLoading: false,
      isFetching: false,
      error: null,
      get: vi.fn(),
      getBoolean: vi.fn(),
      getNumber: vi.fn(),
      refetch: vi.fn(),
    });
    rerender(<KangurFeatureApp />);

    // Advance past the 50ms minimum visibility
    await act(async () => {
      vi.advanceTimersByTime(BOOT_SKELETON_MIN_VISIBLE_MS);
    });

    // After the minimum visibility, boot loader should be gone
    expect(screen.queryByTestId('kangur-app-loader')).toBeNull();
  });

  it('defers the AI Tutor widget on the initial standalone home route', async () => {
    routingStateMock.mockReturnValue({
      pageKey: 'Game',
      embedded: false,
      requestedPath: '/kangur',
      requestedHref: '/kangur',
      basePath: '/kangur',
    });
    let isStandaloneHomeReady = false;
    useKangurDeferredStandaloneHomeReadyMock.mockImplementation(() => isStandaloneHomeReady);

    const { rerender } = render(<KangurFeatureApp />);

    expect(screen.queryByTestId('kangur-ai-tutor-widget')).toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(GAME_HOME_SECONDARY_DATA_IDLE_DELAY_MS - 1);
    });

    expect(screen.queryByTestId('kangur-ai-tutor-widget')).toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
      isStandaloneHomeReady = true;
      rerender(<KangurFeatureApp />);
    });

    expect(screen.getByTestId('kangur-ai-tutor-widget')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-route-content')).toBeInTheDocument();
  });

  it('renders the AI Tutor widget immediately on non-home routes', () => {
    render(<KangurFeatureApp />);

    expect(screen.getByTestId('kangur-ai-tutor-widget')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-route-content')).toBeInTheDocument();
  });

  it('keeps the AI Tutor widget mounted when navigating back to home after an initial non-home route', () => {
    const currentRoutingState = {
      pageKey: 'Lessons',
      embedded: false,
      requestedPath: '/kangur/lessons',
      requestedHref: '/kangur/lessons',
      basePath: '/kangur',
    };
    routingStateMock.mockImplementation(() => currentRoutingState);

    const { rerender } = render(<KangurFeatureApp />);

    expect(screen.getByTestId('kangur-ai-tutor-widget')).toBeInTheDocument();

    currentRoutingState.pageKey = 'Game';
    currentRoutingState.requestedPath = '/kangur';
    currentRoutingState.requestedHref = '/kangur';
    rerender(<KangurFeatureApp />);

    expect(screen.getByTestId('kangur-ai-tutor-widget')).toBeInTheDocument();
  });
});
