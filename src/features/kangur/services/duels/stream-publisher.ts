/**
 * Duel Stream Publisher Service
 * 
 * Manages the publication of real-time duel lobby events via Redis PubSub.
 */

import 'server-only';
import { publishRunEvent } from '@/shared/lib/redis-pubsub';

const LOBBY_STREAM_CHANNEL = 'kangur:duels:lobby';

export type KangurDuelLobbyUpdateReason = 'created' | 'joined' | 'left' | 'updated';

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

/**
 * Publishes a duel lobby update event to the Redis stream.
 */
export const publishKangurDuelLobbyUpdate = (
  payload: KangurDuelLobbyStreamEvent['data']
): void => {
  publishRunEvent(LOBBY_STREAM_CHANNEL, {
    type: 'invalidate',
    data: payload,
    ts: Date.now(),
  } satisfies KangurDuelLobbyStreamEvent);
};
