import {
  CSRF_HEADER_NAME,
  CSRF_SAFE_METHODS,
  getClientCsrfToken,
  isSameOriginUrl,
} from '@/shared/lib/security/csrf-client';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';


export type UploadWithProgressOptions = {
  method?: string | undefined;
  formData: FormData;
  headers?: Record<string, string> | undefined;
  onProgress?: ((loaded: number, total?: number) => void) | undefined;
  withCredentials?: boolean | undefined;
  timeoutMs?: number | undefined;
};

export type UploadWithProgressResult<T> = {
  ok: boolean;
  status: number;
  data: T;
  raw: string;
};

const safeJsonParse = <T>(raw: string): T => {
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    logClientCatch(error, {
      source: 'upload-with-progress',
      action: 'safeJsonParse',
      level: 'warn',
    });
    return {} as T;
  }
};

export async function uploadWithProgress<T>(
  url: string,
  options: UploadWithProgressOptions
): Promise<UploadWithProgressResult<T>> {
  const { method = 'POST', formData, headers, onProgress, withCredentials, timeoutMs } = options;

  return new Promise<UploadWithProgressResult<T>>(
    (resolve: (value: UploadWithProgressResult<T>) => void, reject: (reason?: Error) => void) => {
      const xhr = new XMLHttpRequest();
      xhr.open(method, url, true);
      if (withCredentials) xhr.withCredentials = true;
      if (typeof timeoutMs === 'number' && timeoutMs > 0) {
        xhr.timeout = timeoutMs;
      }

      const finalHeaders: Record<string, string> = { ...(headers ?? {}) };
      const methodUpper = method.toUpperCase();
      if (!CSRF_SAFE_METHODS.has(methodUpper) && isSameOriginUrl(url)) {
        const token = getClientCsrfToken();
        if (token && !finalHeaders[CSRF_HEADER_NAME]) {
          finalHeaders[CSRF_HEADER_NAME] = token;
        }
      }
      Object.entries(finalHeaders).forEach(([key, value]: [string, string]) => {
        xhr.setRequestHeader(key, value);
      });

      xhr.upload.onprogress = (event: ProgressEvent): void => {
        if (!onProgress) return;
        if (event.lengthComputable) {
          onProgress(event.loaded, event.total);
        } else {
          onProgress(event.loaded);
        }
      };

      xhr.onload = (): void => {
        const raw = typeof xhr.responseText === 'string' ? xhr.responseText : '';
        const data = safeJsonParse<T>(raw);
        resolve({
          ok: xhr.status >= 200 && xhr.status < 300,
          status: xhr.status,
          data,
          raw,
        });
      };

      xhr.onerror = (): void => {
        reject(new Error('Upload failed'));
      };

      xhr.ontimeout = (): void => {
        reject(new Error('Upload timed out'));
      };

      xhr.send(formData);
    }
  );
}
