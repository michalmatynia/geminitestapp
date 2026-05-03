import { type NextRequest } from 'next/server';
import { apiHandler, apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import { kangurAssignmentCreateInputSchema } from '@kangur/contracts/kangur-assignments';
import {
  getKangurAssignmentsHandler,
  postKangurAssignmentsHandler,
  querySchema as assignmentsQuerySchema,
} from '../../assignments/handler';
import { patchKangurAssignmentHandler } from '../../assignments/[id]/handler';
import { postKangurAssignmentReassignHandler } from '../../assignments/[id]/reassign/handler';
import {
  getKangurGameLibraryPageHandler,
  querySchema as gameLibraryPageQuerySchema,
} from '../../game-library-page/handler';
import {
  getKangurLessonsHandler,
  postKangurLessonsHandler,
  querySchema as lessonsQuerySchema,
} from '../../lessons/handler';
import {
  getKangurLessonsCatalogHandler,
  querySchema as lessonsCatalogQuerySchema,
} from '../../lessons-catalog/handler';
import {
  getKangurLessonDocumentHandler,
  getKangurLessonDocumentsHandler,
  postKangurLessonDocumentsHandler,
} from '../../lesson-documents/handler';
import {
  getKangurLessonSectionsHandler,
  postKangurLessonSectionsHandler,
  querySchema as lessonSectionsQuerySchema,
} from '../../lesson-sections/handler';
import {
  getKangurLessonGameSectionsHandler,
  postKangurLessonGameSectionsHandler,
  querySchema as lessonGameSectionsQuerySchema,
} from '../../lesson-game-sections/handler';
import {
  getKangurGameContentSetsHandler,
  postKangurGameContentSetsHandler,
  querySchema as gameContentSetsQuerySchema,
} from '../../game-content-sets/handler';
import {
  getKangurGameInstancesHandler,
  postKangurGameInstancesHandler,
  querySchema as gameInstancesQuerySchema,
} from '../../game-instances/handler';
import {
  getKangurLessonTemplatesHandler,
  postKangurLessonTemplatesHandler,
  querySchema as lessonTemplatesQuerySchema,
} from '../../lesson-templates/handler';
import {
  deleteKangurSocialPostsHandler,
  getKangurSocialPostsHandler,
  postKangurSocialPostsHandler,
  deleteSocialPostsQuerySchema,
  querySchema as socialPostsQuerySchema,
} from '../../social-posts/handler';
import { postKangurSocialPostsDeleteHandler } from '../../social-posts/delete/handler';
import {
  getKangurSocialImageAddonsHandler,
  postKangurSocialImageAddonsHandler,
  querySchema as socialImageAddonsQuerySchema,
} from '../../social-image-addons/handler';
import {
  getKangurSocialImageAddonsBatchHandler,
  postKangurSocialImageAddonsBatchHandler,
  querySchema as socialImageAddonsBatchQuerySchema,
} from '../../social-image-addons/batch/handler';
import {
  getHandler as getKangurSocialImageAddonsServeHandler,
  querySchema as socialImageAddonsServeQuerySchema,
} from '../../social-image-addons/serve/handler';
import {
  getKangurSocialPostHandler,
  deleteKangurSocialPostHandler,
  patchKangurSocialPostHandler,
} from '../../social-posts/[id]/handler';
import { postKangurSocialPostPublishHandler } from '../../social-posts/[id]/publish/handler';
import { postKangurSocialPostUnpublishHandler } from '../../social-posts/[id]/unpublish/handler';
import { postKangurSocialPostAnalyzeVisualsHandler } from '../../social-posts/analyze-visuals/handler';
import { postKangurSocialPostGenerateHandler } from '../../social-posts/generate/handler';
import {
  getKangurSocialPostContextHandler,
  querySchema as socialPostContextQuerySchema,
} from '../../social-posts/context/handler';
import { postKangurSocialPostsPublishScheduledHandler } from '../../social-posts/publish-scheduled/handler';
import { postNumberBalanceCreateHandler } from '../../number-balance/create/handler';
import { postNumberBalanceJoinHandler } from '../../number-balance/join/handler';
import { postNumberBalanceSolveHandler } from '../../number-balance/solve/handler';
import { postNumberBalanceStateHandler } from '../../number-balance/state/handler';
import { getHandler as getKangurObservabilitySummaryHandler, querySchema as observabilityQuerySchema } from '../../observability/summary/handler';
import { getHandler as getKangurSocialPipelineStatusHandler } from '../../social-pipeline/status/handler';
import * as kangurSocialPipelineTriggerRoute from '../../social-pipeline/trigger/handler';
import * as kangurSocialPipelineJobsRoute from '../../social-pipeline/jobs/handler';
import { postHandler as postKangurSocialPipelinePauseHandler } from '../../social-pipeline/pause/handler';
import { postHandler as postKangurSocialPipelineResumeHandler } from '../../social-pipeline/resume/handler';
import { postKangurTtsHandler } from '../../tts/handler';
import { postKangurTtsProbeHandler } from '../../tts/probe/handler';
import { postKangurTtsStatusHandler } from '../../tts/status/handler';
import {
  handleGetPost,
  methodNotAllowed,
  type SimpleRouteHandler,
  type ParamRouteHandler,
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

export const assignmentPatchHandler: ParamRouteHandler<{ id: string }> =
  apiHandlerWithParams<{ id: string }>(
  patchKangurAssignmentHandler,
  {
    source: 'kangur.assignments.[id].PATCH',
    service: 'kangur.api',
    parseJsonBody: true,
  }
);

export const assignmentReassignHandler: ParamRouteHandler<{ id: string }> =
  apiHandlerWithParams<{ id: string }>(postKangurAssignmentReassignHandler, {
    source: 'kangur.assignments.[id].reassign.POST',
    service: 'kangur.api',
  });

export const lessonsGetHandler: SimpleRouteHandler = apiHandler(getKangurLessonsHandler, {
  source: 'kangur.lessons.GET',
  service: 'kangur.api',
  querySchema: lessonsQuerySchema,
});

export const lessonsCatalogGetHandler: SimpleRouteHandler = apiHandler(
  getKangurLessonsCatalogHandler,
  {
    source: 'kangur.lessons-catalog.GET',
    service: 'kangur.api',
    querySchema: lessonsCatalogQuerySchema,
  }
);

export const gameLibraryPageGetHandler: SimpleRouteHandler = apiHandler(
  getKangurGameLibraryPageHandler,
  {
    source: 'kangur.game-library-page.GET',
    service: 'kangur.api',
    querySchema: gameLibraryPageQuerySchema,
  }
);

export const lessonsPostHandler: SimpleRouteHandler = apiHandler(postKangurLessonsHandler, {
  source: 'kangur.lessons.POST',
  service: 'kangur.api',
  parseJsonBody: true,
});

export const lessonSectionsGetHandler: SimpleRouteHandler = apiHandler(
  getKangurLessonSectionsHandler,
  {
    source: 'kangur.lesson-sections.GET',
    service: 'kangur.api',
    querySchema: lessonSectionsQuerySchema,
  }
);

export const lessonSectionsPostHandler: SimpleRouteHandler = apiHandler(
  postKangurLessonSectionsHandler,
  {
    source: 'kangur.lesson-sections.POST',
    service: 'kangur.api',
    parseJsonBody: true,
  }
);

export const lessonGameSectionsGetHandler: SimpleRouteHandler = apiHandler(
  getKangurLessonGameSectionsHandler,
  {
    source: 'kangur.lesson-game-sections.GET',
    service: 'kangur.api',
    querySchema: lessonGameSectionsQuerySchema,
  }
);

export const lessonGameSectionsPostHandler: SimpleRouteHandler = apiHandler(
  postKangurLessonGameSectionsHandler,
  {
    source: 'kangur.lesson-game-sections.POST',
    service: 'kangur.api',
    parseJsonBody: true,
  }
);

export const gameInstancesGetHandler: SimpleRouteHandler = apiHandler(
  getKangurGameInstancesHandler,
  {
    source: 'kangur.game-instances.GET',
    service: 'kangur.api',
    querySchema: gameInstancesQuerySchema,
  }
);

export const gameContentSetsGetHandler: SimpleRouteHandler = apiHandler(
  getKangurGameContentSetsHandler,
  {
    source: 'kangur.game-content-sets.GET',
    service: 'kangur.api',
    querySchema: gameContentSetsQuerySchema,
  }
);

export const gameContentSetsPostHandler: SimpleRouteHandler = apiHandler(
  postKangurGameContentSetsHandler,
  {
    source: 'kangur.game-content-sets.POST',
    service: 'kangur.api',
    parseJsonBody: true,
  }
);

export const gameInstancesPostHandler: SimpleRouteHandler = apiHandler(
  postKangurGameInstancesHandler,
  {
    source: 'kangur.game-instances.POST',
    service: 'kangur.api',
    parseJsonBody: true,
  }
);

export const lessonTemplatesGetHandler: SimpleRouteHandler = apiHandler(
  getKangurLessonTemplatesHandler,
  {
    source: 'kangur.lesson-templates.GET',
    service: 'kangur.api',
    querySchema: lessonTemplatesQuerySchema,
  }
);

export const lessonTemplatesPostHandler: SimpleRouteHandler = apiHandler(
  postKangurLessonTemplatesHandler,
  {
    source: 'kangur.lesson-templates.POST',
    service: 'kangur.api',
    parseJsonBody: true,
  }
);

export const lessonDocumentsGetHandler: SimpleRouteHandler = apiHandler(
  getKangurLessonDocumentsHandler,
  {
    source: 'kangur.lesson-documents.GET',
    service: 'kangur.api',
  }
);

export const lessonDocumentGetHandler: ParamRouteHandler<{ lessonId: string }> =
  apiHandlerWithParams<{ lessonId: string }>(getKangurLessonDocumentHandler, {
  source: 'kangur.lesson-documents.[lessonId].GET',
  service: 'kangur.api',
  });

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

export const socialPostsDeleteHandler: SimpleRouteHandler = apiHandler(
  deleteKangurSocialPostsHandler,
  {
    source: 'kangur.social-posts.DELETE',
    service: 'kangur.api',
    querySchema: deleteSocialPostsQuerySchema,
  }
);

export const socialPostsDeletePostHandler: SimpleRouteHandler = apiHandler(
  postKangurSocialPostsDeleteHandler,
  {
    source: 'kangur.social-posts.delete.POST',
    service: 'kangur.api',
    parseJsonBody: true,
  }
);

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

export const socialImageAddonsBatchHandler: SimpleRouteHandler = apiHandler(
  postKangurSocialImageAddonsBatchHandler,
  {
    source: 'kangur.social-image-addons.batch.POST',
    service: 'kangur.api',
    parseJsonBody: true,
  }
);

export const socialImageAddonsBatchGetHandler: SimpleRouteHandler = apiHandler(
  getKangurSocialImageAddonsBatchHandler,
  {
    source: 'kangur.social-image-addons.batch.GET',
    service: 'kangur.api',
    querySchema: socialImageAddonsBatchQuerySchema,
  }
);

export const socialImageAddonsServeHandler: SimpleRouteHandler = apiHandler(
  getKangurSocialImageAddonsServeHandler,
  {
    source: 'kangur.social-image-addons.serve.GET',
    service: 'kangur.api',
    querySchema: socialImageAddonsServeQuerySchema,
  }
);

export const socialPostGetHandler: ParamRouteHandler<{ id: string }> = apiHandlerWithParams<{ id: string }>(
  getKangurSocialPostHandler,
  {
    source: 'kangur.social-posts.[id].GET',
    service: 'kangur.api',
  }
);

export const socialPostPatchHandler: ParamRouteHandler<{ id: string }> =
  apiHandlerWithParams<{ id: string }>(patchKangurSocialPostHandler, {
    source: 'kangur.social-posts.[id].PATCH',
    service: 'kangur.api',
    parseJsonBody: true,
  });

export const socialPostDeleteHandler: ParamRouteHandler<{ id: string }> =
  apiHandlerWithParams<{ id: string }>(deleteKangurSocialPostHandler, {
    source: 'kangur.social-posts.[id].DELETE',
    service: 'kangur.api',
  });

export const socialPostPublishHandler: ParamRouteHandler<{ id: string }> =
  apiHandlerWithParams<{ id: string }>(postKangurSocialPostPublishHandler, {
    source: 'kangur.social-posts.[id].publish.POST',
    service: 'kangur.api',
    parseJsonBody: true,
  });

export const socialPostUnpublishHandler: ParamRouteHandler<{ id: string }> =
  apiHandlerWithParams<{ id: string }>(postKangurSocialPostUnpublishHandler, {
    source: 'kangur.social-posts.[id].unpublish.POST',
    service: 'kangur.api',
    parseJsonBody: true,
  });

export const socialPostGenerateHandler: SimpleRouteHandler = apiHandler(
  postKangurSocialPostGenerateHandler,
  {
    source: 'kangur.social-posts.generate.POST',
    service: 'kangur.api',
    parseJsonBody: true,
  }
);

export const socialPostAnalyzeVisualsHandler: SimpleRouteHandler = apiHandler(
  postKangurSocialPostAnalyzeVisualsHandler,
  {
    source: 'kangur.social-posts.analyze-visuals.POST',
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

export const socialPostContextGetHandler: SimpleRouteHandler = apiHandler(
  getKangurSocialPostContextHandler,
  {
    source: 'kangur.social-posts.context.GET',
    service: 'kangur.api',
    querySchema: socialPostContextQuerySchema,
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

export const socialPipelineStatusHandler: SimpleRouteHandler = apiHandler(
  getKangurSocialPipelineStatusHandler,
  {
    source: 'kangur.social-pipeline.status.GET',
    service: 'kangur.api',
  }
);

export const socialPipelineTriggerHandler: SimpleRouteHandler = apiHandler(
  kangurSocialPipelineTriggerRoute.postHandler,
  {
    source: 'kangur.social-pipeline.trigger.POST',
    service: 'kangur.api',
    parseJsonBody: true,
  }
);

export const socialPipelineJobsHandler: SimpleRouteHandler = apiHandler(
  kangurSocialPipelineJobsRoute.getHandler,
  {
    source: 'kangur.social-pipeline.jobs.GET',
    service: 'kangur.api',
    querySchema: kangurSocialPipelineJobsRoute.querySchema,
  }
);

export const socialPipelineJobsDeleteHandler: SimpleRouteHandler = apiHandler(
  kangurSocialPipelineJobsRoute.deleteHandler,
  {
    source: 'kangur.social-pipeline.jobs.DELETE',
    service: 'kangur.api',
    querySchema: kangurSocialPipelineJobsRoute.deleteQuerySchema,
  }
);

export const socialPipelinePauseHandler: SimpleRouteHandler = apiHandler(
  postKangurSocialPipelinePauseHandler,
  {
    source: 'kangur.social-pipeline.pause.POST',
    service: 'kangur.api',
  }
);

export const socialPipelineResumeHandler: SimpleRouteHandler = apiHandler(
  postKangurSocialPipelineResumeHandler,
  {
    source: 'kangur.social-pipeline.resume.POST',
    service: 'kangur.api',
  }
);

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
  if (segments[0] === 'lessons-catalog' && segments.length === 1) {
    if (request.method !== 'GET') return methodNotAllowed(request, ['GET'], request.method);
    return lessonsCatalogGetHandler(request);
  }
  if (segments[0] === 'game-library-page' && segments.length === 1) {
    if (request.method !== 'GET') return methodNotAllowed(request, ['GET'], request.method);
    return gameLibraryPageGetHandler(request);
  }
  if (segments[0] === 'lesson-sections' && segments.length === 1) {
    return handleGetPost(request, lessonSectionsGetHandler, lessonSectionsPostHandler);
  }
  if (segments[0] === 'lesson-game-sections' && segments.length === 1) {
    return handleGetPost(request, lessonGameSectionsGetHandler, lessonGameSectionsPostHandler);
  }
  if (segments[0] === 'game-instances' && segments.length === 1) {
    return handleGetPost(request, gameInstancesGetHandler, gameInstancesPostHandler);
  }
  if (segments[0] === 'game-content-sets' && segments.length === 1) {
    return handleGetPost(request, gameContentSetsGetHandler, gameContentSetsPostHandler);
  }
  if (segments[0] === 'lesson-templates' && segments.length === 1) {
    return handleGetPost(request, lessonTemplatesGetHandler, lessonTemplatesPostHandler);
  }
  if (segments[0] === 'lesson-documents') {
    if (segments.length === 1) {
      return handleGetPost(request, lessonDocumentsGetHandler, lessonDocumentsPostHandler);
    }
    const lessonId = segments[1];
    if (!lessonId) return null;
    if (segments.length === 2) {
      if (request.method !== 'GET') return methodNotAllowed(request, ['GET'], request.method);
      return lessonDocumentGetHandler(request, { params: { lessonId } });
    }
  }
  if (segments[0] === 'social-posts') {
    if (segments.length === 1) {
      if (request.method === 'DELETE') {
        return socialPostsDeleteHandler(request);
      }
      return handleGetPost(request, socialPostsGetHandler, socialPostsPostHandler);
    }
    if (segments[1] === 'delete' && segments.length === 2) {
      if (request.method !== 'POST') return methodNotAllowed(request, ['POST'], request.method);
      return socialPostsDeletePostHandler(request);
    }
    if (segments[1] === 'context' && segments.length === 2) {
      if (request.method !== 'GET') return methodNotAllowed(request, ['GET'], request.method);
      return socialPostContextGetHandler(request);
    }
    if (segments[1] === 'generate' && segments.length === 2) {
      if (request.method !== 'POST') return methodNotAllowed(request, ['POST'], request.method);
      return socialPostGenerateHandler(request);
    }
    if (segments[1] === 'analyze-visuals' && segments.length === 2) {
      if (request.method !== 'POST') return methodNotAllowed(request, ['POST'], request.method);
      return socialPostAnalyzeVisualsHandler(request);
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
      if (request.method === 'DELETE') return socialPostDeleteHandler(request, { params: { id } });
      return methodNotAllowed(request, ['GET', 'PATCH', 'DELETE'], request.method);
    }
    if (segments[2] === 'publish' && segments.length === 3) {
      if (request.method !== 'POST') return methodNotAllowed(request, ['POST'], request.method);
      return socialPostPublishHandler(request, { params: { id } });
    }
    if (segments[2] === 'unpublish' && segments.length === 3) {
      if (request.method !== 'POST') return methodNotAllowed(request, ['POST'], request.method);
      return socialPostUnpublishHandler(request, { params: { id } });
    }
  }
  if (segments[0] === 'social-image-addons') {
    if (segments.length === 1) {
      return handleGetPost(request, socialImageAddonsGetHandler, socialImageAddonsPostHandler);
    }
    if (segments[1] === 'batch' && segments.length === 2) {
      if (request.method === 'GET') {
        return socialImageAddonsBatchGetHandler(request);
      }
      if (request.method === 'POST') {
        return socialImageAddonsBatchHandler(request);
      }
      return methodNotAllowed(request, ['GET', 'POST'], request.method);
    }
    if (segments[1] === 'serve' && segments.length === 2) {
      if (request.method !== 'GET') return methodNotAllowed(request, ['GET'], request.method);
      return socialImageAddonsServeHandler(request);
    }
  }
  if (segments[0] === 'social-pipeline') {
    if (segments[1] === 'status' && segments.length === 2) {
      if (request.method !== 'GET') return methodNotAllowed(request, ['GET'], request.method);
      return socialPipelineStatusHandler(request);
    }
    if (segments[1] === 'trigger' && segments.length === 2) {
      if (request.method !== 'POST') return methodNotAllowed(request, ['POST'], request.method);
      return socialPipelineTriggerHandler(request);
    }
    if (segments[1] === 'jobs' && segments.length === 2) {
      if (request.method === 'GET') {
        return socialPipelineJobsHandler(request);
      }
      if (request.method === 'DELETE') {
        return socialPipelineJobsDeleteHandler(request);
      }
      return methodNotAllowed(request, ['GET', 'DELETE'], request.method);
    }
    if (segments[1] === 'pause' && segments.length === 2) {
      if (request.method !== 'POST') return methodNotAllowed(request, ['POST'], request.method);
      return socialPipelinePauseHandler(request);
    }
    if (segments[1] === 'resume' && segments.length === 2) {
      if (request.method !== 'POST') return methodNotAllowed(request, ['POST'], request.method);
      return socialPipelineResumeHandler(request);
    }
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
