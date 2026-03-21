import type { AnalyticsRange } from '@/shared/contracts/analytics';

export const resolveAnalyticsRangeWindow = (
  range: AnalyticsRange
): { from: Date; to: Date } => {
  const to = new Date();
  const msByRange: Record<AnalyticsRange, number> = {
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
  };

  return {
    from: new Date(to.getTime() - msByRange[range]),
    to,
  };
};
