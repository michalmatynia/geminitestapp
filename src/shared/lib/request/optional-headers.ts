import { headers } from 'next/headers';

import { isMissingRequestScopeError } from '@/shared/lib/auth/request-scope-error';

export type OptionalRequestHeadersReadResult = {
  headers: Headers | null;
  timedOut: boolean;
};

type ReadOptionalRequestHeadersOptions = {
  timeoutMs?: number;
};

const readOptionalRequestHeadersSafely = async (): Promise<Headers | null> => {
  try {
    return await headers();
  } catch (error) {
    if (isMissingRequestScopeError(error)) {
      return null;
    }

    throw error;
  }
};

export async function readOptionalRequestHeadersResult(
  options?: ReadOptionalRequestHeadersOptions
): Promise<OptionalRequestHeadersReadResult> {
  const timeoutMs =
    typeof options?.timeoutMs === 'number' && options.timeoutMs > 0 ? options.timeoutMs : null;

  if (timeoutMs === null) {
    return {
      headers: await readOptionalRequestHeadersSafely(),
      timedOut: false,
    };
  }

  const requestHeadersPromise = readOptionalRequestHeadersSafely().then((resolvedHeaders) => ({
    headers: resolvedHeaders,
    timedOut: false,
  }));

  // If the timeout wins, the original request-scope promise can still settle later.
  // Attach a rejection handler so unrelated late failures do not surface as unhandled.
  void requestHeadersPromise.catch(() => {});

  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      requestHeadersPromise,
      new Promise<OptionalRequestHeadersReadResult>((resolve) => {
        timeoutId = setTimeout(() => {
          resolve({
            headers: null,
            timedOut: true,
          });
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export async function readOptionalRequestHeaders(
  options?: ReadOptionalRequestHeadersOptions
): Promise<Headers | null> {
  return (await readOptionalRequestHeadersResult(options)).headers;
}
