import { type NextRequest } from 'next/server';
import { apiHandler } from '@/shared/lib/api/api-handler';
import {
  kangurDuelAnswerInputSchema,
  kangurDuelCreateInputSchema,
  kangurDuelHeartbeatInputSchema,
  kangurDuelJoinInputSchema,
  kangurDuelLeaveInputSchema,
  kangurDuelReactionInputSchema,
} from '@/shared/contracts/kangur-duels';
import { kangurDuelLobbyChatCreateInputSchema } from '@/shared/contracts/kangur-duels-chat';
import { postKangurDuelAnswerHandler } from '@/app/api/kangur/duels/answer/handler';
import { postKangurDuelCreateHandler } from '@/app/api/kangur/duels/create/handler';
import { postKangurDuelHeartbeatHandler } from '@/app/api/kangur/duels/heartbeat/handler';
import { postKangurDuelJoinHandler } from '@/app/api/kangur/duels/join/handler';
import { postKangurDuelLeaveHandler } from '@/app/api/kangur/duels/leave/handler';
import { postKangurDuelReactionHandler } from '@/app/api/kangur/duels/reaction/handler';
import { getKangurDuelLeaderboardHandler } from '@/app/api/kangur/duels/leaderboard/handler';
import { getKangurDuelLobbyHandler } from '@/app/api/kangur/duels/lobby/handler';
import { getHandler as getKangurDuelLobbyStreamHandler } from '@/app/api/kangur/duels/lobby/stream/handler';
import {
  getKangurDuelLobbyChatHandler,
  postKangurDuelLobbyChatHandler,
} from '@/app/api/kangur/duels/lobby-chat/handler';
import { getHandler as getKangurDuelLobbyChatStreamHandler } from '@/app/api/kangur/duels/lobby-chat/stream/handler';
import {
  getKangurDuelLobbyPresenceHandler,
  postKangurDuelLobbyPresenceHandler,
} from '@/app/api/kangur/duels/lobby-presence/handler';
import { getKangurDuelOpponentsHandler } from '@/app/api/kangur/duels/opponents/handler';
import { getKangurDuelSearchHandler } from '@/app/api/kangur/duels/search/handler';
import { getKangurDuelSpectateHandler } from '@/app/api/kangur/duels/spectate/handler';
import { getKangurDuelStateHandler } from '@/app/api/kangur/duels/state/handler';
import { handleGetPost, methodNotAllowed, type SimpleRouteHandler } from './routing.utils';

export const duelCreateHandler: SimpleRouteHandler = apiHandler(postKangurDuelCreateHandler, {
  source: 'kangur.duels.create.POST',
  service: 'kangur.api',
  parseJsonBody: true,
  bodySchema: kangurDuelCreateInputSchema,
});

export const duelJoinHandler: SimpleRouteHandler = apiHandler(postKangurDuelJoinHandler, {
  source: 'kangur.duels.join.POST',
  service: 'kangur.api',
  parseJsonBody: true,
  bodySchema: kangurDuelJoinInputSchema,
});

export const duelLeaveHandler: SimpleRouteHandler = apiHandler(postKangurDuelLeaveHandler, {
  source: 'kangur.duels.leave.POST',
  service: 'kangur.api',
  parseJsonBody: true,
  bodySchema: kangurDuelLeaveInputSchema,
});

export const duelStateHandler: SimpleRouteHandler = apiHandler(getKangurDuelStateHandler, {
  source: 'kangur.duels.state.GET',
  service: 'kangur.api',
});

export const duelAnswerHandler: SimpleRouteHandler = apiHandler(postKangurDuelAnswerHandler, {
  source: 'kangur.duels.answer.POST',
  service: 'kangur.api',
  parseJsonBody: true,
  bodySchema: kangurDuelAnswerInputSchema,
});

export const duelHeartbeatHandler: SimpleRouteHandler = apiHandler(postKangurDuelHeartbeatHandler, {
  source: 'kangur.duels.heartbeat.POST',
  service: 'kangur.api',
  parseJsonBody: true,
  bodySchema: kangurDuelHeartbeatInputSchema,
});

export const duelReactionHandler: SimpleRouteHandler = apiHandler(postKangurDuelReactionHandler, {
  source: 'kangur.duels.reaction.POST',
  service: 'kangur.api',
  parseJsonBody: true,
  bodySchema: kangurDuelReactionInputSchema,
});

export const duelLeaderboardHandler: SimpleRouteHandler = apiHandler(getKangurDuelLeaderboardHandler, {
  source: 'kangur.duels.leaderboard.GET',
  service: 'kangur.api',
});

export const duelSearchHandler: SimpleRouteHandler = apiHandler(getKangurDuelSearchHandler, {
  source: 'kangur.duels.search.GET',
  service: 'kangur.api',
});

export const duelOpponentsHandler: SimpleRouteHandler = apiHandler(getKangurDuelOpponentsHandler, {
  source: 'kangur.duels.opponents.GET',
  service: 'kangur.api',
});

export const duelSpectateHandler: SimpleRouteHandler = apiHandler(getKangurDuelSpectateHandler, {
  source: 'kangur.duels.spectate.GET',
  service: 'kangur.api',
});

