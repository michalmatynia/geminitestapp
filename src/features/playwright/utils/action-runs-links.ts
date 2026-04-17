type PlaywrightActionRunsFilterArgs = {
  actionId?: string | null;
  runtimeKey?: string | null;
  selectorProfile?: string | null;
};

const addTrimmedQueryParam = (
  params: URLSearchParams,
  key: string,
  value: string | null | undefined
): void => {
  const normalizedValue = value?.trim();
  if (normalizedValue === undefined || normalizedValue.length === 0) {
    return;
  }

  params.set(key, normalizedValue);
};

export const resolvePlaywrightActionRunsHref = (
  args: PlaywrightActionRunsFilterArgs
): string => {
  const params = new URLSearchParams();
  addTrimmedQueryParam(params, 'actionId', args.actionId);
  addTrimmedQueryParam(params, 'runtimeKey', args.runtimeKey);
  addTrimmedQueryParam(params, 'selectorProfile', args.selectorProfile);

  const query = params.toString();
  return query.length > 0
    ? `/admin/playwright/action-runs?${query}`
    : '/admin/playwright/action-runs';
};
