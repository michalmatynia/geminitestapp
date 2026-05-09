/* eslint-disable no-param-reassign -- Session lifecycle updates mutate the in-memory session record. */
import { type LiveScripterSession, type LiveScripterSocket } from './types';
import { getSessions } from './state';
import { safeClearTimeout, safeSetTimeout } from '@/shared/lib/timers';
import { broadcastToSockets } from './socket-handler';
import { LIVE_SCRIPTER_SESSION_IDLE_MS } from './constants';

export const refreshIdleTimeout = (session: LiveScripterSession): void => {
  session.lastActivityAt = Date.now();
  safeClearTimeout(session.timeoutId);
  session.timeoutId = safeSetTimeout(() => {
    void disposeLiveScripterSession(session.id);
  }, LIVE_SCRIPTER_SESSION_IDLE_MS);
};

export const attachSocketClient = (session: LiveScripterSession, socket: LiveScripterSocket): void => {
  session.sockets.add(socket);
  socket.on('close', () => {
    session.sockets.delete(socket);
  });
  refreshIdleTimeout(session);
};

export const disposeLiveScripterSession = async (sessionId: string): Promise<void> => {
  const session = getSessions().get(sessionId) ?? null;
  if (session === null || session.disposed) {
    return;
  }

  session.disposed = true;
  safeClearTimeout(session.timeoutId);
  getSessions().delete(sessionId);

  for (const socket of session.sockets) {
    broadcastToSockets(session.sockets, { type: 'closed' });
    try {
      socket.close();
    } catch {
      // Best-effort close.
    }
  }
  session.sockets.clear();

  // Cleanup browser resources
  await session.cdp.send('Page.stopScreencast').catch(() => undefined);
  await session.page.close().catch(() => undefined);
  await session.context.close().catch(() => undefined);
  await session.browser.close().catch(() => undefined);
};
