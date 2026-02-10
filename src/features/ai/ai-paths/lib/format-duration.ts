/**
 * Formats a duration in milliseconds into a human-readable string.
 *
 * Examples: "42ms", "3s", "2m 15s", "1h 30m"
 */
export const formatDurationMs = (diffMs: number | null): string | null => {
  if (diffMs === null || Number.isNaN(diffMs)) return null;
  if (diffMs < 1000) return `${Math.max(diffMs, 0)}ms`;
  const seconds = Math.round(diffMs / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remaining}s`;
  const hours = Math.floor(minutes / 60);
  const minutesRemaining = minutes % 60;
  return `${hours}h ${minutesRemaining}m`;
};
