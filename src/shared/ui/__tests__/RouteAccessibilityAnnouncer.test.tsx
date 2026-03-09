/**
 * @vitest-environment jsdom
 */

import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RouteAccessibilityAnnouncer } from '@/shared/ui/RouteAccessibilityAnnouncer';

const { usePathnameMock } = vi.hoisted(() => ({
  usePathnameMock: vi.fn(() => '/'),
}));

vi.mock('next/navigation', () => ({
  usePathname: usePathnameMock,
}));

describe('RouteAccessibilityAnnouncer', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    usePathnameMock.mockReturnValue('/');
    document.title = '';
    window.location.hash = '';
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  });

  it('announces the next page heading and focuses the main landmark on route changes', async () => {
    const focusSpy = vi.spyOn(HTMLElement.prototype, 'focus');
    const { rerender } = render(
      <>
        <RouteAccessibilityAnnouncer />
        <main id='app-content' tabIndex={-1}>
          <h1>Home</h1>
        </main>
      </>
    );

    expect(screen.getByRole('status')).toHaveTextContent('');

    usePathnameMock.mockReturnValue('/products');
    rerender(
      <>
        <RouteAccessibilityAnnouncer />
        <main id='app-content' tabIndex={-1}>
          <h1>Products</h1>
        </main>
      </>
    );

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Products');
    });

    expect(screen.getByRole('main')).toHaveFocus();
    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
  });

  it('falls back to the pathname when no heading or document title is available', async () => {
    const { rerender } = render(
      <>
        <RouteAccessibilityAnnouncer />
        <main id='app-content' tabIndex={-1}>
          <div>Home content</div>
        </main>
      </>
    );

    usePathnameMock.mockReturnValue('/admin/brain-settings');
    rerender(
      <>
        <RouteAccessibilityAnnouncer />
        <main id='app-content' tabIndex={-1}>
          <div>Settings content</div>
        </main>
      </>
    );

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Admin / Brain Settings');
    });
  });
});
