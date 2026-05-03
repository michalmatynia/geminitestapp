type UnknownRecord = Record<string, unknown>;

const isUnknownRecord = (value: unknown): value is UnknownRecord =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const normalizeErrorText = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const formatDetailEntry = (detail: unknown): string => {
  if (!isUnknownRecord(detail)) return '';
  const field = normalizeErrorText(detail['field']);
  const message = normalizeErrorText(detail['message']);
  const resolvedField = field.length > 0 ? field : 'field';
  const resolvedMessage = message.length > 0 ? message : 'invalid';
  return `${resolvedField}: ${resolvedMessage}`;
};

const collectArrayDetailMessages = (details: unknown): string[] => {
  if (!Array.isArray(details)) return [];
  return details
    .slice(0, 3)
    .map((detail: unknown): string => formatDetailEntry(detail))
    .filter((entry: string): boolean => entry.length > 0);
};

const collectFieldValueMessages = (field: string, value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry: unknown): string => {
      const message = normalizeErrorText(entry);
      return message.length > 0 ? `${field}: ${message}` : '';
    })
    .filter((entry: string): boolean => entry.length > 0);
};

const collectFieldErrorMessages = (details: unknown): string[] => {
  if (!isUnknownRecord(details)) return [];
  const fields = details['fields'];
  if (!isUnknownRecord(fields)) return [];
  return Object.entries(fields)
    .flatMap(([field, value]: [string, unknown]): string[] =>
      collectFieldValueMessages(field, value)
    )
    .slice(0, 3);
};

export const parseProductUpdateError = async (response: Response): Promise<string> => {
  const errorData = (await response.json().catch((): UnknownRecord => ({}))) as UnknownRecord;
  const errorMessage = normalizeErrorText(errorData['error']);
  let message = errorMessage.length > 0 ? errorMessage : 'Failed to update product';
  const detailMessages = Array.isArray(errorData['details'])
    ? collectArrayDetailMessages(errorData['details'])
    : collectFieldErrorMessages(errorData['details']);

  if (detailMessages.length > 0) {
    message = `${message} (${detailMessages.join(', ')})`;
  }
  return message;
};
