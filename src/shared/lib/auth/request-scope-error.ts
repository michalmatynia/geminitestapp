export const isMissingRequestScopeError = (error: unknown): boolean =>
  error instanceof Error && error.message.includes('outside a request scope');
