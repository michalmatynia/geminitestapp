import { describe, expect, it, vi } from 'vitest';

const apiWrappers = vi.hoisted(() => ({
  apiHandler: vi.fn((handler: unknown, options: unknown) => ({
    handler,
    kind: 'simple',
    options,
  })),
  apiHandlerWithParams: vi.fn((handler: unknown, options: unknown) => ({
    handler,
    kind: 'params',
    options,
  })),
}));

const rawRouting = vi.hoisted(() => ({
  handlers: {
    deleteImageJobs: vi.fn(),
    deletePost: vi.fn(),
    deletePosts: vi.fn(),
    getContext: vi.fn(),
    getImageAddons: vi.fn(),
    getImageBatch: vi.fn(),
    getImageServe: vi.fn(),
    getPipelineJobs: vi.fn(),
    getPipelineStatus: vi.fn(),
    getPost: vi.fn(),
    getPosts: vi.fn(),
    patchPost: vi.fn(),
    postAnalyzeVisuals: vi.fn(),
    postDeleteFallback: vi.fn(),
    postGenerate: vi.fn(),
    postImageAddons: vi.fn(),
    postImageBatch: vi.fn(),
    postPipelinePause: vi.fn(),
    postPipelineResume: vi.fn(),
    postPipelineTrigger: vi.fn(),
    postPost: vi.fn(),
    postPublish: vi.fn(),
    postPublishScheduled: vi.fn(),
    postUnpublish: vi.fn(),
  },
  schemas: {
    deleteImageJobsQuery: { name: 'deleteImageJobsQuery' },
    deletePostsQuery: { name: 'deletePostsQuery' },
    imageAddonsBatchQuery: { name: 'imageAddonsBatchQuery' },
    imageAddonsQuery: { name: 'imageAddonsQuery' },
    imageAddonsServeQuery: { name: 'imageAddonsServeQuery' },
    pipelineJobsQuery: { name: 'pipelineJobsQuery' },
    postContextQuery: { name: 'postContextQuery' },
    postsQuery: { name: 'postsQuery' },
  },
}));

vi.mock('server-only', () => ({}));

vi.mock('@/shared/lib/api/api-handler', () => apiWrappers);

vi.mock('@/app/api/filemaker/social-posts/handler', () => ({
  deleteSocialPublishingPostsHandler: rawRouting.handlers.deletePosts,
  deleteSocialPostsQuerySchema: rawRouting.schemas.deletePostsQuery,
  getSocialPublishingPostsHandler: rawRouting.handlers.getPosts,
  postSocialPublishingPostsHandler: rawRouting.handlers.postPost,
  querySchema: rawRouting.schemas.postsQuery,
}));

vi.mock('@/app/api/filemaker/social-posts/delete/handler', () => ({
  postSocialPublishingPostsDeleteHandler: rawRouting.handlers.postDeleteFallback,
}));

vi.mock('@/app/api/filemaker/social-posts/[id]/handler', () => ({
  deleteSocialPublishingPostHandler: rawRouting.handlers.deletePost,
  getSocialPublishingPostHandler: rawRouting.handlers.getPost,
  patchSocialPublishingPostHandler: rawRouting.handlers.patchPost,
}));

vi.mock('@/app/api/filemaker/social-posts/[id]/publish/handler', () => ({
  postSocialPublishingPostPublishHandler: rawRouting.handlers.postPublish,
}));

vi.mock('@/app/api/filemaker/social-posts/[id]/unpublish/handler', () => ({
  postSocialPublishingPostUnpublishHandler: rawRouting.handlers.postUnpublish,
}));

vi.mock('@/app/api/filemaker/social-posts/analyze-visuals/handler', () => ({
  postSocialPublishingPostAnalyzeVisualsHandler: rawRouting.handlers.postAnalyzeVisuals,
}));

