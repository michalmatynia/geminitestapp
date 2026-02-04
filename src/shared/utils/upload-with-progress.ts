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
  } catch {
    return {} as T;
  }
};

export async function uploadWithProgress<T>(
  url: string,
  options: UploadWithProgressOptions,
): Promise<UploadWithProgressResult<T>> {
  const {
    method = "POST",
    formData,
    headers,
    onProgress,
    withCredentials,
    timeoutMs,
  } = options;

  return new Promise<UploadWithProgressResult<T>>((resolve: (value: UploadWithProgressResult<T>) => void, reject: (reason?: Error) => void) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    if (withCredentials) xhr.withCredentials = true;
    if (typeof timeoutMs === "number" && timeoutMs > 0) {
      xhr.timeout = timeoutMs;
    }

    if (headers) {
      Object.entries(headers).forEach(([key, value]: [string, string]) => {
        xhr.setRequestHeader(key, value);
      });
    }

    xhr.upload.onprogress = (event: ProgressEvent): void => {
      if (!onProgress) return;
      if (event.lengthComputable) {
        onProgress(event.loaded, event.total);
      } else {
        onProgress(event.loaded);
      }
    };

    xhr.onload = (): void => {
      const raw = typeof xhr.responseText === "string" ? xhr.responseText : "";
      const data = safeJsonParse<T>(raw);
      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        data,
        raw,
      });
    };

    xhr.onerror = (): void => {
      reject(new Error("Upload failed"));
    };

    xhr.ontimeout = (): void => {
      reject(new Error("Upload timed out"));
    };

    xhr.send(formData);
  });
}
