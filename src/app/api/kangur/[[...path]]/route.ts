export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/features/auth/server';
import {
  kangurLearnerSignInInputSchema,
  kangurAssignmentCreateInputSchema,
  kangurAssignmentUpdateInputSchema,
  kangurLearnerCreateInputSchema,
  kangurLearnerUpdateInputSchema,
  kangurLearnerActivityUpdateInputSchema,
  kangurProgressStateSchema,
  kangurScoreCreateInputSchema,
} from '@/shared/contracts/kangur';
import {
  kangurParentAccountCreateSchema,
  kangurParentAccountResendSchema,
  kangurParentEmailVerifySchema,
} from '@/shared/contracts/kangur-auth';
import {
  kangurDuelAnswerInputSchema,
  kangurDuelCreateInputSchema,
  kangurDuelJoinInputSchema,
  kangurDuelLeaveInputSchema,
} from '@/shared/contracts/kangur-duels';
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
import { postKangurDuelJoinHandler } from '../duels/join/handler';
import { postKangurDuelLeaveHandler } from '../duels/leave/handler';
import { getKangurDuelLobbyHandler } from '../duels/lobby/handler';
import { getKangurDuelOpponentsHandler } from '../duels/opponents/handler';
import { getKangurDuelSearchHandler } from '../duels/search/handler';
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
import { GET_handler as getKangurKnowledgeGraphStatusHandler, querySchema as knowledgeGraphQuerySchema } from '../knowledge-graph/status/handler';
import { POST_handler as postKangurKnowledgeGraphSyncHandler } from '../knowledge-graph/sync/handler';
import { postNumberBalanceCreateHandler } from '../number-balance/create/handler';
import { postNumberBalanceJoinHandler } from '../number-balance/join/handler';
import { postNumberBalanceSolveHandler } from '../number-balance/solve/handler';
import { postNumberBalanceStateHandler } from '../number-balance/state/handler';
import { GET_handler as getKangurObservabilitySummaryHandler, querySchema as observabilityQuerySchema } from '../observability/summary/handler';
import { getKangurProgressHandler, patchKangurProgressHandler } from '../progress/handler';
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

type RouteContext = {
  params: {
    path?: string[];
  };
};

type SimpleRouteHandler = (request: NextRequest) => Promise<Response>;
type ParamRouteHandler = (request: NextRequest, context: { params: { id: string } }) => Promise<Response>;

