const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export const readFastCometFailureBody = async (response: Response): Promise<string> => {
  const bodyText = await response.text().catch(() => '');
  return bodyText.slice(0, 200);
};

export const readFastCometJsonSuccessBody = async (
  response: Response,
  operation: 'delete' | 'upload'
): Promise<Record<string, unknown>> => {
  const bodyText = await response.text().catch(() => '');
  if (bodyText.trim().length === 0) {
    throw new Error(`FastComet ${operation} returned an empty success response.`);
  }

  let body: unknown;
  try {
    body = JSON.parse(bodyText);
  } catch {
    throw new Error(
      `FastComet ${operation} returned a non-JSON success response. ${bodyText.slice(0, 200)}`.trim()
    );
  }

  if (!isRecord(body)) {
    throw new Error(`FastComet ${operation} returned an invalid JSON success response.`);
  }

  if (body['ok'] === false) {
    const error = typeof body['error'] === 'string' ? body['error'] : 'Unknown FastComet error.';
    throw new Error(`FastComet ${operation} failed. ${error}`);
  }

  return body;
};
