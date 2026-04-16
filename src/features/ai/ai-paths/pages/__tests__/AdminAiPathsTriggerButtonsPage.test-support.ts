
import { vi } from 'vitest';
import type { MockRow } from './AdminAiPathsTriggerButtonsPage.test'; // You might need to adjust this import

const mockState = vi.hoisted(() => ({
  toast: vi.fn(),
  routerPush: vi.fn(),
  apiPatch: vi.fn(),
  logClientError: vi.fn(), logClientCatch: vi.fn(),
  triggerButtonsApi: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    reorder: vi.fn(),
    cleanupFixtures: vi.fn(),
    list: vi.fn(),
  },
  triggerButtonsQuery: {
    data: [] as MockRow[],
    error: null as Error | null,
    isFetching: false,
    refetch: vi.fn(),
  },
  aiPathsSettingsQuery: {
    data: [] as Array<{ key: string; value: string }>,
    refetch: vi.fn(),
  },
}));
