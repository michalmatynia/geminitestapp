import { vi } from 'vitest';

export const useKangurRouteNavigator = vi.fn(() => ({
  back: vi.fn(),
  prefetch: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
}));
