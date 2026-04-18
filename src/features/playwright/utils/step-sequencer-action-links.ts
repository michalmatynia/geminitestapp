export const resolveStepSequencerActionHref = (
  actionId: string | null | undefined,
  blockRefId?: string | null
): string => {
  const normalizedActionId = actionId?.trim();
  if (normalizedActionId === undefined || normalizedActionId.length === 0) {
    return '/admin/playwright/step-sequencer';
  }

  const params = new URLSearchParams();
  params.set('actionId', normalizedActionId);
  const normalizedBlockRefId = blockRefId?.trim();
  if (normalizedBlockRefId !== undefined && normalizedBlockRefId.length > 0) {
    params.set('blockRefId', normalizedBlockRefId);
  }

  return `/admin/playwright/step-sequencer?${params.toString()}`;
};
