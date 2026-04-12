/**
 * Server-Timing header utility for API responses.
 *
 * This utility helps in building and attaching the Server-Timing header to responses,
 * which allows developers to see server-side performance metrics in the browser's
 * Network tab.
 */

/**
 * Builds a Server-Timing header value from a record of timing entries.
 *
 * @param entries - Record where keys are metric names and values are durations in milliseconds.
 * @returns A formatted Server-Timing string.
 */
export const buildServerTiming = (
  entries: Record<string, number | null | undefined>
): string => {
  return Object.entries(entries)
    .filter(
      ([, value]) =>
        typeof value === 'number' && Number.isFinite(value) && value >= 0
    )
    .map(([name, value]) => `${name};dur=${Math.round(value as number)}`)
    .join(', ');
};

/**
 * Attaches Server-Timing headers to a Response object.
 *
 * @param response - The Response or NextResponse to modify.
 * @param entries - Record of timing entries.
 */
export const attachTimingHeaders = (
  response: Response,
  entries: Record<string, number | null | undefined>
): void => {
  const value = buildServerTiming(entries);
  if (value) {
    // If the response headers are immutable, this might throw or do nothing
    // depending on the environment. NextResponse.json() returns a mutable response.
    try {
      response.headers.set('Server-Timing', value);
    } catch (error) {
      // In some environments, headers might be read-only at this point.
      // We log but don't crash the request for a timing header.
      console.warn('[timing] Failed to attach Server-Timing headers', error);
    }
  }
};
