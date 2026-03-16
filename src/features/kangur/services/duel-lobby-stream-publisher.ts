import 'server-only';

import { publishRunEvent } from '@/shared/lib/redis-pubsub';

type KangurDuelLobbyUpdateReason = 'created' | 'joined' | 'left' | 'updated';

export type KangurDuelLobbyStreamEvent = {
  type: 'invalidate';
  data: {
    reason: KangurDuelLobbyUpdateReason;
    sessionId?: string;
    visibility?: 'public' | 'private';
    mode?: 'challenge' | 'quick_match';
  };
  ts: number;
};

const LOBBY_STREAM_CHANNEL = 'kangur:duels:lobby';

export const publishKangurDuelLobbyUpdate = (
  payload: KangurDuelLobbyStreamEvent['data']
): void => {
  publishRunEvent(LOBBY_STREAM_CHANNEL, {
    type: 'invalidate',
    data: payload,
    ts: Date.now(),
  } satisfies KangurDuelLobbyStreamEvent);
};
