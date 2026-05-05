export const readCaptureApplyNowMs = (): number =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

export const resolveCaptureApplyDurationMs = (startAtMs: number | null): number | null => {
  if (startAtMs === null) return null;
  const now = readCaptureApplyNowMs();
  return Math.round(now - startAtMs);
};
