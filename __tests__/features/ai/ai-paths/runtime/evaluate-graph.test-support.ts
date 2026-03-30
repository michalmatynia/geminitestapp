import { vi } from 'vitest';

export const mockFetchEntityByType = vi.fn();
export const mockReportAiPathsError = vi.fn();
export const mockToast = vi.fn();

export const defaultOptions = {
  activePathId: 'test-path',
  fetchEntityByType: mockFetchEntityByType,
  reportAiPathsError: mockReportAiPathsError,
  toast: mockToast,
};

export const resetEvaluateGraphMocks = (): void => {
  vi.clearAllMocks();
};
