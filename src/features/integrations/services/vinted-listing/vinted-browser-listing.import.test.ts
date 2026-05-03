import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

describe('vinted-browser-listing module', () => {
  it('loads the Vinted listing runtime entrypoint', async () => {
    const module = await import('./vinted-browser-listing');

    expect(typeof module.runVintedBrowserListing).toBe('function');
  });
});
