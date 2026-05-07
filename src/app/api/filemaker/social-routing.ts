import 'server-only';

import { apiHandler, apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import {
  deleteSocialPublishingPostsHandler,
  deleteSocialPostsQuerySchema,
  getSocialPublishingPostsHandler,
  postSocialPublishingPostsHandler,
  querySchema as socialPostsQuerySchema,
} from '@/app/api/filemaker/social-posts/handler';
import { postSocialPublishingPostsDeleteHandler } from '@/app/api/filemaker/social-posts/delete/handler';
import {
  deleteSocialPublishingPostHandler,
  getSocialPublishingPostHandler,
  patchSocialPublishingPostHandler,
} from '@/app/api/filemaker/social-posts/[id]/handler';
import {
  postSocialPublishingPostPublishHandler,
} from '@/app/api/filemaker/social-posts/[id]/publish/handler';
import {
  postSocialPublishingPostUnpublishHandler,
} from '@/app/api/filemaker/social-posts/[id]/unpublish/handler';
import {
  postSocialPublishingPostAnalyzeVisualsHandler,
} from '@/app/api/filemaker/social-posts/analyze-visuals/handler';
import {
  getSocialPublishingPostContextHandler,
  querySchema as socialPostContextQuerySchema,
} from '@/app/api/filemaker/social-posts/context/handler';
import {
  postSocialPublishingPostGenerateHandler,
} from '@/app/api/filemaker/social-posts/generate/handler';
import {
  postSocialPublishingPostsPublishScheduledHandler,
} from '@/app/api/filemaker/social-posts/publish-scheduled/handler';
import {
  getSocialPublishingImageAddonsHandler,
  postSocialPublishingImageAddonsHandler,
  querySchema as socialImageAddonsQuerySchema,
} from '@/app/api/filemaker/social-image-addons/handler';
import {
  getSocialPublishingImageAddonsBatchHandler,
  postSocialPublishingImageAddonsBatchHandler,
  querySchema as socialImageAddonsBatchQuerySchema,
} from '@/app/api/filemaker/social-image-addons/batch/handler';
import {
  getHandler as getSocialPublishingImageAddonsServeHandler,
  querySchema as socialImageAddonsServeQuerySchema,
} from '@/app/api/filemaker/social-image-addons/serve/handler';
import {
  getHandler as getSocialPublishingPipelineStatusHandler,
} from '@/app/api/filemaker/social-pipeline/status/handler';
import * as socialPublishingPipelineJobsRoute from '@/app/api/filemaker/social-pipeline/jobs/handler';
import {
  postHandler as postSocialPublishingPipelinePauseHandler,
} from '@/app/api/filemaker/social-pipeline/pause/handler';
import {
  postHandler as postSocialPublishingPipelineResumeHandler,
} from '@/app/api/filemaker/social-pipeline/resume/handler';
import {
  postHandler as postSocialPublishingPipelineTriggerHandler,
} from '@/app/api/filemaker/social-pipeline/trigger/handler';

export const filemakerSocialPostsGetHandler = apiHandler(getSocialPublishingPostsHandler, {
  source: 'filemaker.social-posts.GET',
  service: 'filemaker.api',
  querySchema: socialPostsQuerySchema,
});

export const filemakerSocialPostsPostHandler = apiHandler(postSocialPublishingPostsHandler, {
  source: 'filemaker.social-posts.POST',
  service: 'filemaker.api',
  parseJsonBody: true,
});

export const filemakerSocialPostsDeleteHandler = apiHandler(deleteSocialPublishingPostsHandler, {
  source: 'filemaker.social-posts.DELETE',
  service: 'filemaker.api',
  querySchema: deleteSocialPostsQuerySchema,
});

export const filemakerSocialPostsDeletePostHandler = apiHandler(
  postSocialPublishingPostsDeleteHandler,
  {
    source: 'filemaker.social-posts.delete.POST',
    service: 'filemaker.api',
    parseJsonBody: true,
  }
);

export const filemakerSocialPostContextGetHandler = apiHandler(
  getSocialPublishingPostContextHandler,
  {
    source: 'filemaker.social-posts.context.GET',
    service: 'filemaker.api',
    querySchema: socialPostContextQuerySchema,
  }
);

export const filemakerSocialPostGenerateHandler = apiHandler(
  postSocialPublishingPostGenerateHandler,
  {
    source: 'filemaker.social-posts.generate.POST',
    service: 'filemaker.api',
    parseJsonBody: true,
  }
);

export const filemakerSocialPostAnalyzeVisualsHandler = apiHandler(
  postSocialPublishingPostAnalyzeVisualsHandler,
  {
    source: 'filemaker.social-posts.analyze-visuals.POST',
    service: 'filemaker.api',
    parseJsonBody: true,
  }
);

export const filemakerSocialPostsPublishScheduledHandler = apiHandler(
  postSocialPublishingPostsPublishScheduledHandler,
  {
    source: 'filemaker.social-posts.publish-scheduled.POST',
    service: 'filemaker.api',
  }
);

export const filemakerSocialPostGetHandler = apiHandlerWithParams<{ id: string }>(
  getSocialPublishingPostHandler,
  {
    source: 'filemaker.social-posts.[id].GET',
    service: 'filemaker.api',
  }
);

export const filemakerSocialPostPatchHandler = apiHandlerWithParams<{ id: string }>(
  patchSocialPublishingPostHandler,
  {
    source: 'filemaker.social-posts.[id].PATCH',
    service: 'filemaker.api',
    parseJsonBody: true,
  }
);

export const filemakerSocialPostDeleteHandler = apiHandlerWithParams<{ id: string }>(
  deleteSocialPublishingPostHandler,
  {
    source: 'filemaker.social-posts.[id].DELETE',
    service: 'filemaker.api',
  }
);

export const filemakerSocialPostPublishHandler = apiHandlerWithParams<{ id: string }>(
  postSocialPublishingPostPublishHandler,
  {
    source: 'filemaker.social-posts.[id].publish.POST',
    service: 'filemaker.api',
    parseJsonBody: true,
  }
);

export const filemakerSocialPostUnpublishHandler = apiHandlerWithParams<{ id: string }>(
  postSocialPublishingPostUnpublishHandler,
  {
    source: 'filemaker.social-posts.[id].unpublish.POST',
    service: 'filemaker.api',
    parseJsonBody: true,
  }
);

export const filemakerSocialImageAddonsGetHandler = apiHandler(
  getSocialPublishingImageAddonsHandler,
  {
    source: 'filemaker.social-image-addons.GET',
    service: 'filemaker.api',
    querySchema: socialImageAddonsQuerySchema,
  }
);

export const filemakerSocialImageAddonsPostHandler = apiHandler(
  postSocialPublishingImageAddonsHandler,
  {
    source: 'filemaker.social-image-addons.POST',
    service: 'filemaker.api',
    parseJsonBody: true,
  }
);

export const filemakerSocialImageAddonsBatchGetHandler = apiHandler(
  getSocialPublishingImageAddonsBatchHandler,
  {
    source: 'filemaker.social-image-addons.batch.GET',
    service: 'filemaker.api',
    querySchema: socialImageAddonsBatchQuerySchema,
  }
);

export const filemakerSocialImageAddonsBatchPostHandler = apiHandler(
  postSocialPublishingImageAddonsBatchHandler,
  {
    source: 'filemaker.social-image-addons.batch.POST',
    service: 'filemaker.api',
    parseJsonBody: true,
  }
);

export const filemakerSocialImageAddonsServeGetHandler = apiHandler(
  getSocialPublishingImageAddonsServeHandler,
  {
    source: 'filemaker.social-image-addons.serve.GET',
    service: 'filemaker.api',
    querySchema: socialImageAddonsServeQuerySchema,
  }
);

export const filemakerSocialPipelineStatusGetHandler = apiHandler(
  getSocialPublishingPipelineStatusHandler,
  {
    source: 'filemaker.social-pipeline.status.GET',
    service: 'filemaker.api',
  }
);

export const filemakerSocialPipelineTriggerPostHandler = apiHandler(
  postSocialPublishingPipelineTriggerHandler,
  {
    source: 'filemaker.social-pipeline.trigger.POST',
    service: 'filemaker.api',
    parseJsonBody: true,
  }
);

export const filemakerSocialPipelineJobsGetHandler = apiHandler(
  socialPublishingPipelineJobsRoute.getHandler,
  {
    source: 'filemaker.social-pipeline.jobs.GET',
    service: 'filemaker.api',
    querySchema: socialPublishingPipelineJobsRoute.querySchema,
  }
);

export const filemakerSocialPipelineJobsDeleteHandler = apiHandler(
  socialPublishingPipelineJobsRoute.deleteHandler,
  {
    source: 'filemaker.social-pipeline.jobs.DELETE',
    service: 'filemaker.api',
    querySchema: socialPublishingPipelineJobsRoute.deleteQuerySchema,
  }
);

export const filemakerSocialPipelinePausePostHandler = apiHandler(
  postSocialPublishingPipelinePauseHandler,
  {
    source: 'filemaker.social-pipeline.pause.POST',
    service: 'filemaker.api',
  }
);

export const filemakerSocialPipelineResumePostHandler = apiHandler(
  postSocialPublishingPipelineResumeHandler,
  {
    source: 'filemaker.social-pipeline.resume.POST',
    service: 'filemaker.api',
  }
);
