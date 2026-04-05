/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { kangurAliasAppLayoutMock } = vi.hoisted(() => ({
  kangurAliasAppLayoutMock: vi.fn(async ({ children }: { children: unknown }) => (
    <div data-testid='kangur-alias-app-layout'>{children}</div>
  )),
}));

vi.mock('@/features/kangur/server', () => ({
  KangurAliasAppLayout: kangurAliasAppLayoutMock,
}));

describe('kangur app layout', () => {
  it('delegates the shared app layout to KangurAliasAppLayout', async () => {
    const { default: KangurAppLayout } = await import('@/app/(frontend)/kangur/(app)/layout');

    render(
      await KangurAppLayout({
        children: <div data-testid='kangur-route-child' />,
      })
    );

    expect(kangurAliasAppLayoutMock).toHaveBeenCalledWith(
      expect.objectContaining({
        children: expect.anything(),
      })
    );
    expect(screen.getByTestId('kangur-alias-app-layout')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-route-child')).toBeInTheDocument();
  });

  it('uses the same delegated layout for localized kangur routes', async () => {
    const { default: LocalizedKangurAppLayout } = await import(
      '@/app/[locale]/(frontend)/kangur/(app)/layout'
    );

    render(
      await LocalizedKangurAppLayout({
        children: <div data-testid='localized-kangur-route-child' />,
      })
    );

    expect(kangurAliasAppLayoutMock).toHaveBeenCalledWith(
      expect.objectContaining({
        children: expect.anything(),
      })
    );
    expect(screen.getByTestId('kangur-alias-app-layout')).toBeInTheDocument();
    expect(screen.getByTestId('localized-kangur-route-child')).toBeInTheDocument();
  });
});
