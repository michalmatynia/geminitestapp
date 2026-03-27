/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { frontendLayoutMock } = vi.hoisted(() => ({
  frontendLayoutMock: vi.fn(({ children }: { children: ReactNode }) => <div>{children}</div>),
}));

vi.mock('../../(frontend)/layout', () => ({
  default: frontendLayoutMock,
}));

describe('localized frontend layout', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('delegates rendering to the shared frontend layout', async () => {
    const { default: LocalizedFrontendLayout } = await import('@/app/[locale]/(frontend)/layout');

    const layout = await LocalizedFrontendLayout({
      children: <div data-testid='localized-frontend-child'>localized content</div>,
    });

    render(layout);

    expect(frontendLayoutMock).toHaveBeenCalledWith(
      {
        children: expect.objectContaining({
          props: expect.objectContaining({
            'data-testid': 'localized-frontend-child',
          }),
        }),
      },
      undefined
    );
    expect(screen.getByTestId('localized-frontend-child')).toBeInTheDocument();
  });
});
