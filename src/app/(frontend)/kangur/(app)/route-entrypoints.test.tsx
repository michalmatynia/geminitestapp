/**
 * @vitest-environment node
 */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { renderAccessibleKangurAliasRouteMock } = vi.hoisted(() => ({
  renderAccessibleKangurAliasRouteMock: vi.fn(),
}));

vi.mock('@/features/kangur/server', () => ({
  renderAccessibleKangurAliasRoute: renderAccessibleKangurAliasRouteMock,
}));

vi.mock('@/features/kangur/server/alias-shell-page', () => ({
  renderAccessibleKangurAliasRoute: renderAccessibleKangurAliasRouteMock,
}));

import RootPage from '@/app/(frontend)/kangur/(app)/page';
import DuelsPage from '@/app/(frontend)/kangur/(app)/duels/page';
import LessonsPage from '@/app/(frontend)/kangur/(app)/lessons/page';
import TestsPage from '@/app/(frontend)/kangur/(app)/tests/page';
import LocalizedRootPage from '@/app/[locale]/(frontend)/kangur/(app)/page';
import LocalizedDuelsPage from '@/app/[locale]/(frontend)/kangur/(app)/duels/page';
import LocalizedLessonsPage from '@/app/[locale]/(frontend)/kangur/(app)/lessons/page';
import LocalizedTestsPage from '@/app/[locale]/(frontend)/kangur/(app)/tests/page';

describe('kangur route entrypoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    renderAccessibleKangurAliasRouteMock.mockReturnValue(<div data-testid='alias-route' />);
  });

  it('renders the default kangur entrypoint synchronously', () => {
    const result = RootPage();

    expect(result).not.toBeInstanceOf(Promise);
    expect(React.isValidElement(result)).toBe(true);
    expect(renderAccessibleKangurAliasRouteMock).toHaveBeenCalledWith([]);
  });

  it('renders the duels entrypoint synchronously', () => {
    const result = DuelsPage();

    expect(result).not.toBeInstanceOf(Promise);
    expect(React.isValidElement(result)).toBe(true);
    expect(renderAccessibleKangurAliasRouteMock).toHaveBeenCalledWith(['duels']);
  });

  it('renders the lessons entrypoint synchronously', () => {
    const result = LessonsPage();

    expect(result).not.toBeInstanceOf(Promise);
    expect(React.isValidElement(result)).toBe(true);
    expect(renderAccessibleKangurAliasRouteMock).toHaveBeenCalledWith(['lessons']);
  });

  it('renders the tests entrypoint synchronously', () => {
    const result = TestsPage();

    expect(result).not.toBeInstanceOf(Promise);
    expect(React.isValidElement(result)).toBe(true);
    expect(renderAccessibleKangurAliasRouteMock).toHaveBeenCalledWith(['tests']);
  });

  it('renders the localized default kangur entrypoint synchronously', () => {
    const result = LocalizedRootPage();

    expect(result).not.toBeInstanceOf(Promise);
    expect(React.isValidElement(result)).toBe(true);
    expect(renderAccessibleKangurAliasRouteMock).toHaveBeenCalledWith([]);
  });

  it('renders the localized duels entrypoint synchronously', () => {
    const result = LocalizedDuelsPage();

    expect(result).not.toBeInstanceOf(Promise);
    expect(React.isValidElement(result)).toBe(true);
    expect(renderAccessibleKangurAliasRouteMock).toHaveBeenCalledWith(['duels']);
  });

  it('renders the localized lessons entrypoint synchronously', () => {
    const result = LocalizedLessonsPage();

    expect(result).not.toBeInstanceOf(Promise);
    expect(React.isValidElement(result)).toBe(true);
    expect(renderAccessibleKangurAliasRouteMock).toHaveBeenCalledWith(['lessons']);
  });

  it('renders the localized tests entrypoint synchronously', () => {
    const result = LocalizedTestsPage();

    expect(result).not.toBeInstanceOf(Promise);
    expect(React.isValidElement(result)).toBe(true);
    expect(renderAccessibleKangurAliasRouteMock).toHaveBeenCalledWith(['tests']);
  });
});
