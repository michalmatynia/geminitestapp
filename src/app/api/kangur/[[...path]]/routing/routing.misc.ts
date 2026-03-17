import { type NextRequest } from 'next/server';
import { apiHandler, apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import {
  kangurAssignmentCreateInputSchema,
} from '@/shared/contracts/kangur';
import {
  getKangurAssignmentsHandler,
  postKangurAssignmentsHandler,
  querySchema as assignmentsQuerySchema,
} from '../../assignments/handler';
import { patchKangurAssignmentHandler } from '../../assignments/[id]/handler';
import { postKangurAssignmentReassignHandler } from '../../assignments/[id]/reassign/handler';
import {
  getKangurLessonsHandler,
  postKangurLessonsHandler,
  querySchema as lessonsQuerySchema,
} from '../../lessons/handler';
import {
  getKangurLessonDocumentsHandler,
  postKangurLessonDocumentsHandler,
} from '../../lesson-documents/handler';
import {
  getKangurSocialPostsHandler,
  postKangurSocialPostsHandler,
  querySchema as socialPostsQuerySchema,
} from '../../social-posts/handler';
import {
  getKangurSocialImageAddonsHandler,
  postKangurSocialImageAddonsHandler,
  querySchema as socialImageAddonsQuerySchema,
} from '../../social-image-addons/handler';
import {
  getKangurSocialPostHandler,
  patchKangurSocialPostHandler,
} from '../../social-posts/[id]/handler';
import { postKangurSocialPostPublishHandler } from '../../social-posts/[id]/publish/handler';
import { postKangurSocialPostGenerateHandler } from '../../social-posts/generate/handler';
import { postKangurSocialPostsPublishScheduledHandler } from '../../social-posts/publish-scheduled/handler';
import { postNumberBalanceCreateHandler } from '../../number-balance/create/handler';
import { postNumberBalanceJoinHandler } from '../../number-balance/join/handler';
import { postNumberBalanceSolveHandler } from '../../number-balance/solve/handler';
import { postNumberBalanceStateHandler } from '../../number-balance/state/handler';
import { GET_handler as getKangurObservabilitySummaryHandler, querySchema as observabilityQuerySchema } from '../../observability/summary/handler';
import { postKangurTtsHandler } from '../../tts/handler';
import { postKangurTtsProbeHandler } from '../../tts/probe/handler';
import { postKangurTtsStatusHandler } from '../../tts/status/handler';
import {
  handleGetPost,
  methodNotAllowed,
  SimpleRouteHandler,
  ParamRouteHandler,
} from './routing.utils';

export const assignmentsGetHandler: SimpleRouteHandler = apiHandler(getKangurAssignmentsHandler, {
  source: 'kangur.assignments.GET',
  service: 'kangur.api',
  querySchema: assignmentsQuerySchema,
});

export const assignmentsPostHandler: SimpleRouteHandler = apiHandler(postKangurAssignmentsHandler, {
  source: 'kangur.assignments.POST',
  service: 'kangur.api',
  parseJsonBody: true,
  bodySchema: kangurAssignmentCreateInputSchema,
});

export const assignmentPatchHandler: ParamRouteHandler = apiHandlerWithParams<{ id: string }>(
  patchKangurAssignmentHandler,
  {
    source: 'kangur.assignments.[id].PATCH',
    service: 'kangur.api',
    parseJsonBody: true,
  }
);

export const assignmentReassignHandler: ParamRouteHandler = apiHandlerWithParams<{ id: string }>(
  postKangurAssignmentReassignHandler,
  {
    source: 'kangur.assignments.[id].reassign.POST',
    service: 'kangur.api',
  }
);

export const lessonsGetHandler: SimpleRouteHandler = apiHandler(getKangurLessonsHandler, {
  source: 'kangur.lessons.GET',
  service: 'kangur.api',
  querySchema: lessonsQuerySchema,
});

export const lessonsPostHandler: SimpleRouteHandler = apiHandler(postKangurLessonsHandler, {
  source: 'kangur.lessons.POST',
  service: 'kangur.api',
  parseJsonBody: true,
});

export const lessonDocumentsGetHandler: SimpleRouteHandler = apiHandler(
  getKangurLessonDocumentsHandler,
  {
    source: 'kangur.lesson-documents.GET',
    service: 'kangur.api',
  }
);

export const lessonDocumentsPostHandler: SimpleRouteHandler = apiHandler(
  postKangurLessonDocumentsHandler,
  {
    source: 'kangur.lesson-documents.POST',
    service: 'kangur.api',
    parseJsonBody: true,
  }
);

export const socialPostsGetHandler: SimpleRouteHandler = apiHandler(getKangurSocialPostsHandler, {
  source: 'kangur.social-posts.GET',
  service: 'kangur.api',
  querySchema: socialPostsQuerySchema,
});

export const socialPostsPostHandler: SimpleRouteHandler = apiHandler(postKangurSocialPostsHandler, {
  source: 'kangur.social-posts.POST',
  service: 'kangur.api',
  parseJsonBody: true,
});

export const socialImageAddonsGetHandler: SimpleRouteHandler = apiHandler(
  getKangurSocialImageAddonsHandler,
  {
    source: 'kangur.social-image-addons.GET',
    service: 'kangur.api',
    querySchema: socialImageAddonsQuerySchema,
  }
);

export const socialImageAddonsPostHandler: SimpleRouteHandler = apiHandler(
  postKangurSocialImageAddonsHandler,
  {
    source: 'kangur.social-image-addons.POST',
    service: 'kangur.api',
    parseJsonBody: true,
  }
);

export const socialPostGetHandler: ParamRouteHandler = apiHandlerWithParams<{ id: string }>(
  getKangurSocialPostHandler,
  {
    source: 'kangur.social-posts.[id].GET',
    service: 'kangur.api',
  }
);

export const socialPostPatchHandler: ParamRouteHandler = apiHandlerWithParams<{ id: string }>(
  patchKangurSocialPostHandler,
  {
    source: 'kangur.social-posts.[id].PATCH',
    service: 'kangur.api',
    parseJsonBody: true,
  }
);

export const socialPostPublishHandler: ParamRouteHandler = apiHandlerWithParams<{ id: string }>(
  postKangurSocialPostPublishHandler,
  {
    source: 'kangur.social-posts.[id].publish.POST',
    service: 'kangur.api',
  }
);

export const socialPostGenerateHandler: SimpleRouteHandler = apiHandler(
  postKangurSocialPostGenerateHandler,
  {
    source: 'kangur.social-posts.generate.POST',
    service: 'kangur.api',
    parseJsonBody: true,
  }
);

export const socialPostsPublishScheduledHandler: SimpleRouteHandler = apiHandler(
  postKangurSocialPostsPublishScheduledHandler,
  {
    source: 'kangur.social-posts.publish-scheduled.POST',
    service: 'kangur.api',
  }
);

export const numberBalanceCreateHandler: SimpleRouteHandler = apiHandler(
  postNumberBalanceCreateHandler,
  {
    source: 'kangur.number-balance.create.POST',
    service: 'kangur.api',
    parseJsonBody: true,
  }
);

export const numberBalanceJoinHandler: SimpleRouteHandler = apiHandler(postNumberBalanceJoinHandler, {
  source: 'kangur.number-balance.join.POST',
  service: 'kangur.api',
  parseJsonBody: true,
});

export const numberBalanceSolveHandler: SimpleRouteHandler = apiHandler(
  postNumberBalanceSolveHandler,
  {
    source: 'kangur.number-balance.solve.POST',
    service: 'kangur.api',
    parseJsonBody: true,
  }
);

export const numberBalanceStateHandler: SimpleRouteHandler = apiHandler(
  postNumberBalanceStateHandler,
  {
    source: 'kangur.number-balance.state.POST',
    service: 'kangur.api',
    parseJsonBody: true,
  }
);

export const observabilitySummaryHandler: SimpleRouteHandler = apiHandler(
  getKangurObservabilitySummaryHandler,
  {
    source: 'kangur.observability.summary.GET',
    service: 'kangur.api',
    querySchema: observabilityQuerySchema,
  }
);

export const ttsHandler: SimpleRouteHandler = apiHandler(postKangurTtsHandler, {
  source: 'kangur.tts.POST',
  service: 'kangur.api',
  parseJsonBody: true,
});

export const ttsProbeHandler: SimpleRouteHandler = apiHandler(postKangurTtsProbeHandler, {
  source: 'kangur.tts.probe.POST',
  service: 'kangur.api',
  parseJsonBody: true,
});

export const ttsStatusHandler: SimpleRouteHandler = apiHandler(postKangurTtsStatusHandler, {
  source: 'kangur.tts.status.POST',
  service: 'kangur.api',
  parseJsonBody: true,
});

export const handleMiscRouting = (request: NextRequest, segments: string[]): Promise<Response> | null => {
  if (segments[0] === 'assignments') {
    if (segments.length === 1) {
      return handleGetPost(request, assignmentsGetHandler, assignmentsPostHandler);
    }
    const id = segments[1];
    if (!id) return null;
    if (segments.length === 2) {
      if (request.method !== 'PATCH') return methodNotAllowed(request, ['PATCH'], request.method);
      return assignmentPatchHandler(request, { params: { id } });
    }
    if (segments[2] === 'reassign' && segments.length === 3) {
      if (request.method !== 'POST') return methodNotAllowed(request, ['POST'], request.method);
      return assignmentReassignHandler(request, { params: { id } });
    }
  }
  if (segments[0] === 'lessons' && segments.length === 1) {
    return handleGetPost(request, lessonsGetHandler, lessonsPostHandler);
  }
  if (segments[0] === 'lesson-documents' && segments.length === 1) {
    return handleGetPost(request, lessonDocumentsGetHandler, lessonDocumentsPostHandler);
  }
  if (segments[0] === 'social-posts') {
    if (segments.length === 1) {
      return handleGetPost(request, socialPostsGetHandler, socialPostsPostHandler);
    }
    if (segments[1] === 'generate' && segments.length === 2) {
      if (request.method !== 'POST') return methodNotAllowed(request, ['POST'], request.method);
      return socialPostGenerateHandler(request);
    }
    if (segments[1] === 'publish-scheduled' && segments.length === 2) {
      if (request.method !== 'POST') return methodNotAllowed(request, ['POST'], request.method);
      return socialPostsPublishScheduledHandler(request);
    }
    const id = segments[1];
    if (!id) return null;
    if (segments.length === 2) {
      if (request.method === 'GET') return socialPostGetHandler(request, { params: { id } });
      if (request.method === 'PATCH') return socialPostPatchHandler(request, { params: { id } });
      return methodNotAllowed(request, ['GET', 'PATCH'], request.method);
    }
    if (segments[2] === 'publish' && segments.length === 3) {
      if (request.method !== 'POST') return methodNotAllowed(request, ['POST'], request.method);
      return socialPostPublishHandler(request, { params: { id } });
    }
  }
  if (segments[0] === 'social-image-addons' && segments.length === 1) {
    return handleGetPost(request, socialImageAddonsGetHandler, socialImageAddonsPostHandler);
  }
  if (segments[0] === 'number-balance') {
    const sub = segments[1];
    if (sub === 'create' && segments.length === 2) {
      if (request.method !== 'POST') return methodNotAllowed(request, ['POST'], request.method);
      return numberBalanceCreateHandler(request);
    }
    if (sub === 'join' && segments.length === 2) {
      if (request.method !== 'POST') return methodNotAllowed(request, ['POST'], request.method);
      return numberBalanceJoinHandler(request);
    }
    if (sub === 'solve' && segments.length === 2) {
      if (request.method !== 'POST') return methodNotAllowed(request, ['POST'], request.method);
      return numberBalanceSolveHandler(request);
    }
    if (sub === 'state' && segments.length === 2) {
      if (request.method !== 'POST') return methodNotAllowed(request, ['POST'], request.method);
      return numberBalanceStateHandler(request);
    }
  }
  if (segments[0] === 'observability' && segments[1] === 'summary' && segments.length === 2) {
    if (request.method !== 'GET') return methodNotAllowed(request, ['GET'], request.method);
    return observabilitySummaryHandler(request);
  }
  if (segments[0] === 'tts') {
    if (segments.length === 1) {
      if (request.method !== 'POST') return methodNotAllowed(request, ['POST'], request.method);
      return ttsHandler(request);
    }
    if (segments[1] === 'probe' && segments.length === 2) {
      if (request.method !== 'POST') return methodNotAllowed(request, ['POST'], request.method);
      return ttsProbeHandler(request);
    }
    if (segments[1] === 'status' && segments.length === 2) {
      if (request.method !== 'POST') return methodNotAllowed(request, ['POST'], request.method);
      return ttsStatusHandler(request);
    }
  }
  return null;
};
