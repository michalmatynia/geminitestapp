export const resolveIgnoreRobots = (planState?: Record<string, unknown> | null): boolean => {
  if (!planState || typeof planState !== 'object') return false;
  const prefs: { ignoreRobotsTxt?: boolean } | undefined = (
    planState as { preferences?: { ignoreRobotsTxt?: boolean } }
  ).preferences;
  return Boolean(prefs?.ignoreRobotsTxt);
};

export const resolveApprovalStepId = (
  planState?: Record<string, unknown> | null
): string | null => {
  if (!planState || typeof planState !== 'object') return null;
  const approval: string | null | undefined = (
    planState as { approvalRequestedStepId?: string | null }
  ).approvalRequestedStepId;
  return typeof approval === 'string' ? approval : null;
};

export const formatDependencies = (dependsOn?: string[] | null): string | null => {
  if (!dependsOn || dependsOn.length === 0) return null;
  const readable: string[] = dependsOn.map((item: string): string => {
    const match: RegExpMatchArray | null = item.match(/^step-(\d+)$/);
    if (!match) return item;
    const index: number = Number(match[1]);
    if (!Number.isFinite(index)) return item;
    return `#${index + 1}`;
  });
  return readable.join(', ');
};

export const getAuditList = (value: unknown): string[] =>
  Array.isArray(value)
    ? value
      .filter((item: unknown): item is string => typeof item === 'string')
      .map((item: string): string => item.trim())
      .filter(Boolean)
    : [];

export const formatAdaptiveReason = (reason?: string | null): string => {
  if (!reason) return 'unspecified';
  const trimmed: string = reason.trim();
  if (!trimmed) return 'unspecified';
  if (trimmed.includes(' ')) return trimmed;
  return trimmed.replace(/-/g, ' ');
};

export const isAbortError = (error: unknown): boolean =>
  (error instanceof Error && error.name === 'AbortError') ||
  (typeof error === 'object' &&
    error !== null &&
    (error as { name?: string }).name === 'AbortError');
