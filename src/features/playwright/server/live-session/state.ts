import { LIVE_SCRIPTER_BRIDGE_KEY, LIVE_SCRIPTER_STATE_KEY } from './constants';
import { type LiveScripterSession, type LiveScripterSocket, type LiveScripterState } from './types';

type AttachSocketClientHandler = (
  session: LiveScripterSession,
  socket: LiveScripterSocket
) => void;

let attachSocketClientHandler: AttachSocketClientHandler | null = null;

export const registerLiveScripterSocketAttacher = (
  handler: AttachSocketClientHandler
): void => {
  attachSocketClientHandler = handler;
};

export const readBridgeState = (): LiveScripterState => {
  const globalScope = globalThis as typeof globalThis & {
    [LIVE_SCRIPTER_STATE_KEY]?: LiveScripterState;
  };
  const existing = globalScope[LIVE_SCRIPTER_STATE_KEY];
  if (existing !== undefined) {
    return existing;
  }

  const state: LiveScripterState = {
    sessions: new Map<string, LiveScripterSession>(),
    bridge: {
      attachClient: (sessionId, socket) => {
        const session = state.sessions.get(sessionId) ?? null;
        if (session === null || session.disposed || attachSocketClientHandler === null) {
          return Promise.resolve(false);
        }
        attachSocketClientHandler(session, socket);
        return Promise.resolve(true);
      },
    },
  };
  globalScope[LIVE_SCRIPTER_STATE_KEY] = state;
  (globalThis as typeof globalThis & { [LIVE_SCRIPTER_BRIDGE_KEY]?: LiveScripterState['bridge'] })[
    LIVE_SCRIPTER_BRIDGE_KEY
  ] = state.bridge;
  return state;
};

export const getSessions = (): Map<string, LiveScripterSession> => readBridgeState().sessions;