const notFound = (): Response => new Response('Not Found', { status: 404 });
const methodNotAllowed = (allowed: string[]): Response =>
  new Response('Method Not Allowed', {
    status: 405,
    headers: { Allow: allowed.join(', ') },
  });

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
    return Promise.resolve(methodNotAllowed(allowed));
  }
  return Promise.resolve(notFound());
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
    return Promise.resolve(methodNotAllowed(['GET']));
  }
  return Promise.resolve(notFound());
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
    return Promise.resolve(methodNotAllowed(['POST']));
  }
  return Promise.resolve(notFound());
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
  opponents: apiHandler(getKangurDuelOpponentsHandler, {
    source: 'kangur.duels.opponents.GET',
    service: 'kangur.api',
  }),
  search: apiHandler(getKangurDuelSearchHandler, {
    source: 'kangur.duels.search.GET',
    service: 'kangur.api',
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
  leave: apiHandler(postKangurDuelLeaveHandler, {
    source: 'kangur.duels.leave.POST',
    service: 'kangur.api',
    successLogging: 'all',
    parseJsonBody: true,
    bodySchema: kangurDuelLeaveInputSchema,
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
    return Promise.resolve(notFound());
  }
  return handleGetPost(method, request, segments.join('/'), authGetHandlers, authPostHandlers);
};

const handleDuels = (
  method: string,
  request: NextRequest,
  segments: string[]
): Promise<Response> => {
  if (segments.length !== 1) {
    return Promise.resolve(notFound());
  }
  return handleGetPost(method, request, segments[0] ?? '', duelsGetHandlers, duelsPostHandlers);
};

const handleKnowledgeGraph = (
  method: string,
  request: NextRequest,
  segments: string[]
): Promise<Response> => {
  if (segments.length !== 1) {
    return Promise.resolve(notFound());
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
    return Promise.resolve(notFound());
  }
  return handlePostOnly(method, request, segments[0] ?? '', numberBalancePostHandlers);
};

const handleTts = (
  method: string,
  request: NextRequest,
  segments: string[]
): Promise<Response> => {
  if (segments.length > 1) {
    return Promise.resolve(notFound());
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
    return Promise.resolve(notFound());
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
    return Promise.resolve(notFound());
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
    return Promise.resolve(notFound());
  }
  if (!id) {
    if (method === 'GET') return assignmentsGetHandler(request);
    if (method === 'POST') return assignmentsPostHandler(request);
    return Promise.resolve(methodNotAllowed(['GET', 'POST']));
  }
  if (action === 'reassign') {
    if (method === 'POST') return assignmentReassignHandler(request, { params: { id } });
    return Promise.resolve(methodNotAllowed(['POST']));
  }
  if (action) {
    return Promise.resolve(notFound());
  }
  if (method === 'PATCH') return assignmentPatchHandler(request, { params: { id } });
  return Promise.resolve(methodNotAllowed(['PATCH']));
};

const handleLearners = (
  method: string,
  request: NextRequest,
  segments: string[]
): Promise<Response> => {
  const [id, action, ...rest] = segments;
  if (rest.length > 0) {
    return Promise.resolve(notFound());
  }
  if (!id) {
    if (method === 'GET') return learnersGetHandler(request);
    if (method === 'POST') return learnersPostHandler(request);
    return Promise.resolve(methodNotAllowed(['GET', 'POST']));
  }
  if (action === 'interactions') {
    if (method === 'GET') return learnerInteractionsHandler(request, { params: { id } });
    return Promise.resolve(methodNotAllowed(['GET']));
  }
  if (action === 'sessions') {
    if (method === 'GET') return learnerSessionsHandler(request, { params: { id } });
    return Promise.resolve(methodNotAllowed(['GET']));
  }
  if (action) {
    return Promise.resolve(notFound());
  }
  if (method === 'PATCH') return learnerPatchHandler(request, { params: { id } });
  if (method === 'DELETE') return learnerDeleteHandler(request, { params: { id } });
  return Promise.resolve(methodNotAllowed(['PATCH', 'DELETE']));
};

const handleProgress = (
  method: string,
  request: NextRequest,
  segments: string[]
): Promise<Response> => {
  if (segments.length !== 0) {
    return Promise.resolve(notFound());
  }
  if (method === 'GET') return progressGetHandler(request);
  if (method === 'PATCH') return progressPatchHandler(request);
  return Promise.resolve(methodNotAllowed(['GET', 'PATCH']));
};

const handleScores = (
  method: string,
  request: NextRequest,
  segments: string[]
): Promise<Response> => {
  if (segments.length !== 0) {
    return Promise.resolve(notFound());
  }
  if (method === 'GET') return scoresGetHandler(request);
  if (method === 'POST') return scoresPostHandler(request);
  return Promise.resolve(methodNotAllowed(['GET', 'POST']));
};

const handleObservability = (
  method: string,
  request: NextRequest,
  segments: string[]
): Promise<Response> => {
  if (segments.length !== 1 || segments[0] !== 'summary') {
    return Promise.resolve(notFound());
  }
  return handleGetOnly(method, request, 'summary', { summary: observabilitySummaryHandler });
};

const routeKangur = (
  method: string,
  request: NextRequest,
  segments: string[]
): Promise<Response> => {
  if (segments.length === 0) {
    return Promise.resolve(notFound());
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
    case 'scores':
      return handleScores(method, request, rest);
    default:
      return Promise.resolve(notFound());
  }
};

export const GET = (request: NextRequest, context: RouteContext): Promise<Response> =>
  routeKangur('GET', request, context.params.path ?? []);

export const POST = (request: NextRequest, context: RouteContext): Promise<Response> =>
  routeKangur('POST', request, context.params.path ?? []);

export const PATCH = (request: NextRequest, context: RouteContext): Promise<Response> =>
  routeKangur('PATCH', request, context.params.path ?? []);

export const DELETE = (request: NextRequest, context: RouteContext): Promise<Response> =>
  routeKangur('DELETE', request, context.params.path ?? []);
