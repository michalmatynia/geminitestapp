import { type NextRequest } from 'next/server';
import { apiHandler, apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import {
  kangurLearnerCreateInputSchema,
  kangurLearnerUpdateInputSchema,
  kangurLearnerActivityUpdateInputSchema,
  kangurProgressStateSchema,
  kangurScoreCreateInputSchema,
  kangurSubjectFocusSchema,
} from '@kangur/contracts';
import {
  getKangurLearnerActivityHandler,
  postKangurLearnerActivityHandler,
} from '@/app/api/kangur/learner-activity/handler';
import { GET_handler as getKangurLearnerActivityStreamHandler } from '@/app/api/kangur/learner-activity/stream/handler';
import {
  getKangurLearnersHandler,
  postKangurLearnersHandler,
} from '@/app/api/kangur/learners/handler';
import {
  deleteKangurLearnerHandler,
  patchKangurLearnerHandler,
} from '@/app/api/kangur/learners/[id]/handler';
import { getKangurLearnerInteractionsHandler } from '@/app/api/kangur/learners/[id]/interactions/handler';
import { getKangurLearnerSessionsHandler } from '@/app/api/kangur/learners/[id]/sessions/handler';
import { getKangurProgressHandler, patchKangurProgressHandler } from '@/app/api/kangur/progress/handler';
import { getKangurSubjectFocusHandler, patchKangurSubjectFocusHandler } from '@/app/api/kangur/subject-focus/handler';
import {
  getKangurScoresHandler,
  postKangurScoresHandler,
  querySchema as scoresQuerySchema,
} from '@/app/api/kangur/scores/handler';
import { handleGetPost, methodNotAllowed, SimpleRouteHandler, ParamRouteHandler } from './routing.utils';

export const learnersGetHandler: SimpleRouteHandler = apiHandler(getKangurLearnersHandler, {
  source: 'kangur.learners.GET',
  service: 'kangur.api',
});

export const learnersPostHandler: SimpleRouteHandler = apiHandler(postKangurLearnersHandler, {
  source: 'kangur.learners.POST',
  service: 'kangur.api',
  parseJsonBody: true,
  bodySchema: kangurLearnerCreateInputSchema,
});

export const learnerPatchHandler: ParamRouteHandler = apiHandlerWithParams<{ id: string }>(
  patchKangurLearnerHandler,
  {
    source: 'kangur.learners.[id].PATCH',
    service: 'kangur.api',
    parseJsonBody: true,
    bodySchema: kangurLearnerUpdateInputSchema,
  }
);

export const learnerDeleteHandler: ParamRouteHandler = apiHandlerWithParams<{ id: string }>(
  deleteKangurLearnerHandler,
  {
    source: 'kangur.learners.[id].DELETE',
    service: 'kangur.api',
  }
);

export const learnerSessionsHandler: ParamRouteHandler = apiHandlerWithParams<{ id: string }>(
  getKangurLearnerSessionsHandler,
  {
    source: 'kangur.learners.[id].sessions.GET',
    service: 'kangur.api',
  }
);

export const learnerInteractionsHandler: ParamRouteHandler = apiHandlerWithParams<{ id: string }>(
  getKangurLearnerInteractionsHandler,
  {
    source: 'kangur.learners.[id].interactions.GET',
    service: 'kangur.api',
  }
);

export const learnerActivityGetHandler: SimpleRouteHandler = apiHandler(
  getKangurLearnerActivityHandler,
  {
    source: 'kangur.learner-activity.GET',
    service: 'kangur.api',
  }
);

export const learnerActivityPostHandler: SimpleRouteHandler = apiHandler(
  postKangurLearnerActivityHandler,
  {
    source: 'kangur.learner-activity.POST',
    service: 'kangur.api',
    parseJsonBody: true,
    bodySchema: kangurLearnerActivityUpdateInputSchema,
  }
);

export const learnerActivityStreamHandler: SimpleRouteHandler = apiHandler(
  getKangurLearnerActivityStreamHandler,
  {
    source: 'kangur.learner-activity.stream.GET',
    service: 'kangur.api',
  }
);

export const scoresGetHandler: SimpleRouteHandler = apiHandler(getKangurScoresHandler, {
  source: 'kangur.scores.GET',
  service: 'kangur.api',
  querySchema: scoresQuerySchema,
});

export const scoresPostHandler: SimpleRouteHandler = apiHandler(postKangurScoresHandler, {
  source: 'kangur.scores.POST',
  service: 'kangur.api',
  parseJsonBody: true,
  bodySchema: kangurScoreCreateInputSchema,
});

export const progressGetHandler: SimpleRouteHandler = apiHandler(getKangurProgressHandler, {
  source: 'kangur.progress.GET',
  service: 'kangur.api',
});

export const progressPatchHandler: SimpleRouteHandler = apiHandler(patchKangurProgressHandler, {
  source: 'kangur.progress.PATCH',
  service: 'kangur.api',
  parseJsonBody: true,
  bodySchema: kangurProgressStateSchema,
});

export const subjectFocusGetHandler: SimpleRouteHandler = apiHandler(getKangurSubjectFocusHandler, {
  source: 'kangur.subject-focus.GET',
  service: 'kangur.api',
});

export const subjectFocusPatchHandler: SimpleRouteHandler = apiHandler(patchKangurSubjectFocusHandler, {
  source: 'kangur.subject-focus.PATCH',
  service: 'kangur.api',
  parseJsonBody: true,
  bodySchema: kangurSubjectFocusSchema,
});

export const handleLearnerRouting = (request: NextRequest, segments: string[]): Promise<Response> | null => {
  if (segments[0] === 'learners') {
    if (segments.length === 1) {
      return handleGetPost(request, learnersGetHandler, learnersPostHandler);
    }
    const id = segments[1];
    if (!id) return null;
    if (segments.length === 2) {
      if (request.method === 'PATCH') return learnerPatchHandler(request, { params: { id } });
      if (request.method === 'DELETE') return learnerDeleteHandler(request, { params: { id } });
      return methodNotAllowed(request, ['PATCH', 'DELETE'], request.method);
    }
    if (segments[2] === 'sessions' && segments.length === 3) {
      if (request.method !== 'GET') return methodNotAllowed(request, ['GET'], request.method);
      return learnerSessionsHandler(request, { params: { id } });
    }
    if (segments[2] === 'interactions' && segments.length === 3) {
      if (request.method !== 'GET') return methodNotAllowed(request, ['GET'], request.method);
      return learnerInteractionsHandler(request, { params: { id } });
    }
  }
  if (segments[0] === 'learner-activity') {
    if (segments.length === 1) {
      return handleGetPost(request, learnerActivityGetHandler, learnerActivityPostHandler);
    }
    if (segments[1] === 'stream' && segments.length === 2) {
      if (request.method !== 'GET') return methodNotAllowed(request, ['GET'], request.method);
      return learnerActivityStreamHandler(request);
    }
  }
  if (segments[0] === 'scores' && segments.length === 1) {
    return handleGetPost(request, scoresGetHandler, scoresPostHandler);
  }
  if (segments[0] === 'progress' && segments.length === 1) {
    if (request.method === 'GET') return progressGetHandler(request);
    if (request.method === 'PATCH') return progressPatchHandler(request);
    return methodNotAllowed(request, ['GET', 'PATCH'], request.method);
  }
  if (segments[0] === 'subject-focus' && segments.length === 1) {
    if (request.method === 'GET') return subjectFocusGetHandler(request);
    if (request.method === 'PATCH') return subjectFocusPatchHandler(request);
    return methodNotAllowed(request, ['GET', 'PATCH'], request.method);
  }
  return null;
};
