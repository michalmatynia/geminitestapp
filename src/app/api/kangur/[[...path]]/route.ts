export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/features/auth/server';
import { methodNotAllowedError, notFoundError } from '@/shared/errors/app-error';
import {
  kangurLearnerSignInInputSchema,
  kangurAssignmentCreateInputSchema,
  kangurAssignmentUpdateInputSchema,
  kangurLearnerCreateInputSchema,
  kangurLearnerUpdateInputSchema,
  kangurLearnerActivityUpdateInputSchema,
  kangurProgressStateSchema,
  kangurScoreCreateInputSchema,
  kangurSubjectFocusSchema,
} from '@/shared/contracts/kangur';
import {
  kangurParentAccountCreateSchema,
  kangurParentAccountResendSchema,
  kangurParentEmailVerifySchema,
} from '@/shared/contracts/kangur-auth';
import {
  kangurDuelAnswerInputSchema,
  kangurDuelCreateInputSchema,
  kangurDuelHeartbeatInputSchema,
  kangurDuelJoinInputSchema,
  kangurDuelLeaveInputSchema,
  kangurDuelReactionInputSchema,
} from '@/shared/contracts/kangur-duels';
import { kangurDuelLobbyChatCreateInputSchema } from '@/shared/contracts/kangur-duels-chat';
import {
  numberBalanceMatchCreateInputSchema,
  numberBalanceMatchJoinInputSchema,
  numberBalanceMatchStateInputSchema,
  numberBalanceSolveAttemptSchema,
} from '@/shared/contracts/kangur-multiplayer-number-balance';
import { kangurAiTutorContentSchema } from '@/shared/contracts/kangur-ai-tutor-content';
import { kangurAiTutorNativeGuideStoreSchema } from '@/shared/contracts/kangur-ai-tutor-native-guide';
import { kangurPageContentStoreSchema } from '@/shared/contracts/kangur-page-content';
import {
  kangurKnowledgeGraphPreviewRequestSchema,
  kangurKnowledgeGraphSyncRequestSchema,
} from '@/shared/contracts';
import { apiHandler, apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import { createErrorResponse } from '@/shared/lib/api/handle-api-error';

import { postKangurAiTutorChatHandler } from '../ai-tutor/chat/handler';
import {
  getKangurAiTutorContentHandler,
  postKangurAiTutorContentHandler,
  querySchema as contentQuerySchema,
} from '../ai-tutor/content/handler';
import { getKangurAiTutorGuestIntroHandler } from '../ai-tutor/guest-intro/handler';
import {
  getKangurAiTutorNativeGuideHandler,
  postKangurAiTutorNativeGuideHandler,
  querySchema as nativeGuideQuerySchema,
} from '../ai-tutor/native-guide/handler';
import { postKangurAiTutorKnowledgeGraphPreviewHandler } from '../ai-tutor/knowledge-graph/preview/handler';
import {
  getKangurPageContentHandler,
  postKangurPageContentHandler,
  querySchema as pageContentQuerySchema,
} from '../ai-tutor/page-content/handler';
import { getKangurAiTutorUsageHandler } from '../ai-tutor/usage/handler';
import {
  getKangurAssignmentsHandler,
  postKangurAssignmentsHandler,
  querySchema as assignmentsQuerySchema,
} from '../assignments/handler';
import { patchKangurAssignmentHandler } from '../assignments/[id]/handler';
import { postKangurAssignmentReassignHandler } from '../assignments/[id]/reassign/handler';
import { postKangurLearnerSignInHandler } from '../auth/learner-signin/handler';
import { postKangurLearnerSignOutHandler } from '../auth/learner-signout/handler';
import { postKangurLogoutHandler } from '../auth/logout/handler';
import { getKangurAuthMeHandler } from '../auth/me/handler';
import { postKangurParentAccountCreateHandler } from '../auth/parent-account/create/handler';
import { postKangurParentAccountResendHandler } from '../auth/parent-account/resend/handler';
import { postKangurParentEmailVerifyHandler } from '../auth/parent-email/verify/handler';
import {
  kangurParentPasswordSchema,
  postKangurParentPasswordHandler,
} from '../auth/parent-password/handler';
import { postKangurDuelAnswerHandler } from '../duels/answer/handler';
import { postKangurDuelCreateHandler } from '../duels/create/handler';
import { postKangurDuelHeartbeatHandler } from '../duels/heartbeat/handler';
import { postKangurDuelJoinHandler } from '../duels/join/handler';
import { postKangurDuelLeaveHandler } from '../duels/leave/handler';
import { postKangurDuelReactionHandler } from '../duels/reaction/handler';
import { getKangurDuelLeaderboardHandler } from '../duels/leaderboard/handler';
import { getKangurDuelLobbyHandler } from '../duels/lobby/handler';
import { GET_handler as getKangurDuelLobbyStreamHandler } from '../duels/lobby/stream/handler';
import {
  getKangurDuelLobbyChatHandler,
  postKangurDuelLobbyChatHandler,
} from '../duels/lobby-chat/handler';
import { GET_handler as getKangurDuelLobbyChatStreamHandler } from '../duels/lobby-chat/stream/handler';
import {
  getKangurDuelLobbyPresenceHandler,
  postKangurDuelLobbyPresenceHandler,
} from '../duels/lobby-presence/handler';
import { getKangurDuelOpponentsHandler } from '../duels/opponents/handler';
import { getKangurDuelSearchHandler } from '../duels/search/handler';
import { getKangurDuelSpectateHandler } from '../duels/spectate/handler';
import { getKangurDuelStateHandler } from '../duels/state/handler';
import {
  getKangurLearnerActivityHandler,
  postKangurLearnerActivityHandler,
} from '../learner-activity/handler';
import { GET_handler as getKangurLearnerActivityStreamHandler } from '../learner-activity/stream/handler';
import {
  getKangurLearnersHandler,
  postKangurLearnersHandler,
} from '../learners/handler';
import {
  deleteKangurLearnerHandler,
  patchKangurLearnerHandler,
} from '../learners/[id]/handler';
import { getKangurLearnerInteractionsHandler } from '../learners/[id]/interactions/handler';
import { getKangurLearnerSessionsHandler } from '../learners/[id]/sessions/handler';
import {
  getKangurLessonsHandler,
  postKangurLessonsHandler,
  querySchema as lessonsQuerySchema,
} from '../lessons/handler';
import {
  getKangurLessonDocumentsHandler,
  postKangurLessonDocumentsHandler,
} from '../lesson-documents/handler';
import { GET_handler as getKangurKnowledgeGraphStatusHandler, querySchema as knowledgeGraphQuerySchema } from '../knowledge-graph/status/handler';
import { POST_handler as postKangurKnowledgeGraphSyncHandler } from '../knowledge-graph/sync/handler';
import { postNumberBalanceCreateHandler } from '../number-balance/create/handler';
import { postNumberBalanceJoinHandler } from '../number-balance/join/handler';
import { postNumberBalanceSolveHandler } from '../number-balance/solve/handler';
import { postNumberBalanceStateHandler } from '../number-balance/state/handler';
import { GET_handler as getKangurObservabilitySummaryHandler, querySchema as observabilityQuerySchema } from '../observability/summary/handler';
import { getKangurProgressHandler, patchKangurProgressHandler } from '../progress/handler';
import { getKangurSubjectFocusHandler, patchKangurSubjectFocusHandler } from '../subject-focus/handler';
import {
  getKangurScoresHandler,
  postKangurScoresHandler,
  querySchema as scoresQuerySchema,
} from '../scores/handler';
import { postKangurTtsHandler } from '../tts/handler';
import { postKangurTtsProbeHandler } from '../tts/probe/handler';
import { postKangurTtsStatusHandler } from '../tts/status/handler';
import {
  kangurLessonTtsProbeRequestSchema,
  kangurLessonTtsRequestSchema,
  kangurLessonTtsStatusRequestSchema,
} from '@/features/kangur/tts/contracts';
import { resolveKangurApiPathSegments } from '../route-utils';

type RouteParams = {
  path?: string[] | string;
};

type SimpleRouteHandler = (request: NextRequest) => Promise<Response>;
type ParamRouteHandler = (request: NextRequest, context: { params: { id: string } }) => Promise<Response>;

const buildSource = (method: string): string => `kangur.[[...path]].${method}`;

const notFound = async (request: NextRequest, method: string): Promise<Response> =>
  createErrorResponse(notFoundError('Not Found'), { request, source: buildSource(method) });
const methodNotAllowed = async (
  request: NextRequest,
  allowed: string[],
  method: string
): Promise<Response> => {
  const response = await createErrorResponse(
    methodNotAllowedError('Method not allowed', { allowedMethods: allowed }),
    { request, source: buildSource(method) }
  );
  response.headers.set('Allow', allowed.join(', '));
  return response;
};

const handleGetPost = (
  method: string,
  request: NextRequest,
  key: string,
  getHandlers: Record<string, SimpleRouteHandler>,
  postHandlers: Record<string, SimpleRouteHandler>
): Promise<Response> => {
  if (method === 'GET') {
    const handler = getHandlers[key];
    if (handler) {
      return handler(request);
    }
  }
  if (method === 'POST') {
    const handler = postHandlers[key];
    if (handler) {
      return handler(request);
    }
  }
  const allowed: string[] = [];
  if (getHandlers[key]) allowed.push('GET');
  if (postHandlers[key]) allowed.push('POST');
  if (allowed.length > 0) {
    return methodNotAllowed(request, allowed, method);
  }
  return notFound(request, method);
};

const handleGetOnly = (
  method: string,
  request: NextRequest,
  key: string,
  getHandlers: Record<string, SimpleRouteHandler>
): Promise<Response> => {
  if (method === 'GET') {
    const handler = getHandlers[key];
    if (handler) {
      return handler(request);
    }
  }
  if (getHandlers[key]) {
    return methodNotAllowed(request, ['GET'], method);
  }
  return notFound(request, method);
};

const handlePostOnly = (
  method: string,
  request: NextRequest,
  key: string,
  postHandlers: Record<string, SimpleRouteHandler>
): Promise<Response> => {
  if (method === 'POST') {
    const handler = postHandlers[key];
    if (handler) {
      return handler(request);
    }
  }
  if (postHandlers[key]) {
    return methodNotAllowed(request, ['POST'], method);
  }
  return notFound(request, method);
};

const createMagicLinkHandler = (source: string): SimpleRouteHandler =>
  apiHandler(
    async () => {
      await auth().catch(() => null);
      return NextResponse.json(
        {
          ok: false,
          error: {
            message:
              'Logowanie linkiem z e-maila nie jest już dostępne. Utwórz konto albo zaloguj się e-mailem i hasłem.',
          },
        },
        { status: 410 }
      );
    },
    {
      source,
      requireCsrf: false,
      resolveSessionUser: false,
    }
  );

const authGetHandlers: Record<string, SimpleRouteHandler> = {
  me: apiHandler(getKangurAuthMeHandler, {
    source: 'kangur.auth.me.GET',
    service: 'kangur.api',
    successLogging: 'all',
  }),
};

const authPostHandlers: Record<string, SimpleRouteHandler> = {
  'learner-signin': apiHandler(postKangurLearnerSignInHandler, {
    source: 'kangur.auth.learner-signin.POST',
    service: 'kangur.api',
    successLogging: 'all',
    parseJsonBody: true,
    bodySchema: kangurLearnerSignInInputSchema,
  }),
  'learner-signout': apiHandler(postKangurLearnerSignOutHandler, {
    source: 'kangur.auth.learner-signout.POST',
    service: 'kangur.api',
    successLogging: 'all',
  }),
  logout: apiHandler(postKangurLogoutHandler, {
    source: 'kangur.auth.logout.POST',
    service: 'kangur.api',
    successLogging: 'all',
  }),
  'parent-account/create': apiHandler(postKangurParentAccountCreateHandler, {
    source: 'kangur.auth.parent-account.create.POST',
    service: 'kangur.api',
    successLogging: 'all',
    parseJsonBody: true,
    bodySchema: kangurParentAccountCreateSchema,
  }),
  'parent-account/resend': apiHandler(postKangurParentAccountResendHandler, {
    source: 'kangur.auth.parent-account.resend.POST',
    service: 'kangur.api',
    successLogging: 'all',
    parseJsonBody: true,
    bodySchema: kangurParentAccountResendSchema,
  }),
  'parent-email/verify': apiHandler(postKangurParentEmailVerifyHandler, {
    source: 'kangur.auth.parent-email.verify.POST',
    service: 'kangur.api',
    successLogging: 'all',
    parseJsonBody: true,
    bodySchema: kangurParentEmailVerifySchema,
  }),
  'parent-magic-link/exchange': createMagicLinkHandler(
    'kangur.auth.parent-magic-link.exchange.POST'
  ),
  'parent-magic-link/request': createMagicLinkHandler(
    'kangur.auth.parent-magic-link.request.POST'
  ),
  'parent-password': apiHandler(postKangurParentPasswordHandler, {
    source: 'kangur.auth.parent-password.POST',
    service: 'kangur.api',
    successLogging: 'all',
    parseJsonBody: true,
    bodySchema: kangurParentPasswordSchema,
  }),
};

const duelsGetHandlers: Record<string, SimpleRouteHandler> = {
  lobby: apiHandler(getKangurDuelLobbyHandler, {
    source: 'kangur.duels.lobby.GET',
    service: 'kangur.api',
  }),
  'lobby/stream': apiHandler(getKangurDuelLobbyStreamHandler, {
    source: 'kangur.duels.lobby.stream.GET',
    service: 'kangur.api',
    successLogging: 'off',
  }),
  'lobby-chat': apiHandler(getKangurDuelLobbyChatHandler, {
    source: 'kangur.duels.lobby-chat.GET',
    service: 'kangur.api',
  }),
  'lobby-presence': apiHandler(getKangurDuelLobbyPresenceHandler, {
    source: 'kangur.duels.lobby-presence.GET',
    service: 'kangur.api',
    requireAuth: true,
  }),
  'lobby-chat/stream': apiHandler(getKangurDuelLobbyChatStreamHandler, {
    source: 'kangur.duels.lobby-chat.stream.GET',
    service: 'kangur.api',
    successLogging: 'off',
  }),
  opponents: apiHandler(getKangurDuelOpponentsHandler, {
    source: 'kangur.duels.opponents.GET',
    service: 'kangur.api',
  }),
  leaderboard: apiHandler(getKangurDuelLeaderboardHandler, {
    source: 'kangur.duels.leaderboard.GET',
    service: 'kangur.api',
  }),
  search: apiHandler(getKangurDuelSearchHandler, {
    source: 'kangur.duels.search.GET',
    service: 'kangur.api',
  }),
  spectate: apiHandler(getKangurDuelSpectateHandler, {
    source: 'kangur.duels.spectate.GET',
    service: 'kangur.api',
    successLogging: 'off',
  }),
  state: apiHandler(getKangurDuelStateHandler, {
    source: 'kangur.duels.state.GET',
    service: 'kangur.api',
    successLogging: 'all',
  }),
};

const duelsPostHandlers: Record<string, SimpleRouteHandler> = {
  answer: apiHandler(postKangurDuelAnswerHandler, {
    source: 'kangur.duels.answer.POST',
    service: 'kangur.api',
    successLogging: 'all',
    parseJsonBody: true,
    bodySchema: kangurDuelAnswerInputSchema,
  }),
  create: apiHandler(postKangurDuelCreateHandler, {
    source: 'kangur.duels.create.POST',
    service: 'kangur.api',
    successLogging: 'all',
    parseJsonBody: true,
    bodySchema: kangurDuelCreateInputSchema,
  }),
  join: apiHandler(postKangurDuelJoinHandler, {
    source: 'kangur.duels.join.POST',
    service: 'kangur.api',
    successLogging: 'all',
    parseJsonBody: true,
    bodySchema: kangurDuelJoinInputSchema,
  }),
  reaction: apiHandler(postKangurDuelReactionHandler, {
    source: 'kangur.duels.reaction.POST',
    service: 'kangur.api',
    successLogging: 'off',
    parseJsonBody: true,
    bodySchema: kangurDuelReactionInputSchema,
  }),
  leave: apiHandler(postKangurDuelLeaveHandler, {
    source: 'kangur.duels.leave.POST',
    service: 'kangur.api',
    successLogging: 'all',
    parseJsonBody: true,
    bodySchema: kangurDuelLeaveInputSchema,
  }),
  heartbeat: apiHandler(postKangurDuelHeartbeatHandler, {
    source: 'kangur.duels.heartbeat.POST',
    service: 'kangur.api',
    successLogging: 'off',
    parseJsonBody: true,
    bodySchema: kangurDuelHeartbeatInputSchema,
  }),
  'lobby-chat': apiHandler(postKangurDuelLobbyChatHandler, {
    source: 'kangur.duels.lobby-chat.POST',
    service: 'kangur.api',
    successLogging: 'off',
    parseJsonBody: true,
    bodySchema: kangurDuelLobbyChatCreateInputSchema,
  }),
  'lobby-presence': apiHandler(postKangurDuelLobbyPresenceHandler, {
    source: 'kangur.duels.lobby-presence.POST',
    service: 'kangur.api',
    successLogging: 'off',
    requireAuth: true,
  }),
};

const knowledgeGraphGetHandlers: Record<string, SimpleRouteHandler> = {
  status: apiHandler(getKangurKnowledgeGraphStatusHandler, {
    source: 'kangur.knowledgeGraph.status.GET',
    resolveSessionUser: false,
    querySchema: knowledgeGraphQuerySchema,
  }),
};

const knowledgeGraphPostHandlers: Record<string, SimpleRouteHandler> = {
  sync: apiHandler(postKangurKnowledgeGraphSyncHandler, {
    source: 'kangur.knowledgeGraph.sync.POST',
    service: 'kangur.api',
    parseJsonBody: true,
    bodySchema: kangurKnowledgeGraphSyncRequestSchema,
    requireAuth: true,
  }),
};

const numberBalancePostHandlers: Record<string, SimpleRouteHandler> = {
  create: apiHandler(postNumberBalanceCreateHandler, {
    source: 'kangur.number-balance.create.POST',
    service: 'kangur.api',
    successLogging: 'all',
    parseJsonBody: true,
    bodySchema: numberBalanceMatchCreateInputSchema,
  }),
  join: apiHandler(postNumberBalanceJoinHandler, {
    source: 'kangur.number-balance.join.POST',
    service: 'kangur.api',
    successLogging: 'all',
    parseJsonBody: true,
    bodySchema: numberBalanceMatchJoinInputSchema,
  }),
  solve: apiHandler(postNumberBalanceSolveHandler, {
    source: 'kangur.number-balance.solve.POST',
    service: 'kangur.api',
    successLogging: 'all',
    parseJsonBody: true,
    bodySchema: numberBalanceSolveAttemptSchema,
  }),
  state: apiHandler(postNumberBalanceStateHandler, {
    source: 'kangur.number-balance.state.POST',
    service: 'kangur.api',
    successLogging: 'all',
    parseJsonBody: true,
    bodySchema: numberBalanceMatchStateInputSchema,
  }),
};

const ttsPostHandlers: Record<string, SimpleRouteHandler> = {
  '': apiHandler(postKangurTtsHandler, {
    source: 'kangur.tts.POST',
    service: 'kangur.api',
    successLogging: 'all',
    parseJsonBody: true,
    bodySchema: kangurLessonTtsRequestSchema,
  }),
  status: apiHandler(postKangurTtsStatusHandler, {
    source: 'kangur.tts.status.POST',
    service: 'kangur.api',
    successLogging: 'all',
    parseJsonBody: true,
    bodySchema: kangurLessonTtsStatusRequestSchema,
  }),
  probe: apiHandler(postKangurTtsProbeHandler, {
    source: 'kangur.tts.probe.POST',
    service: 'kangur.api',
    successLogging: 'all',
    parseJsonBody: true,
    bodySchema: kangurLessonTtsProbeRequestSchema,
  }),
};

const learnerActivityGetHandlers: Record<string, SimpleRouteHandler> = {
  '': apiHandler(getKangurLearnerActivityHandler, {
    source: 'kangur.learnerActivity.GET',
    service: 'kangur.api',
    successLogging: 'all',
  }),
  stream: apiHandler(getKangurLearnerActivityStreamHandler, {
    source: 'kangur.learner-activity.stream.GET',
    requireAuth: true,
    successLogging: 'off',
  }),
};

const learnerActivityPostHandlers: Record<string, SimpleRouteHandler> = {
  '': apiHandler(postKangurLearnerActivityHandler, {
    source: 'kangur.learnerActivity.POST',
    service: 'kangur.api',
    successLogging: 'off',
    parseJsonBody: true,
    bodySchema: kangurLearnerActivityUpdateInputSchema,
  }),
};

const aiTutorGetHandlers: Record<string, SimpleRouteHandler> = {
  content: apiHandler(getKangurAiTutorContentHandler, {
    source: 'kangur.ai-tutor.content.GET',
    service: 'kangur.api',
    successLogging: 'off',
    resolveSessionUser: false,
    querySchema: contentQuerySchema,
    requireAuth: true,
  }),
  'guest-intro': apiHandler(getKangurAiTutorGuestIntroHandler, {
    source: 'kangur.ai-tutor.guest-intro.GET',
    service: 'kangur.api',
    successLogging: 'off',
    resolveSessionUser: false,
  }),
  'native-guide': apiHandler(getKangurAiTutorNativeGuideHandler, {
    source: 'kangur.ai-tutor.native-guide.GET',
    service: 'kangur.api',
    successLogging: 'off',
    resolveSessionUser: false,
    querySchema: nativeGuideQuerySchema,
    requireAuth: true,
  }),
  'page-content': apiHandler(getKangurPageContentHandler, {
    source: 'kangur.ai-tutor.page-content.GET',
    querySchema: pageContentQuerySchema,
  }),
  usage: apiHandler(getKangurAiTutorUsageHandler, {
    source: 'kangur.ai-tutor.usage.GET',
    service: 'kangur.api',
    successLogging: 'off',
  }),
};

const aiTutorPostHandlers: Record<string, SimpleRouteHandler> = {
  chat: apiHandler(postKangurAiTutorChatHandler, {
    source: 'kangur.ai-tutor.chat.POST',
    service: 'kangur.api',
    successLogging: 'off',
  }),
  content: apiHandler(postKangurAiTutorContentHandler, {
    source: 'kangur.ai-tutor.content.POST',
    service: 'kangur.api',
    parseJsonBody: true,
    bodySchema: kangurAiTutorContentSchema,
    requireAuth: true,
  }),
  'native-guide': apiHandler(postKangurAiTutorNativeGuideHandler, {
    source: 'kangur.ai-tutor.native-guide.POST',
    service: 'kangur.api',
    parseJsonBody: true,
    bodySchema: kangurAiTutorNativeGuideStoreSchema,
    requireAuth: true,
  }),
  'page-content': apiHandler(postKangurPageContentHandler, {
    source: 'kangur.ai-tutor.page-content.POST',
    bodySchema: kangurPageContentStoreSchema,
  }),
  'knowledge-graph/preview': apiHandler(postKangurAiTutorKnowledgeGraphPreviewHandler, {
    source: 'kangur.ai-tutor.knowledge-graph.preview.POST',
    service: 'kangur.api',
    parseJsonBody: true,
    bodySchema: kangurKnowledgeGraphPreviewRequestSchema,
    requireAuth: true,
  }),
};

const assignmentsGetHandler: SimpleRouteHandler = apiHandler(getKangurAssignmentsHandler, {
  source: 'kangur.assignments.GET',
  service: 'kangur.api',
  successLogging: 'all',
  querySchema: assignmentsQuerySchema,
});

const assignmentsPostHandler: SimpleRouteHandler = apiHandler(postKangurAssignmentsHandler, {
  source: 'kangur.assignments.POST',
  service: 'kangur.api',
  successLogging: 'all',
  parseJsonBody: true,
  bodySchema: kangurAssignmentCreateInputSchema,
});

const assignmentPatchHandler: ParamRouteHandler = apiHandlerWithParams<{ id: string }>(
  patchKangurAssignmentHandler,
  {
    source: 'kangur.assignments.[id].PATCH',
    service: 'kangur.api',
    successLogging: 'all',
    parseJsonBody: true,
    bodySchema: kangurAssignmentUpdateInputSchema,
  }
);

const assignmentReassignHandler: ParamRouteHandler = apiHandlerWithParams<{ id: string }>(
  postKangurAssignmentReassignHandler,
  {
    source: 'kangur.assignments.[id].reassign.POST',
    service: 'kangur.api',
    successLogging: 'all',
  }
);

const learnersGetHandler: SimpleRouteHandler = apiHandler(getKangurLearnersHandler, {
  source: 'kangur.learners.GET',
  service: 'kangur.api',
  successLogging: 'all',
});

const learnersPostHandler: SimpleRouteHandler = apiHandler(postKangurLearnersHandler, {
  source: 'kangur.learners.POST',
  service: 'kangur.api',
  successLogging: 'all',
  parseJsonBody: true,
  bodySchema: kangurLearnerCreateInputSchema,
});

const learnerPatchHandler: ParamRouteHandler = apiHandlerWithParams<{ id: string }>(
  patchKangurLearnerHandler,
  {
    source: 'kangur.learners.[id].PATCH',
    service: 'kangur.api',
    successLogging: 'all',
    parseJsonBody: true,
    bodySchema: kangurLearnerUpdateInputSchema,
  }
);

const learnerDeleteHandler: ParamRouteHandler = apiHandlerWithParams<{ id: string }>(
  deleteKangurLearnerHandler,
  {
    source: 'kangur.learners.[id].DELETE',
    service: 'kangur.api',
    successLogging: 'all',
    parseJsonBody: false,
  }
);

const learnerInteractionsHandler: ParamRouteHandler = apiHandlerWithParams<{ id: string }>(
  getKangurLearnerInteractionsHandler,
  {
    source: 'kangur.learners.[id].interactions.GET',
    service: 'kangur.api',
    successLogging: 'all',
  }
);

const learnerSessionsHandler: ParamRouteHandler = apiHandlerWithParams<{ id: string }>(
  getKangurLearnerSessionsHandler,
  {
    source: 'kangur.learners.[id].sessions.GET',
    service: 'kangur.api',
    successLogging: 'all',
    parseJsonBody: false,
  }
);

const progressGetHandler: SimpleRouteHandler = apiHandler(getKangurProgressHandler, {
  source: 'kangur.progress.GET',
  service: 'kangur.api',
  successLogging: 'all',
});

const progressPatchHandler: SimpleRouteHandler = apiHandler(patchKangurProgressHandler, {
  source: 'kangur.progress.PATCH',
  service: 'kangur.api',
  successLogging: 'all',
  parseJsonBody: true,
  bodySchema: kangurProgressStateSchema,
});

const subjectFocusGetHandler: SimpleRouteHandler = apiHandler(getKangurSubjectFocusHandler, {
  source: 'kangur.subject-focus.GET',
  service: 'kangur.api',
  successLogging: 'all',
});

const subjectFocusPatchHandler: SimpleRouteHandler = apiHandler(patchKangurSubjectFocusHandler, {
  source: 'kangur.subject-focus.PATCH',
  service: 'kangur.api',
  successLogging: 'all',
  parseJsonBody: true,
  bodySchema: kangurSubjectFocusSchema,
});

const scoresGetHandler: SimpleRouteHandler = apiHandler(getKangurScoresHandler, {
  source: 'kangur.scores.GET',
  service: 'kangur.api',
  successLogging: 'all',
  querySchema: scoresQuerySchema,
});

const scoresPostHandler: SimpleRouteHandler = apiHandler(postKangurScoresHandler, {
  source: 'kangur.scores.POST',
  service: 'kangur.api',
  successLogging: 'all',
  parseJsonBody: true,
  bodySchema: kangurScoreCreateInputSchema,
});

const lessonsGetHandler: SimpleRouteHandler = apiHandler(getKangurLessonsHandler, {
  source: 'kangur.lessons.GET',
  service: 'kangur.api',
  querySchema: lessonsQuerySchema,
});

const lessonsPostHandler: SimpleRouteHandler = apiHandler(postKangurLessonsHandler, {
  source: 'kangur.lessons.POST',
  service: 'kangur.api',
  parseJsonBody: true,
});

const lessonDocumentsGetHandler: SimpleRouteHandler = apiHandler(
  getKangurLessonDocumentsHandler,
  {
    source: 'kangur.lesson-documents.GET',
    service: 'kangur.api',
  }
);

const lessonDocumentsPostHandler: SimpleRouteHandler = apiHandler(
  postKangurLessonDocumentsHandler,
  {
    source: 'kangur.lesson-documents.POST',
    service: 'kangur.api',
    parseJsonBody: true,
  }
);

const observabilitySummaryHandler: SimpleRouteHandler = apiHandler(
  getKangurObservabilitySummaryHandler,
  {
    source: 'kangur.observability.summary.GET',
    resolveSessionUser: false,
    querySchema: observabilityQuerySchema,
  }
);

const handleAuth = (
  method: string,
  request: NextRequest,
  segments: string[]
): Promise<Response> => {
  if (segments.length === 0 || segments.length > 2) {
    return notFound(request, method);
  }
  return handleGetPost(method, request, segments.join('/'), authGetHandlers, authPostHandlers);
};

const handleDuels = (
  method: string,
  request: NextRequest,
  segments: string[]
): Promise<Response> => {
  if (segments.length === 0 || segments.length > 2) {
    return notFound(request, method);
  }
  return handleGetPost(method, request, segments.join('/'), duelsGetHandlers, duelsPostHandlers);
};

const handleKnowledgeGraph = (
  method: string,
  request: NextRequest,
  segments: string[]
): Promise<Response> => {
  if (segments.length !== 1) {
    return notFound(request, method);
  }
  return handleGetPost(
    method,
    request,
    segments[0] ?? '',
    knowledgeGraphGetHandlers,
    knowledgeGraphPostHandlers
  );
};

const handleNumberBalance = (
  method: string,
  request: NextRequest,
  segments: string[]
): Promise<Response> => {
  if (segments.length !== 1) {
    return notFound(request, method);
  }
  return handlePostOnly(method, request, segments[0] ?? '', numberBalancePostHandlers);
};

const handleTts = (
  method: string,
  request: NextRequest,
  segments: string[]
): Promise<Response> => {
  if (segments.length > 1) {
    return notFound(request, method);
  }
  const key = segments[0] ?? '';
  return handlePostOnly(method, request, key, ttsPostHandlers);
};

const handleLearnerActivity = (
  method: string,
  request: NextRequest,
  segments: string[]
): Promise<Response> => {
  if (segments.length > 1) {
    return notFound(request, method);
  }
  const key = segments[0] ?? '';
  return handleGetPost(
    method,
    request,
    key,
    learnerActivityGetHandlers,
    learnerActivityPostHandlers
  );
};

const handleAiTutor = (
  method: string,
  request: NextRequest,
  segments: string[]
): Promise<Response> => {
  if (segments.length === 0 || segments.length > 2) {
    return notFound(request, method);
  }
  const key = segments.join('/');
  return handleGetPost(method, request, key, aiTutorGetHandlers, aiTutorPostHandlers);
};

const handleAssignments = (
  method: string,
  request: NextRequest,
  segments: string[]
): Promise<Response> => {
  const [id, action, ...rest] = segments;
  if (rest.length > 0) {
    return notFound(request, method);
  }
  if (!id) {
    if (method === 'GET') return assignmentsGetHandler(request);
    if (method === 'POST') return assignmentsPostHandler(request);
    return methodNotAllowed(request, ['GET', 'POST'], method);
  }
  if (action === 'reassign') {
    if (method === 'POST') return assignmentReassignHandler(request, { params: { id } });
    return methodNotAllowed(request, ['POST'], method);
  }
  if (action) {
    return notFound(request, method);
  }
  if (method === 'PATCH') return assignmentPatchHandler(request, { params: { id } });
  return methodNotAllowed(request, ['PATCH'], method);
};

const handleLearners = (
  method: string,
  request: NextRequest,
  segments: string[]
): Promise<Response> => {
  const [id, action, ...rest] = segments;
  if (rest.length > 0) {
    return notFound(request, method);
  }
  if (!id) {
    if (method === 'GET') return learnersGetHandler(request);
    if (method === 'POST') return learnersPostHandler(request);
    return methodNotAllowed(request, ['GET', 'POST'], method);
  }
  if (action === 'interactions') {
    if (method === 'GET') return learnerInteractionsHandler(request, { params: { id } });
    return methodNotAllowed(request, ['GET'], method);
  }
  if (action === 'sessions') {
    if (method === 'GET') return learnerSessionsHandler(request, { params: { id } });
    return methodNotAllowed(request, ['GET'], method);
  }
  if (action) {
    return notFound(request, method);
  }
  if (method === 'PATCH') return learnerPatchHandler(request, { params: { id } });
  if (method === 'DELETE') return learnerDeleteHandler(request, { params: { id } });
  return methodNotAllowed(request, ['PATCH', 'DELETE'], method);
};

const handleProgress = (
  method: string,
  request: NextRequest,
  segments: string[]
): Promise<Response> => {
  if (segments.length !== 0) {
    return notFound(request, method);
  }
  if (method === 'GET') return progressGetHandler(request);
  if (method === 'PATCH') return progressPatchHandler(request);
  return methodNotAllowed(request, ['GET', 'PATCH'], method);
};

const handleSubjectFocus = (
  method: string,
  request: NextRequest,
  segments: string[]
): Promise<Response> => {
  if (segments.length !== 0) {
    return notFound(request, method);
  }
  if (method === 'GET') return subjectFocusGetHandler(request);
  if (method === 'PATCH') return subjectFocusPatchHandler(request);
  return methodNotAllowed(request, ['GET', 'PATCH'], method);
};

const handleScores = (
  method: string,
  request: NextRequest,
  segments: string[]
): Promise<Response> => {
  if (segments.length !== 0) {
    return notFound(request, method);
  }
  if (method === 'GET') return scoresGetHandler(request);
  if (method === 'POST') return scoresPostHandler(request);
  return methodNotAllowed(request, ['GET', 'POST'], method);
};

const handleObservability = (
  method: string,
  request: NextRequest,
  segments: string[]
): Promise<Response> => {
  if (segments.length !== 1 || segments[0] !== 'summary') {
    return notFound(request, method);
  }
  return handleGetOnly(method, request, 'summary', { summary: observabilitySummaryHandler });
};

const routeKangur = (
  method: string,
  request: NextRequest,
  segments: string[]
): Promise<Response> => {
  if (segments.length === 0) {
    return notFound(request, method);
  }
  const [section, ...rest] = segments;
  switch (section) {
    case 'auth':
      return handleAuth(method, request, rest);
    case 'duels':
      return handleDuels(method, request, rest);
    case 'knowledge-graph':
      return handleKnowledgeGraph(method, request, rest);
    case 'number-balance':
      return handleNumberBalance(method, request, rest);
    case 'tts':
      return handleTts(method, request, rest);
    case 'learner-activity':
      return handleLearnerActivity(method, request, rest);
    case 'ai-tutor':
      return handleAiTutor(method, request, rest);
    case 'assignments':
      return handleAssignments(method, request, rest);
    case 'learners':
      return handleLearners(method, request, rest);
    case 'observability':
      return handleObservability(method, request, rest);
    case 'progress':
      return handleProgress(method, request, rest);
    case 'subject-focus':
      return handleSubjectFocus(method, request, rest);
    case 'scores':
      return handleScores(method, request, rest);
    case 'lessons':
      return handleGetPost(method, request, rest.join('/'), { '': lessonsGetHandler }, { '': lessonsPostHandler });
    case 'lesson-documents':
      return handleGetPost(
        method,
        request,
        rest.join('/'),
        { '': lessonDocumentsGetHandler },
        { '': lessonDocumentsPostHandler }
      );
    default:
      return notFound(request, method);
  }
};

const ROUTER_OPTIONS = {
  successLogging: 'off',
  requireCsrf: false,
  resolveSessionUser: false,
  rateLimitKey: false,
} as const;

export const GET = apiHandlerWithParams<RouteParams>(
  (request: NextRequest, _ctx, params) =>
    routeKangur('GET', request, resolveKangurApiPathSegments(request, { params })),
  { ...ROUTER_OPTIONS, source: 'kangur.[[...path]].GET' }
);

export const POST = apiHandlerWithParams<RouteParams>(
  (request: NextRequest, _ctx, params) =>
    routeKangur('POST', request, resolveKangurApiPathSegments(request, { params })),
  { ...ROUTER_OPTIONS, source: 'kangur.[[...path]].POST' }
);

export const PATCH = apiHandlerWithParams<RouteParams>(
  (request: NextRequest, _ctx, params) =>
    routeKangur('PATCH', request, resolveKangurApiPathSegments(request, { params })),
  { ...ROUTER_OPTIONS, source: 'kangur.[[...path]].PATCH' }
);

export const DELETE = apiHandlerWithParams<RouteParams>(
  (request: NextRequest, _ctx, params) =>
    routeKangur('DELETE', request, resolveKangurApiPathSegments(request, { params })),
  { ...ROUTER_OPTIONS, source: 'kangur.[[...path]].DELETE' }
);
