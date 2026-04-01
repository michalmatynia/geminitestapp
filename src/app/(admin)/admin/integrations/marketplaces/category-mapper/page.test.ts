import { beforeEach, describe, expect, it, vi } from 'vitest';

const { redirectMock } = vi.hoisted(() => ({
  redirectMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}));

describe('legacy category mapper route', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    redirectMock.mockImplementation((href: string) => {
      throw new Error(`redirect:${href}`);
    });
  });

  it('redirects to the canonical Base category mapping page', async () => {
    const { default: Page } = await import(
      '@/app/(admin)/admin/integrations/marketplaces/category-mapper/page'
    );

    expect(() => Page()).toThrow('redirect:/admin/integrations/aggregators/base-com/category-mapping');
    expect(redirectMock).toHaveBeenCalledWith('/admin/integrations/aggregators/base-com/category-mapping');
  });
});
