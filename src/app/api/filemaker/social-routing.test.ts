import { describe, expect, it, vi } from 'vitest';

const routeHandlers = vi.hoisted(() => ({
  socialImageAddonsBatchGet: vi.fn(),
  socialImageAddonsBatchPost: vi.fn(),
  socialImageAddonsGet: vi.fn(),
  socialImageAddonsPost: vi.fn(),
  socialImageAddonsServeGet: vi.fn(),
  socialPipelineJobsDelete: vi.fn(),
  socialPipelineJobsGet: vi.fn(),
  socialPipelinePausePost: vi.fn(),
  socialPipelineResumePost: vi.fn(),
  socialPipelineStatusGet: vi.fn(),
  socialPipelineTriggerPost: vi.fn(),
  socialPostAnalyzeVisualsPost: vi.fn(),
  socialPostContextGet: vi.fn(),
  socialPostDelete: vi.fn(),
  socialPostGeneratePost: vi.fn(),
  socialPostGet: vi.fn(),
  socialPostPatch: vi.fn(),
  socialPostPublish: vi.fn(),
  socialPostUnpublish: vi.fn(),
  socialPostsDelete: vi.fn(),
  socialPostsDeletePost: vi.fn(),
  socialPostsGet: vi.fn(),
  socialPostsPost: vi.fn(),
  socialPostsPublishScheduledPost: vi.fn(),
}));

vi.mock('@/app/api/filemaker/social-routing', () => ({
  filemakerSocialImageAddonsBatchGetHandler: routeHandlers.socialImageAddonsBatchGet,
  filemakerSocialImageAddonsBatchPostHandler: routeHandlers.socialImageAddonsBatchPost,
  filemakerSocialImageAddonsGetHandler: routeHandlers.socialImageAddonsGet,
  filemakerSocialImageAddonsPostHandler: routeHandlers.socialImageAddonsPost,
  filemakerSocialImageAddonsServeGetHandler: routeHandlers.socialImageAddonsServeGet,
  filemakerSocialPipelineJobsDeleteHandler: routeHandlers.socialPipelineJobsDelete,
  filemakerSocialPipelineJobsGetHandler: routeHandlers.socialPipelineJobsGet,
  filemakerSocialPipelinePausePostHandler: routeHandlers.socialPipelinePausePost,
  filemakerSocialPipelineResumePostHandler: routeHandlers.socialPipelineResumePost,
  filemakerSocialPipelineStatusGetHandler: routeHandlers.socialPipelineStatusGet,
  filemakerSocialPipelineTriggerPostHandler: routeHandlers.socialPipelineTriggerPost,
  filemakerSocialPostAnalyzeVisualsHandler: routeHandlers.socialPostAnalyzeVisualsPost,
  filemakerSocialPostContextGetHandler: routeHandlers.socialPostContextGet,
  filemakerSocialPostDeleteHandler: routeHandlers.socialPostDelete,
  filemakerSocialPostGenerateHandler: routeHandlers.socialPostGeneratePost,
  filemakerSocialPostGetHandler: routeHandlers.socialPostGet,
  filemakerSocialPostPatchHandler: routeHandlers.socialPostPatch,
  filemakerSocialPostPublishHandler: routeHandlers.socialPostPublish,
  filemakerSocialPostUnpublishHandler: routeHandlers.socialPostUnpublish,
  filemakerSocialPostsDeleteHandler: routeHandlers.socialPostsDelete,
  filemakerSocialPostsDeletePostHandler: routeHandlers.socialPostsDeletePost,
  filemakerSocialPostsGetHandler: routeHandlers.socialPostsGet,
  filemakerSocialPostsPostHandler: routeHandlers.socialPostsPost,
  filemakerSocialPostsPublishScheduledHandler: routeHandlers.socialPostsPublishScheduledPost,
}));

type RouteModule = {
  runtime?: unknown;
  DELETE?: unknown;
  GET?: unknown;
  PATCH?: unknown;
  POST?: unknown;
};

