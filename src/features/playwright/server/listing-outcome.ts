import 'server-only';

const toTrimmedString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

export const resolvePlaywrightListingEffectiveBrowserMode = ({
  metadata,
}: {
  metadata?: Record<string, unknown> | null;
}): string | null => toTrimmedString(metadata?.['browserMode']);

export const resolvePlaywrightHistoryBrowserMode = ({
  metadata,
  fallback,
}: {
  metadata?: Record<string, unknown> | null;
  fallback?: string | null;
}): string | null =>
  resolvePlaywrightListingEffectiveBrowserMode({
    metadata,
  }) ??
  toTrimmedString(metadata?.['requestedBrowserMode']) ??
  toTrimmedString(fallback);

export const resolvePlaywrightPersistedExternalListingId = ({
  existingExternalListingId,
  resultExternalListingId,
}: {
  existingExternalListingId: unknown;
  resultExternalListingId: string | null;
}): string | null =>
  toTrimmedString(resultExternalListingId) ?? toTrimmedString(existingExternalListingId);
