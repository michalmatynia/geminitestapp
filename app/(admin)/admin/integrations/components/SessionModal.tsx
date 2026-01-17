"use client";

type SessionCookie = {
  name?: string;
  value?: string;
  domain?: string;
  path?: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: string;
};

type SessionOrigin = {
  origin?: string;
  localStorage?: { name?: string; value?: string }[];
};

type SessionModalProps = {
  loading: boolean;
  error: string | null;
  cookies: SessionCookie[];
  origins: SessionOrigin[];
  updatedAt: string | null;
  onClose: () => void;
};

export function SessionModal({
  loading,
  error,
  cookies,
  origins,
  updatedAt,
  onClose,
}: SessionModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-3xl rounded-lg bg-gray-950 p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Session cookies</h3>
            <p className="text-xs text-gray-400">
              Stored Playwright session details.
            </p>
          </div>
          <button
            className="text-sm text-gray-400 hover:text-white"
            type="button"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        {loading ? (
          <div className="rounded-md border border-gray-800 bg-gray-950/60 p-4 text-sm text-gray-400">
            Loading session details...
          </div>
        ) : error ? (
          <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">
            {error}
          </div>
        ) : (
          <div className="space-y-4 text-sm text-gray-200">
            <div className="rounded-md border border-gray-800 bg-gray-950/60 p-3 text-xs text-gray-300">
              <span className="text-gray-400">Obtained:</span>{" "}
              {updatedAt ? new Date(updatedAt).toLocaleString() : "—"}
            </div>

            <div className="max-h-96 space-y-3 overflow-y-auto">
              {cookies.length === 0 ? (
                <div className="rounded-md border border-gray-800 bg-gray-950/60 p-4 text-sm text-gray-400">
                  No cookies stored.
                </div>
              ) : (
                cookies.map((cookie, index) => (
                  <div
                    key={`${cookie.name || "cookie"}-${index}`}
                    className="rounded-md border border-gray-800 bg-gray-950/60 p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-300">
                      <span className="rounded-full bg-gray-800 px-2 py-0.5 text-gray-200">
                        {cookie.name || "unknown"}
                      </span>
                      <span className="text-gray-500">
                        {cookie.domain || "—"}
                      </span>
                    </div>
                    <div className="mt-2 grid gap-2 text-xs text-gray-400 md:grid-cols-2">
                      <p>
                        <span className="text-gray-500">Value:</span>{" "}
                        <span className="break-all text-gray-200">
                          {cookie.value || "—"}
                        </span>
                      </p>
                      <p>
                        <span className="text-gray-500">Path:</span>{" "}
                        {cookie.path || "—"}
                      </p>
                      <p>
                        <span className="text-gray-500">Expires:</span>{" "}
                        {cookie.expires
                          ? new Date(cookie.expires * 1000).toLocaleString()
                          : "Session"}
                      </p>
                      <p>
                        <span className="text-gray-500">Secure:</span>{" "}
                        {cookie.secure ? "Yes" : "No"}
                      </p>
                      <p>
                        <span className="text-gray-500">HttpOnly:</span>{" "}
                        {cookie.httpOnly ? "Yes" : "No"}
                      </p>
                      <p>
                        <span className="text-gray-500">SameSite:</span>{" "}
                        {cookie.sameSite || "—"}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {origins.length > 0 && (
              <div className="rounded-md border border-gray-800 bg-gray-950/60 p-3">
                <p className="text-xs text-gray-400">
                  Origins stored: {origins.length}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
