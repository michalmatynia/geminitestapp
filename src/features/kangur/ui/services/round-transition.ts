export const KANGUR_ROUND_FEEDBACK_DELAY_MS = 1200;

export const scheduleKangurRoundFeedback = (
  callback: () => void,
  delayMs = KANGUR_ROUND_FEEDBACK_DELAY_MS
): ReturnType<typeof setTimeout> => globalThis.setTimeout(callback, delayMs);
