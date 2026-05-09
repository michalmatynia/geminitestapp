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
    // FastComet returned a 2xx status but no response body
    throw new Error(`FastComet ${operation} returned an empty success response.`);
  }

  let body: unknown;
  try {
    body = JSON.parse(bodyText);
  } catch {
    // FastComet returned a 2xx status but the response body is not valid JSON
    throw new Error(
      `FastComet ${operation} returned a non-JSON success response. ${bodyText.slice(0, 200)}`.trim()
    );
  }

  if (!isRecord(body)) {
    // FastComet returned JSON but it's not an object
    throw new Error(`FastComet ${operation} returned an invalid JSON success response.`);
  }

  if (body['ok'] === false) {
    const error = typeof body['error'] === 'string' ? body['error'] : 'Unknown FastComet error.';
    // FastComet returned a 2xx status but the response indicates failure
    throw new Error(`FastComet ${operation} failed. ${error}`);
  }

  return body;
};
