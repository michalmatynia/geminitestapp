const MAX_PORTABLE_PATH_RUN_EXECUTION_ERROR_MESSAGE_LENGTH = 320;

const normalizePortablePathRunExecutionErrorText = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }
  return null;
};

const truncatePortablePathRunExecutionErrorMessage = (value: string): string => {
  if (value.length <= MAX_PORTABLE_PATH_RUN_EXECUTION_ERROR_MESSAGE_LENGTH) return value;
  return `${value.slice(0, MAX_PORTABLE_PATH_RUN_EXECUTION_ERROR_MESSAGE_LENGTH - 3)}...`;
};

const toPortablePathRunExecutionErrorMessageFromRecord = (
  value: Record<string, unknown>
): string | null => {
  const name = normalizePortablePathRunExecutionErrorText(value['name']);
  const code = normalizePortablePathRunExecutionErrorText(value['code']);
  const message =
    normalizePortablePathRunExecutionErrorText(value['message']) ??
    normalizePortablePathRunExecutionErrorText(value['reason']) ??
    normalizePortablePathRunExecutionErrorText(value['error']) ??
    normalizePortablePathRunExecutionErrorText(value['detail']) ??
    null;
  if (!name && !code && !message) return null;
  const detail = message ?? 'Unknown portable engine runtime failure.';
  const namePrefix = name && name !== 'Error' && !detail.startsWith(`${name}:`) ? `${name}: ` : '';
  const codeSuffix = code ? ` (code: ${code})` : '';
  return `${namePrefix}${detail}${codeSuffix}`;
};

export const toPortablePathRunExecutionErrorMessage = (value: unknown): string => {
  if (value instanceof Error) {
    const extendedError = value as Error & {
      code?: unknown;
      reason?: unknown;
      error?: unknown;
      detail?: unknown;
    };
    const recordValue: Record<string, unknown> = {
      name: extendedError.name,
      code: extendedError.code,
      message: extendedError.message,
      reason: extendedError.reason,
      error: extendedError.error,
      detail: extendedError.detail,
    };
    const normalized =
      toPortablePathRunExecutionErrorMessageFromRecord(recordValue) ??
      normalizePortablePathRunExecutionErrorText(value.message) ??
      normalizePortablePathRunExecutionErrorText(value.name) ??
      'Unknown portable engine runtime failure.';
    return truncatePortablePathRunExecutionErrorMessage(normalized);
  }
  const direct = normalizePortablePathRunExecutionErrorText(value);
  if (direct) {
    return truncatePortablePathRunExecutionErrorMessage(direct);
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const fromRecord = toPortablePathRunExecutionErrorMessageFromRecord(
      value as Record<string, unknown>
    );
    if (fromRecord) {
      return truncatePortablePathRunExecutionErrorMessage(fromRecord);
    }
    try {
      const serialized = JSON.stringify(value);
      if (typeof serialized === 'string' && serialized.length > 0) {
        return truncatePortablePathRunExecutionErrorMessage(serialized);
      }
    } catch {
      return 'Unserializable portable engine runtime error object.';
    }
  }
  const fallback = String(value);
  return truncatePortablePathRunExecutionErrorMessage(
    fallback.trim().length > 0 ? fallback : 'Unknown portable engine runtime failure.'
  );
};
