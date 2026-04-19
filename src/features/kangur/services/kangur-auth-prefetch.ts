let prefetchStarted = false;

/**
 * Start the Kangur auth check early, before KangurAuthProvider mounts.
 *
 * `resolveSessionUser()` (the underlying auth.me() implementation) has
 * built-in in-flight deduplication and a 30s result cache. Calling it
 * here means that when KangurAuthProvider fires its own `auth.me()` via
 * useEffect, it either joins the in-flight promise or reads from cache
 * — no duplicate HTTP request.
 */
export function prefetchKangurAuth(): void {
  if (prefetchStarted) return;
  prefetchStarted = true;
  void import('@/features/kangur/services/kangur-shell-session-client').then((m) => {
    m.kangurShellSessionClient.auth.me().catch(() => {
      // Swallow — KangurAuthProvider handles all auth errors.
    });
  });
}