vi.mock('@/app/api/filemaker/social-posts/context/handler', () => ({
  getSocialPublishingPostContextHandler: rawRouting.handlers.getContext,
  querySchema: rawRouting.schemas.postContextQuery,
}));

vi.mock('@/app/api/filemaker/social-posts/generate/handler', () => ({
  postSocialPublishingPostGenerateHandler: rawRouting.handlers.postGenerate,
}));

vi.mock('@/app/api/filemaker/social-posts/publish-scheduled/handler', () => ({
  postSocialPublishingPostsPublishScheduledHandler: rawRouting.handlers.postPublishScheduled,
}));

vi.mock('@/app/api/filemaker/social-image-addons/handler', () => ({
  getSocialPublishingImageAddonsHandler: rawRouting.handlers.getImageAddons,
  postSocialPublishingImageAddonsHandler: rawRouting.handlers.postImageAddons,
  querySchema: rawRouting.schemas.imageAddonsQuery,
}));

vi.mock('@/app/api/filemaker/social-image-addons/batch/handler', () => ({
  getSocialPublishingImageAddonsBatchHandler: rawRouting.handlers.getImageBatch,
  postSocialPublishingImageAddonsBatchHandler: rawRouting.handlers.postImageBatch,
  querySchema: rawRouting.schemas.imageAddonsBatchQuery,
}));

vi.mock('@/app/api/filemaker/social-image-addons/serve/handler', () => ({
  getHandler: rawRouting.handlers.getImageServe,
  querySchema: rawRouting.schemas.imageAddonsServeQuery,
}));

vi.mock('@/app/api/filemaker/social-pipeline/status/handler', () => ({
  getHandler: rawRouting.handlers.getPipelineStatus,
}));

vi.mock('@/app/api/filemaker/social-pipeline/jobs/handler', () => ({
  deleteHandler: rawRouting.handlers.deleteImageJobs,
  deleteQuerySchema: rawRouting.schemas.deleteImageJobsQuery,
  getHandler: rawRouting.handlers.getPipelineJobs,
  querySchema: rawRouting.schemas.pipelineJobsQuery,
}));

vi.mock('@/app/api/filemaker/social-pipeline/pause/handler', () => ({
  postHandler: rawRouting.handlers.postPipelinePause,
}));

vi.mock('@/app/api/filemaker/social-pipeline/resume/handler', () => ({
  postHandler: rawRouting.handlers.postPipelineResume,
}));

vi.mock('@/app/api/filemaker/social-pipeline/trigger/handler', () => ({
  postHandler: rawRouting.handlers.postPipelineTrigger,
}));

type WrappedRouteHandler = {
  handler: unknown;
  kind: 'params' | 'simple';
  options: {
    parseJsonBody?: boolean;
    querySchema?: unknown;
    service: string;
    source: string;
  };
};

