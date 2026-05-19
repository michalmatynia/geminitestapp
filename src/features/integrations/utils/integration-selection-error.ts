const normalizeErrorMessage = (error: unknown): string | null => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message.trim().replace(/\.$/, '');
  }

  if (typeof error === 'string' && error.trim().length > 0) {
    return error.trim().replace(/\.$/, '');
  }

  return null;
};

export const resolveIntegrationSelectionErrorMessage = (error: unknown): string | null => {
  if (error === null || error === undefined) return null;

  const message = normalizeErrorMessage(error);
  return (message !== null && message.length > 0)
    ? `Unable to load integrations: ${message}.`
    : 'Unable to load integrations.';
};