export const duelLobbyHandler: SimpleRouteHandler = apiHandler(getKangurDuelLobbyHandler, {
  source: 'kangur.duels.lobby.GET',
  service: 'kangur.api',
});

export const duelLobbyStreamHandler: SimpleRouteHandler = apiHandler(getKangurDuelLobbyStreamHandler, {
  source: 'kangur.duels.lobby.stream.GET',
  service: 'kangur.api',
});

export const duelLobbyPresenceGetHandler: SimpleRouteHandler = apiHandler(
  getKangurDuelLobbyPresenceHandler,
  {
    source: 'kangur.duels.lobby-presence.GET',
    service: 'kangur.api',
  }
);

export const duelLobbyPresencePostHandler: SimpleRouteHandler = apiHandler(
  postKangurDuelLobbyPresenceHandler,
  {
    source: 'kangur.duels.lobby-presence.POST',
    service: 'kangur.api',
  }
);

export const duelLobbyChatGetHandler: SimpleRouteHandler = apiHandler(getKangurDuelLobbyChatHandler, {
  source: 'kangur.duels.lobby-chat.GET',
  service: 'kangur.api',
});

export const duelLobbyChatPostHandler: SimpleRouteHandler = apiHandler(
  postKangurDuelLobbyChatHandler,
  {
    source: 'kangur.duels.lobby-chat.POST',
    service: 'kangur.api',
    parseJsonBody: true,
    bodySchema: kangurDuelLobbyChatCreateInputSchema,
  }
);

export const duelLobbyChatStreamHandler: SimpleRouteHandler = apiHandler(
  getKangurDuelLobbyChatStreamHandler,
  {
    source: 'kangur.duels.lobby-chat.stream.GET',
    service: 'kangur.api',
  }
);

export const handleDuelRouting = (request: NextRequest, segments: string[]): Promise<Response> | null => {
  if (segments[0] === 'duels') {
    const sub = segments[1];
    if (sub === 'create' && segments.length === 2) {
      if (request.method !== 'POST') return methodNotAllowed(request, ['POST'], request.method);
      return duelCreateHandler(request);
    }
    if (sub === 'join' && segments.length === 2) {
      if (request.method !== 'POST') return methodNotAllowed(request, ['POST'], request.method);
      return duelJoinHandler(request);
    }
    if (sub === 'leave' && segments.length === 2) {
      if (request.method !== 'POST') return methodNotAllowed(request, ['POST'], request.method);
      return duelLeaveHandler(request);
    }
    if (sub === 'state' && segments.length === 2) {
      if (request.method !== 'GET') return methodNotAllowed(request, ['GET'], request.method);
      return duelStateHandler(request);
    }
    if (sub === 'answer' && segments.length === 2) {
      if (request.method !== 'POST') return methodNotAllowed(request, ['POST'], request.method);
      return duelAnswerHandler(request);
    }
    if (sub === 'heartbeat' && segments.length === 2) {
      if (request.method !== 'POST') return methodNotAllowed(request, ['POST'], request.method);
      return duelHeartbeatHandler(request);
    }
    if (sub === 'reaction' && segments.length === 2) {
      if (request.method !== 'POST') return methodNotAllowed(request, ['POST'], request.method);
      return duelReactionHandler(request);
    }
    if (sub === 'leaderboard' && segments.length === 2) {
      if (request.method !== 'GET') return methodNotAllowed(request, ['GET'], request.method);
      return duelLeaderboardHandler(request);
    }
    if (sub === 'search' && segments.length === 2) {
      if (request.method !== 'GET') return methodNotAllowed(request, ['GET'], request.method);
      return duelSearchHandler(request);
    }
    if (sub === 'opponents' && segments.length === 2) {
      if (request.method !== 'GET') return methodNotAllowed(request, ['GET'], request.method);
      return duelOpponentsHandler(request);
    }
    if (sub === 'spectate' && segments.length === 2) {
      if (request.method !== 'GET') return methodNotAllowed(request, ['GET'], request.method);
      return duelSpectateHandler(request);
    }
    if (sub === 'lobby') {
      if (segments.length === 2) {
        if (request.method !== 'GET') return methodNotAllowed(request, ['GET'], request.method);
        return duelLobbyHandler(request);
      }
      if (segments[2] === 'stream' && segments.length === 3) {
        if (request.method !== 'GET') return methodNotAllowed(request, ['GET'], request.method);
        return duelLobbyStreamHandler(request);
      }
    }
    if (sub === 'lobby-presence' && segments.length === 2) {
      return handleGetPost(request, duelLobbyPresenceGetHandler, duelLobbyPresencePostHandler);
    }
    if (sub === 'lobby-chat') {
      if (segments.length === 2) {
        return handleGetPost(request, duelLobbyChatGetHandler, duelLobbyChatPostHandler);
      }
      if (segments[2] === 'stream' && segments.length === 3) {
        if (request.method !== 'GET') return methodNotAllowed(request, ['GET'], request.method);
        return duelLobbyChatStreamHandler(request);
      }
    }
  }
  return null;
};
