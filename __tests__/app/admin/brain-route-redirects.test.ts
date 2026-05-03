import { beforeEach, describe, expect, it, vi } from 'vitest';

const { redirectMock } = vi.hoisted(() => ({
  redirectMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}));

vi.mock('nextjs-toploader/app', () => ({
  redirect: redirectMock,
}));

import AiApiSettingsPage from '@/app/(admin)/admin/settings/ai/page';
import AdminBrainSettingsPage from '@/app/(admin)/admin/settings/brain/page';

describe('brain route compatibility redirects', () => {
  beforeEach(() => {
    redirectMock.mockReset();
  });

  it('redirects /admin/settings/brain to /admin/brain?tab=routing', () => {
    AdminBrainSettingsPage();
    expect(redirectMock).toHaveBeenCalledWith('/admin/brain?tab=routing');
  });

  it('redirects /admin/settings/ai to /admin/brain?tab=routing', () => {
    AiApiSettingsPage();
    expect(redirectMock).toHaveBeenCalledWith('/admin/brain?tab=routing');
  });
});
