export const resolveStepSequencerActionHref = (
  actionId: string | null | undefined
): string => {
  const normalizedActionId = actionId?.trim();
  if (normalizedActionId === undefined || normalizedActionId.length === 0) {
    return '/admin/playwright/step-sequencer';
  }

  return `/admin/playwright/step-sequencer?actionId=${encodeURIComponent(normalizedActionId)}`;
};