describe('Filemaker social route aliases', () => {
  const routes: Array<{
    name: string;
    load: () => Promise<RouteModule>;
    exports: Partial<RouteModule>;
  }> = [
    {
      name: 'social posts collection',
      load: async () => (await import('./social-posts/route')) as RouteModule,
      exports: {
        DELETE: routeHandlers.socialPostsDelete,
        GET: routeHandlers.socialPostsGet,
        POST: routeHandlers.socialPostsPost,
      },
    },
    {
      name: 'social post delete fallback',
      load: async () => (await import('./social-posts/delete/route')) as RouteModule,
      exports: { POST: routeHandlers.socialPostsDeletePost },
    },
    {
      name: 'social post context',
      load: async () => (await import('./social-posts/context/route')) as RouteModule,
      exports: { GET: routeHandlers.socialPostContextGet },
    },
    {
      name: 'social post generation',
      load: async () => (await import('./social-posts/generate/route')) as RouteModule,
      exports: { POST: routeHandlers.socialPostGeneratePost },
    },
    {
      name: 'social visual analysis',
      load: async () => (await import('./social-posts/analyze-visuals/route')) as RouteModule,
      exports: { POST: routeHandlers.socialPostAnalyzeVisualsPost },
    },
    {
      name: 'social scheduled publishing',
      load: async () => (await import('./social-posts/publish-scheduled/route')) as RouteModule,
      exports: { POST: routeHandlers.socialPostsPublishScheduledPost },
    },
    {
      name: 'social post detail',
      load: async () => (await import('./social-posts/[id]/route')) as RouteModule,
      exports: {
        DELETE: routeHandlers.socialPostDelete,
        GET: routeHandlers.socialPostGet,
        PATCH: routeHandlers.socialPostPatch,
      },
    },
    {
      name: 'social post publish',
      load: async () => (await import('./social-posts/[id]/publish/route')) as RouteModule,
      exports: { POST: routeHandlers.socialPostPublish },
    },
    {
      name: 'social post unpublish',
      load: async () => (await import('./social-posts/[id]/unpublish/route')) as RouteModule,
      exports: { POST: routeHandlers.socialPostUnpublish },
    },
    {
      name: 'social image add-ons',
      load: async () => (await import('./social-image-addons/route')) as RouteModule,
      exports: {
        GET: routeHandlers.socialImageAddonsGet,
        POST: routeHandlers.socialImageAddonsPost,
      },
    },
    {
      name: 'social image add-on batch',
      load: async () => (await import('./social-image-addons/batch/route')) as RouteModule,
      exports: {
        GET: routeHandlers.socialImageAddonsBatchGet,
        POST: routeHandlers.socialImageAddonsBatchPost,
      },
    },
    {
      name: 'social image add-on serving',
      load: async () => (await import('./social-image-addons/serve/route')) as RouteModule,
      exports: { GET: routeHandlers.socialImageAddonsServeGet },
    },
    {
      name: 'social pipeline status',
      load: async () => (await import('./social-pipeline/status/route')) as RouteModule,
      exports: { GET: routeHandlers.socialPipelineStatusGet },
    },
    {
      name: 'social pipeline trigger',
      load: async () => (await import('./social-pipeline/trigger/route')) as RouteModule,
      exports: { POST: routeHandlers.socialPipelineTriggerPost },
    },
    {
      name: 'social pipeline jobs',
      load: async () => (await import('./social-pipeline/jobs/route')) as RouteModule,
      exports: {
        DELETE: routeHandlers.socialPipelineJobsDelete,
        GET: routeHandlers.socialPipelineJobsGet,
      },
    },
    {
      name: 'social pipeline pause',
      load: async () => (await import('./social-pipeline/pause/route')) as RouteModule,
      exports: { POST: routeHandlers.socialPipelinePausePost },
    },
    {
      name: 'social pipeline resume',
      load: async () => (await import('./social-pipeline/resume/route')) as RouteModule,
      exports: { POST: routeHandlers.socialPipelineResumePost },
    },
  ];

  it.each(routes)('exports $name handlers from the Filemaker route tree', async (routeCase) => {
    const route = await routeCase.load();

    expect(route.runtime).toBe('nodejs');
    Object.entries(routeCase.exports).forEach(([method, handler]) => {
      expect(route[method as keyof RouteModule]).toBe(handler);
    });
  });
});
