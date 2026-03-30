import type { KangurParentDashboardPanelDisplayMode, KangurParentDashboardTabId } from './KangurParentDashboardRuntimeContext.types';

export const ACTION_TIMEOUT_MS = 12_000;
export const REFRESH_TIMEOUT_MS = 8_000;
export const PRIMARY_DATA_LOAD_DEFER_MS = 0;
export const SCORES_LOAD_DEFER_MS = 200;

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export const shouldRenderKangurParentDashboardPanel = (
  displayMode: KangurParentDashboardPanelDisplayMode,
  activeTab: KangurParentDashboardTabId,
  targetTab: KangurParentDashboardTabId
): boolean => displayMode === 'always' || activeTab === targetTab;
