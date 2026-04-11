/**
 * @vitest-environment node
 */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  SharedKangurLayoutMock,
  SharedKangurAppLayoutMock,
} = vi.hoisted(() => ({
  SharedKangurLayoutMock: vi.fn(),
  SharedKangurAppLayoutMock: vi.fn(),
}));

vi.mock('@/app/(frontend)/kangur/layout', () => ({
  default: SharedKangurLayoutMock,
}));

vi.mock('@/app/(frontend)/kangur/(app)/layout', () => ({
  default: SharedKangurAppLayoutMock,
}));

import LocalizedKangurLayout from '@/app/[locale]/(frontend)/kangur/layout';
import LocalizedKangurAppLayout from '@/app/[locale]/(frontend)/kangur/(app)/layout';

describe('localized kangur layouts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    SharedKangurLayoutMock.mockImplementation(
      ({ children }: { children: React.ReactNode }) => (
        <div data-testid='shared-kangur-layout'>{children}</div>
      )
    );
    SharedKangurAppLayoutMock.mockImplementation(
      ({ children }: { children: React.ReactNode }) => (
        <div data-testid='shared-kangur-app-layout'>{children}</div>
      )
    );
  });

  it('renders the localized storefront layout through the shared route wrapper', async () => {
    const child = <div data-testid='localized-kangur-child' />;
    const result = await LocalizedKangurLayout({
      children: child,
    });

    expect(React.isValidElement(result)).toBe(true);
    expect(result).toMatchObject({
      type: SharedKangurLayoutMock,
      props: { children: child },
    });
  });

  it('renders the localized app layout through the shared app wrapper', async () => {
    const child = <div data-testid='localized-kangur-app-child' />;

    const result = await LocalizedKangurAppLayout({ children: child });

    expect(React.isValidElement(result)).toBe(true);
    expect(result).toMatchObject({
      type: SharedKangurAppLayoutMock,
      props: { children: child },
    });
  });
});