describe('Filemaker social routing handlers', () => {
  it('wraps social publishing runtime handlers with Filemaker route metadata', async () => {
    const routing = (await import('./social-routing')) as Record<string, WrappedRouteHandler>;
    const expectedSources: Record<string, string> = {
      filemakerSocialImageAddonsBatchGetHandler: 'filemaker.social-image-addons.batch.GET',
      filemakerSocialImageAddonsBatchPostHandler: 'filemaker.social-image-addons.batch.POST',
      filemakerSocialImageAddonsGetHandler: 'filemaker.social-image-addons.GET',
      filemakerSocialImageAddonsPostHandler: 'filemaker.social-image-addons.POST',
      filemakerSocialImageAddonsServeGetHandler: 'filemaker.social-image-addons.serve.GET',
      filemakerSocialPipelineJobsDeleteHandler: 'filemaker.social-pipeline.jobs.DELETE',
      filemakerSocialPipelineJobsGetHandler: 'filemaker.social-pipeline.jobs.GET',
      filemakerSocialPipelinePausePostHandler: 'filemaker.social-pipeline.pause.POST',
      filemakerSocialPipelineResumePostHandler: 'filemaker.social-pipeline.resume.POST',
      filemakerSocialPipelineStatusGetHandler: 'filemaker.social-pipeline.status.GET',
      filemakerSocialPipelineTriggerPostHandler: 'filemaker.social-pipeline.trigger.POST',
      filemakerSocialPostAnalyzeVisualsHandler: 'filemaker.social-posts.analyze-visuals.POST',
      filemakerSocialPostContextGetHandler: 'filemaker.social-posts.context.GET',
      filemakerSocialPostDeleteHandler: 'filemaker.social-posts.[id].DELETE',
      filemakerSocialPostGenerateHandler: 'filemaker.social-posts.generate.POST',
      filemakerSocialPostGetHandler: 'filemaker.social-posts.[id].GET',
      filemakerSocialPostPatchHandler: 'filemaker.social-posts.[id].PATCH',
      filemakerSocialPostPublishHandler: 'filemaker.social-posts.[id].publish.POST',
      filemakerSocialPostUnpublishHandler: 'filemaker.social-posts.[id].unpublish.POST',
      filemakerSocialPostsDeleteHandler: 'filemaker.social-posts.DELETE',
      filemakerSocialPostsDeletePostHandler: 'filemaker.social-posts.delete.POST',
      filemakerSocialPostsGetHandler: 'filemaker.social-posts.GET',
      filemakerSocialPostsPostHandler: 'filemaker.social-posts.POST',
      filemakerSocialPostsPublishScheduledHandler:
        'filemaker.social-posts.publish-scheduled.POST',
    };

    Object.entries(expectedSources).forEach(([exportName, source]) => {
      expect(routing[exportName]?.options).toMatchObject({
        service: 'filemaker.api',
        source,
      });
    });
  });

  it('keeps body parsing and query parsing options aligned with the legacy handlers', async () => {
    const routing = (await import('./social-routing')) as Record<string, WrappedRouteHandler>;

    [
      'filemakerSocialImageAddonsBatchPostHandler',
      'filemakerSocialImageAddonsPostHandler',
      'filemakerSocialPipelineTriggerPostHandler',
      'filemakerSocialPostAnalyzeVisualsHandler',
      'filemakerSocialPostGenerateHandler',
      'filemakerSocialPostPatchHandler',
      'filemakerSocialPostPublishHandler',
      'filemakerSocialPostUnpublishHandler',
      'filemakerSocialPostsDeletePostHandler',
      'filemakerSocialPostsPostHandler',
    ].forEach((exportName) => {
      expect(routing[exportName]?.options.parseJsonBody).toBe(true);
    });

    expect(routing['filemakerSocialPostsGetHandler']?.options.querySchema).toBe(
      rawRouting.schemas.postsQuery
    );
    expect(routing['filemakerSocialPostsDeleteHandler']?.options.querySchema).toBe(
      rawRouting.schemas.deletePostsQuery
    );
    expect(routing['filemakerSocialImageAddonsBatchGetHandler']?.options.querySchema).toBe(
      rawRouting.schemas.imageAddonsBatchQuery
    );
    expect(routing['filemakerSocialPipelineJobsDeleteHandler']?.options.querySchema).toBe(
      rawRouting.schemas.deleteImageJobsQuery
    );
  });

  it('uses parameter-aware wrappers for post-specific routes only', async () => {
    const routing = (await import('./social-routing')) as Record<string, WrappedRouteHandler>;

    [
      'filemakerSocialPostDeleteHandler',
      'filemakerSocialPostGetHandler',
      'filemakerSocialPostPatchHandler',
      'filemakerSocialPostPublishHandler',
      'filemakerSocialPostUnpublishHandler',
    ].forEach((exportName) => {
      expect(routing[exportName]?.kind).toBe('params');
    });

    expect(routing['filemakerSocialPostsGetHandler']?.kind).toBe('simple');
    expect(routing['filemakerSocialPipelineJobsGetHandler']?.kind).toBe('simple');
  });
});
