import { describe, expect, it, vi } from 'vitest';

const { redirectMock } = vi.hoisted(() => ({
  redirectMock: vi.fn(() => {
    throw new Error('REDIRECT');
  }),
}));

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}));

describe('apps/studiq-web root page', () => {
  it('redirects the app root to the Kangur launch route', async () => {
    const { default: RootPage } = await import('./page');

    expect(() => RootPage()).toThrow('REDIRECT');
    expect(redirectMock).toHaveBeenCalledWith('/kangur');
  });
});
