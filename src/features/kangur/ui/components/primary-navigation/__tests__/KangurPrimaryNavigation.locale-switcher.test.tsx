
/**
 * @vitest-environment jsdom
 */

import { QueryClientContext } from '@tanstack/react-query';
import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
  CmsStorefrontAppearanceProvider,
  KangurPrimaryNavigation,
  KangurTutorAnchorProvider,
  ageGroupState,
  frontendPublicOwnerMock,
  localeMock,
  locationAssignSpy,
  openLanguageMenu,
  optionalAuthMock,
  optionalTutorMock,
  pathnameMock,
  persistTutorVisibilityHidden,
  prefetchKangurLessonsCatalogMock,
  prefetchKangurPageContentStoreMock,
  prefetchMock,
  pushMock,
  replaceMock,
  routeTransitionStateMock,
  searchParamsMock,
  sessionMock,
  setViewport,
  settingsStoreGetMock,
  setupKangurPrimaryNavigationTest,
  startRouteTransitionMock,
  translationMessages,
  updateSettingMutateAsyncMock,
  useKangurCoarsePointerMock,
  useKangurPageContentEntryMock,
  useKangurSubjectFocusMock,
} from '../KangurPrimaryNavigation.test-support';

describe('KangurPrimaryNavigation', () => {
  setupKangurPrimaryNavigationTest();

it('renders the language switcher inside the utility actions and marks the current locale', async () => {
  localeMock.mockReturnValue('de');
  pathnameMock.mockReturnValue('/de/lessons');

  render(
    <KangurPrimaryNavigation
      basePath='/de'
      currentPage='Lessons'
      isAuthenticated
      onLogout={vi.fn()}
    />
  );

  const utilityActions = screen.getByTestId('kangur-primary-nav-utility-actions');
  const trigger = await screen.findByTestId('kangur-language-switcher-trigger');

  expect(utilityActions).toContainElement(trigger);
  expect(trigger).toHaveClass('min-h-12', 'px-4', 'touch-manipulation');

  await openLanguageMenu(trigger);

  const activeOption = await screen.findByTestId('kangur-language-switcher-option-de');

  expect(activeOption).toHaveAttribute('data-state', 'checked');
  expect(activeOption).toHaveClass('min-h-[3.75rem]', 'touch-manipulation');
  expect(screen.getByRole('menu')).toBeInTheDocument();
});

it('switches to a non-default locale while preserving search params', async () => {
  localeMock.mockReturnValue('pl');
  useKangurCoarsePointerMock.mockReturnValue(false);
  pathnameMock.mockReturnValue('/lessons');
  searchParamsMock.mockReturnValue(new URLSearchParams('mode=solo&difficulty=hard'));

  render(
    <KangurPrimaryNavigation
      basePath='/'
      currentPage='Lessons'
      isAuthenticated
      onLogout={vi.fn()}
    />
  );

  await openLanguageMenu();
  fireEvent.click(await screen.findByTestId('kangur-language-switcher-option-en'));

  await waitFor(() => {
    expect(startRouteTransitionMock).toHaveBeenCalledWith({
      href: '/en/lessons?mode=solo&difficulty=hard',
      pageKey: 'Lessons',
      sourceId: 'kangur-language-switcher',
      transitionKind: 'locale-switch',
    });
    expect(replaceMock).toHaveBeenCalledWith('/en/lessons?mode=solo&difficulty=hard', {
      scroll: false,
    });
  });
  expect(locationAssignSpy).not.toHaveBeenCalled();
  expect(prefetchMock).toHaveBeenCalledWith('/en/lessons?mode=solo&difficulty=hard');
  expect(document.cookie).toContain('NEXT_LOCALE=en');
});

it('canonicalizes /kangur alias routes when Kangur owns the public frontend', async () => {
  frontendPublicOwnerMock.mockReturnValue({ publicOwner: 'kangur' });
  localeMock.mockReturnValue('pl');
  useKangurCoarsePointerMock.mockReturnValue(false);
  pathnameMock.mockReturnValue('/kangur/lessons');
  searchParamsMock.mockReturnValue(new URLSearchParams('mode=solo'));

  render(
    <KangurPrimaryNavigation
      basePath='/kangur'
      currentPage='Lessons'
      isAuthenticated
      onLogout={vi.fn()}
    />
  );

  prefetchMock.mockClear();
  await openLanguageMenu();
  fireEvent.click(await screen.findByTestId('kangur-language-switcher-option-en'));

  await waitFor(() => {
    expect(startRouteTransitionMock).toHaveBeenCalledWith({
      href: '/en/lessons?mode=solo',
      pageKey: 'Lessons',
      sourceId: 'kangur-language-switcher',
      transitionKind: 'locale-switch',
    });
    expect(replaceMock).toHaveBeenCalledWith('/en/lessons?mode=solo', {
      scroll: false,
    });
  });
  expect(locationAssignSpy).not.toHaveBeenCalled();
  expect(prefetchMock).toHaveBeenCalledWith('/en/lessons?mode=solo');
});

it('does not preserve the blocked GamesLibrary pathname in locale-switch links for non-super-admin users', async () => {
  localeMock.mockReturnValue('pl');
  useKangurCoarsePointerMock.mockReturnValue(false);
  pathnameMock.mockReturnValue('/kangur/games');
  searchParamsMock.mockReturnValue(new URLSearchParams());
  sessionMock.mockReturnValue({
    data: {
      expires: '2026-12-31T23:59:59.000Z',
      user: {
        email: 'admin@example.com',
        id: 'admin-1',
        image: null,
        name: 'Admin',
        role: 'admin',
      },
    },
    status: 'authenticated',
  });

  render(
    <KangurPrimaryNavigation
      basePath='/kangur'
      currentPage='Game'
      forceLanguageSwitcherFallbackPath
      isAuthenticated
      onLogout={vi.fn()}
    />
  );

  expect(screen.queryByTestId('kangur-primary-nav-games-library')).toBeNull();

  await openLanguageMenu();
  fireEvent.click(await screen.findByTestId('kangur-language-switcher-option-en'));

  await waitFor(() => {
    expect(startRouteTransitionMock).toHaveBeenCalledWith({
      href: '/en/kangur',
      pageKey: 'Game',
      sourceId: 'kangur-language-switcher',
      transitionKind: 'locale-switch',
    });
    expect(replaceMock).toHaveBeenCalledWith('/en/kangur', {
      scroll: false,
    });
  });
});

it('drops the locale prefix when switching back to the default locale', async () => {
  localeMock.mockReturnValue('en');
  useKangurCoarsePointerMock.mockReturnValue(false);
  pathnameMock.mockReturnValue('/en/duels');

  render(
    <KangurPrimaryNavigation
      basePath='/en'
      currentPage='Duels'
      isAuthenticated
      onLogout={vi.fn()}
    />
  );

  prefetchMock.mockClear();
  await openLanguageMenu();
  fireEvent.click(await screen.findByTestId('kangur-language-switcher-option-pl'));

  await waitFor(() => {
    expect(startRouteTransitionMock).toHaveBeenCalledWith({
      href: '/duels',
      pageKey: 'Duels',
      sourceId: 'kangur-language-switcher',
      transitionKind: 'locale-switch',
    });
    expect(replaceMock).toHaveBeenCalledWith('/duels', {
      scroll: false,
    });
  });
  expect(locationAssignSpy).not.toHaveBeenCalled();
  expect(prefetchMock).toHaveBeenCalledWith('/duels');
});

it('uses managed locale switching when returning to Polish from an unprefixed English lessons route', async () => {
  localeMock.mockReturnValue('en');
  pathnameMock.mockReturnValue('/lessons');

  render(
    <KangurPrimaryNavigation
      basePath='/'
      currentPage='Lessons'
      isAuthenticated
      onLogout={vi.fn()}
    />
  );

  prefetchMock.mockClear();
  replaceMock.mockClear();

  await openLanguageMenu();
  fireEvent.click(await screen.findByTestId('kangur-language-switcher-option-pl'));

  await waitFor(() => {
    expect(startRouteTransitionMock).toHaveBeenCalledWith({
      href: '/lessons',
      pageKey: 'Lessons',
      sourceId: 'kangur-language-switcher',
      transitionKind: 'locale-switch',
    });
    expect(replaceMock).toHaveBeenCalledWith('/lessons', {
      scroll: false,
    });
  });
  expect(locationAssignSpy).not.toHaveBeenCalled();
  expect(prefetchMock).toHaveBeenCalledWith('/lessons');
  expect(document.cookie).toContain('NEXT_LOCALE=pl');
});

it('does not prefetch the default locale target when opening the menu from a non-default locale', async () => {
  localeMock.mockReturnValue('en');
  useKangurCoarsePointerMock.mockReturnValue(false);
  pathnameMock.mockReturnValue('/en/lessons');
  const queryClient = { prefetchQuery: vi.fn() };

  render(
    <QueryClientContext.Provider value={queryClient as never}>
      <KangurPrimaryNavigation
        basePath='/en'
        currentPage='Lessons'
        isAuthenticated
        onLogout={vi.fn()}
      />
    </QueryClientContext.Provider>
  );

  prefetchMock.mockClear();
  prefetchKangurPageContentStoreMock.mockClear();

  await openLanguageMenu();
  await screen.findByRole('menu');

  expect(prefetchMock).not.toHaveBeenCalled();
  expect(prefetchKangurPageContentStoreMock).not.toHaveBeenCalled();
});

it('does not warm the locale route or page content before switching', async () => {
  localeMock.mockReturnValue('pl');
  useKangurCoarsePointerMock.mockReturnValue(false);
  pathnameMock.mockReturnValue('/lessons');
  const queryClient = { prefetchQuery: vi.fn() };

  render(
    <QueryClientContext.Provider value={queryClient as never}>
      <KangurPrimaryNavigation
        basePath='/'
        currentPage='Lessons'
        isAuthenticated
        onLogout={vi.fn()}
      />
    </QueryClientContext.Provider>
  );

  await openLanguageMenu();
  const englishOption = await screen.findByTestId('kangur-language-switcher-option-en');
  prefetchMock.mockClear();
  prefetchKangurPageContentStoreMock.mockClear();

  fireEvent.mouseEnter(englishOption);
  fireEvent.focus(englishOption);
  fireEvent.click(englishOption);

  await waitFor(() => {
    expect(startRouteTransitionMock).toHaveBeenCalledWith({
      href: '/en/lessons',
      pageKey: 'Lessons',
      sourceId: 'kangur-language-switcher',
      transitionKind: 'locale-switch',
    });
    expect(replaceMock).toHaveBeenCalledWith('/en/lessons', {
      scroll: false,
    });
  });
  expect(locationAssignSpy).not.toHaveBeenCalled();
  expect(prefetchMock).toHaveBeenCalledWith('/en/lessons');
  expect(prefetchKangurPageContentStoreMock).not.toHaveBeenCalled();
});

it('keeps the language trigger pinned to the pending locale while the locale route is still resolving', async () => {
  localeMock.mockReturnValue('en');
  pathnameMock.mockReturnValue('/lessons');
  routeTransitionStateMock.mockReturnValue({
    activeTransitionKind: 'locale-switch',
    activeTransitionPageKey: 'Lessons',
    activeTransitionRequestedHref: '/lessons',
    activeTransitionSkeletonVariant: 'lessons-library',
    activeTransitionSourceId: 'kangur-language-switcher',
    isRouteAcknowledging: false,
    isRoutePending: false,
    isRouteRevealing: false,
    isRouteWaitingForReady: true,
    pendingPageKey: null,
    transitionPhase: 'waiting_for_ready',
  });

  render(
    <KangurPrimaryNavigation
      basePath='/en'
      currentPage='Lessons'
      isAuthenticated
      onLogout={vi.fn()}
    />
  );

  const trigger = await screen.findByTestId('kangur-language-switcher-trigger');

  expect(trigger).toBeDisabled();
  expect(trigger).toHaveTextContent('Polski');
});

it('pins the language switcher to the pending target locale until the new locale route mounts', async () => {
  localeMock.mockReturnValue('en');
  pathnameMock.mockReturnValue('/en/lessons');
  routeTransitionStateMock.mockReturnValue({
    activeTransitionKind: 'locale-switch',
    activeTransitionPageKey: 'Lessons',
    activeTransitionRequestedHref: '/de/lessons',
    activeTransitionSkeletonVariant: 'lessons-library',
    activeTransitionSourceId: 'kangur-language-switcher',
    isRouteAcknowledging: false,
    isRoutePending: false,
    isRouteRevealing: false,
    isRouteWaitingForReady: true,
    pendingPageKey: null,
    transitionPhase: 'waiting_for_ready',
  });

  render(
    <KangurPrimaryNavigation
      basePath='/en'
      currentPage='Lessons'
      isAuthenticated
      onLogout={vi.fn()}
    />
  );

  const trigger = await screen.findByTestId('kangur-language-switcher-trigger');

  expect(trigger).toHaveTextContent('Deutsch');
  expect(trigger).toHaveAttribute('title', 'Language: Deutsch');

  expect(trigger).toBeDisabled();
});

it('translates the desktop section labels and chooser copy for English locale', () => {
  localeMock.mockReturnValue('en');
  pathnameMock.mockReturnValue('/en/lessons');

  render(
    <KangurPrimaryNavigation
      basePath='/en'
      canManageLearners
      currentPage='Lessons'
      isAuthenticated
      onLogout={vi.fn()}
    />
  );

  expect(screen.getByRole('link', { name: 'Home page' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Lessons' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Duels' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Parent' })).toBeInTheDocument();

  const subjectButton = screen.getByRole('button', { name: 'Choose subject' });
  const ageGroupButton = screen.getByRole('button', { name: 'Choose age group' });

  expect(subjectButton).toHaveAttribute('title', 'Current subject: Maths');
  expect(ageGroupButton).toHaveAttribute('title', 'Current age group: Age 10');
});

it('uses icon-first subject and age-group cues for six-year-old learners', async () => {
  ageGroupState.value = 'six_year_old';
  useKangurSubjectFocusMock.mockReturnValue({
    subject: 'music',
    setSubject: vi.fn(),
    subjectKey: 'learner-1',
  });
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  try {
    render(
      <KangurPrimaryNavigation
        basePath='/kangur'
        currentPage='Lessons'
        isAuthenticated
        onLogout={vi.fn()}
      />
    );

    expect(screen.getByTestId('kangur-primary-nav-lessons-icon')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-primary-nav-subject-icon')).toHaveTextContent('🎵');
    expect(screen.getByTestId('kangur-primary-nav-subject-detail')).toHaveTextContent('👂');
    expect(screen.getByTestId('kangur-primary-nav-age-group-icon')).toHaveTextContent('🐣');
    expect(screen.getByTestId('kangur-primary-nav-age-group-detail')).toHaveTextContent('6');

    fireEvent.click(screen.getByTestId('kangur-primary-nav-subject'));

    expect(
      await screen.findByTestId('kangur-primary-nav-subject-option-icon-music')
    ).toHaveTextContent(
      '🎵'
    );
    expect(
      screen.getByTestId('kangur-primary-nav-subject-option-detail-music')
    ).toHaveTextContent(
      '👂'
    );
    const subjectDialog = await screen.findByRole('dialog');
    within(subjectDialog)
      .getAllByTestId('kangur-primary-nav-subject-modal-title-icon')
      .forEach((icon) => {
        expect(icon).toHaveTextContent('📚');
      });

    const loggedOutput = consoleErrorSpy.mock.calls
      .flatMap((call) => call.map((value) => String(value)))
      .join('\n');
    expect(loggedOutput).not.toContain('`DialogContent` requires a `DialogTitle`');
    expect(loggedOutput).not.toContain('Missing `Description`');
  } finally {
    consoleErrorSpy.mockRestore();
  }
});

it('does not prefetch the Duels route from the primary navigation before entry', () => {
  localeMock.mockReturnValue('en');
  pathnameMock.mockReturnValue('/en/lessons');

  render(
    <KangurPrimaryNavigation
      basePath='/en'
      canManageLearners
      currentPage='Lessons'
      isAuthenticated
      onLogout={vi.fn()}
    />
  );

  expect(prefetchMock).not.toHaveBeenCalledWith('/en/duels');
});

it('translates the mobile section labels for German locale', async () => {
  setViewport({ width: 390, matches: true });
  localeMock.mockReturnValue('de');
  pathnameMock.mockReturnValue('/de/lessons');

  render(
    <KangurPrimaryNavigation
      basePath='/de'
      canManageLearners
      currentPage='Lessons'
      isAuthenticated
      onLogout={vi.fn()}
    />
  );

  fireEvent.click(screen.getByTestId('kangur-primary-nav-mobile-toggle'));

  expect(screen.getByRole('link', { name: 'Startseite' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Lektionen' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Duelle' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Eltern' })).toBeInTheDocument();
});

it('uses theme-aware language menu colors and keeps the menu container clipped', async () => {
  localeMock.mockReturnValue('en');
  pathnameMock.mockReturnValue('/en/lessons');

  render(
    <CmsStorefrontAppearanceProvider initialMode='dark'>
      <KangurPrimaryNavigation
        basePath='/en'
        currentPage='Lessons'
        isAuthenticated
        onLogout={vi.fn()}
      />
    </CmsStorefrontAppearanceProvider>
  );

  await openLanguageMenu();

  const menu = await screen.findByTestId('kangur-language-switcher-menu');
  const menuContainer = await screen.findByTestId('kangur-language-switcher-menu-container');
  const options = await screen.findByTestId('kangur-language-switcher-options');
  const polishOption = await screen.findByTestId('kangur-language-switcher-option-pl');
  const germanOption = await screen.findByTestId('kangur-language-switcher-option-de');
  const option = await screen.findByTestId('kangur-language-switcher-option-en');
  const optionLabel = within(option).getByText('English');

  expect(menu.style.getPropertyValue('--kangur-language-menu-bg')).toBe('#1a1f38');
  expect(menu.style.getPropertyValue('--kangur-language-menu-text')).toBe('#f8fafc');
  expect(menu.style.getPropertyValue('--kangur-language-menu-hover-text')).toBe('');
  expect(menu.style.getPropertyValue('--kangur-language-menu-active-text')).toBe('');
  expect(menu.style.overflow).toBe('hidden');
  expect(menu.className).toContain('w-fit');
  expect(menu.className).not.toContain('min-w-[13rem]');
  expect(menuContainer).toHaveClass('rounded-[20px]', 'p-1');
  expect(options).toHaveClass('flex', 'flex-col', 'gap-1.5');
  expect(option.className).toContain('cursor-pointer');
  expect(option.className).toContain('data-[state=checked]:cursor-default');
  expect(option.className).toContain('py-2.5');
  expect(option.className).toContain('pl-3.5');
  expect(option.className).toContain('[color:var(--kangur-language-menu-text)]');
  expect(option.className).toContain('data-[highlighted]:[color:var(--kangur-language-menu-text)]');
  expect(option.className).toContain('data-[state=checked]:[color:var(--kangur-language-menu-text)]');
  expect(option.className).toContain('[&>span:first-child]:hidden');
  expect(option.className).not.toContain('hover:[color:var(--kangur-language-menu-hover-text)]');
  expect(option.className).not.toContain('focus:[color:var(--kangur-language-menu-hover-text)]');
  expect(option.className).not.toContain(
    'data-[state=checked]:[color:var(--kangur-language-menu-active-text)]'
  );
  expect(option.className).not.toContain('text-[11px]');
  expect(option.className).not.toContain('text-slate-');
  expect(optionLabel).toHaveStyle({ color: 'var(--kangur-language-menu-text)' });
  expect(within(polishOption).queryByText('Polish')).toBeNull();
  expect(within(germanOption).queryByText('German')).toBeNull();
});

it('locks the language dropdown visual contract across the trigger and every locale row', async () => {
  localeMock.mockReturnValue('pl');
  pathnameMock.mockReturnValue('/lessons');

  render(
    <KangurPrimaryNavigation
      basePath='/'
      currentPage='Lessons'
      isAuthenticated
      onLogout={vi.fn()}
    />
  );

  const trigger = await screen.findByTestId('kangur-language-switcher-trigger');
  const triggerLabel = within(trigger).getByText('Polski');
  const triggerFlagShell = trigger.querySelector('span[aria-hidden="true"]');
  const triggerChevron = trigger.querySelector('svg.lucide-chevron-down');

  expect(trigger).toHaveClass(
    'min-w-[8.75rem]',
    'shrink-0',
    'overflow-hidden',
    'gap-2',
    'min-h-12',
    'px-4',
    'touch-manipulation'
  );
  expect(trigger.className).not.toContain('sm:w-[11rem]');
  expect(trigger).toHaveAttribute('title', 'Język: Polski');
  expect(triggerLabel).toHaveClass('flex-1', 'truncate', 'text-sm', 'font-semibold');
  expect(triggerFlagShell).not.toBeNull();
  expect(triggerFlagShell).toHaveClass('h-[1.15rem]', 'w-[1.7rem]', 'rounded-[6px]');
  expect(triggerFlagShell?.querySelector('svg')).not.toBeNull();
  expect(triggerChevron).not.toBeNull();
  expect(triggerChevron).not.toHaveClass('ml-auto');

  await openLanguageMenu(trigger);

  const menu = await screen.findByTestId('kangur-language-switcher-menu');
  const menuContainer = await screen.findByTestId('kangur-language-switcher-menu-container');
  const options = await screen.findByTestId('kangur-language-switcher-options');
  const rows = [
    await screen.findByTestId('kangur-language-switcher-option-pl'),
    await screen.findByTestId('kangur-language-switcher-option-en'),
    await screen.findByTestId('kangur-language-switcher-option-de'),
    await screen.findByTestId('kangur-language-switcher-option-uk'),
  ];
  const labels = ['Polski', 'English', 'Deutsch', 'Українська'] as const;

  expect(menu).toHaveClass(
    'w-fit',
    'max-w-[calc(100vw-1rem)]',
    'overflow-hidden',
    'rounded-[26px]',
    'p-2'
  );
  expect(menuContainer).toHaveClass('rounded-[20px]', 'p-1');
  expect(options).toHaveClass('flex', 'flex-col', 'gap-1.5');
  expect(rows).toHaveLength(labels.length);
  expect(rows.map((row) => row.textContent?.trim())).toEqual(labels);

  rows.forEach((row, index) => {
    const label = within(row).getByText(labels[index]);
    const flagShell = row.querySelector('div > span[aria-hidden="true"]');

    expect(row).toHaveClass(
      'min-h-[3.75rem]',
      'rounded-[18px]',
      'py-2.5',
      'pl-3.5',
      'pr-3.5',
      'text-left',
      'touch-manipulation'
    );
    expect(row.className).toContain('cursor-pointer');
    expect(row.className).toContain('data-[state=checked]:cursor-default');
    expect(row.className).toContain('[&>span:first-child]:hidden');
    expect(flagShell).not.toBeNull();
    expect(flagShell).toHaveClass('h-5', 'w-7', 'rounded-[7px]');
    expect(flagShell?.querySelector('svg')).not.toBeNull();
    expect(label).toHaveClass('truncate', 'text-sm', 'font-semibold');
    expect(label).toHaveStyle({ color: 'var(--kangur-language-menu-text)' });
  });

  expect(rows[0]).toHaveAttribute('data-state', 'checked');
  expect(within(rows[0]).queryByText('Polish')).toBeNull();
  expect(within(rows[1]).queryByText('English')).not.toBeNull();
  expect(within(rows[2]).queryByText('German')).toBeNull();
  expect(within(rows[3]).queryByText('Ukrainian')).toBeNull();
});

it('places the language selector left of the appearance toggle in the mobile menu header', async () => {
  setViewport({ width: 390, matches: true });
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  try {
    render(
      <CmsStorefrontAppearanceProvider initialMode='default'>
        <KangurPrimaryNavigation
          basePath='/kangur'
          currentPage='Lessons'
          isAuthenticated
          onLogout={vi.fn()}
        />
      </CmsStorefrontAppearanceProvider>
    );

    fireEvent.click(screen.getByTestId('kangur-primary-nav-mobile-toggle'));

    const header = screen.getByTestId('kangur-primary-nav-mobile-header');
    const headerActions = screen.getByTestId('kangur-primary-nav-mobile-header-actions');
    const utilityActions = screen.getByTestId('kangur-primary-nav-mobile-utility-actions');
    const mobileMenuDialog = screen.getByRole('dialog');
    const headerScope = within(header);
    const mobileToggle = screen.getByTestId('kangur-primary-nav-mobile-toggle');
    const trigger = within(headerActions).getByTestId('kangur-language-switcher-trigger');
    const themeToggle = headerScope.getByRole('button', { name: 'Switch to Dawn theme' });
    const lessonsAction = within(mobileMenuDialog).getByTestId('kangur-primary-nav-lessons');

    expect(trigger).toBeInTheDocument();
    expect(themeToggle).toBeInTheDocument();
    expect(mobileToggle).toHaveClass('min-h-12');
    expect(lessonsAction).toHaveClass('max-sm:min-h-12', 'max-sm:px-4');
    expect(headerActions.firstElementChild).toBe(trigger);
    expect(headerActions).toContainElement(trigger);
    expect(headerActions).toContainElement(themeToggle);
    expect(mobileMenuDialog.className).toContain(
      'var(--kangur-mobile-bottom-clearance,env(safe-area-inset-bottom))+32px'
    );
    expect(within(utilityActions).queryByTestId('kangur-language-switcher-trigger')).toBeNull();
    expect(headerScope.getByRole('button', { name: /zamknij menu/i })).toHaveClass(
      'inline-flex',
      'items-center',
      'justify-center',
      'leading-none'
    );

    const loggedOutput = consoleErrorSpy.mock.calls
      .flatMap((call) => call.map((value) => String(value)))
      .join('\n');
    expect(loggedOutput).not.toContain('`DialogContent` requires a `DialogTitle`');
    expect(loggedOutput).not.toContain('Missing `Description`');
  } finally {
    consoleErrorSpy.mockRestore();
  }
});

});
