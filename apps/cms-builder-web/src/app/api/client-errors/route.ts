import { apiHandler } from '@/shared/lib/api/api-handler';

import { postHandler } from '@/shared/server/api/client-errors/handler';

const postCmsBuilderClientErrorHandler: typeof postHandler = (req, ctx) =>
  postHandler(
    req,
    {
      ...ctx,
      applicationId: 'cms-builder',
      source: 'cms-builder-web.client-errors.POST',
      service: 'cms-builder-client-error-reporter',
    } as typeof ctx & { applicationId: string; source: string; service: string }
  );

export const POST = apiHandler(postCmsBuilderClientErrorHandler, {
  source: 'cms-builder-web.client-errors.POST',
  parseJsonBody: false,
  rateLimitKey: 'write',
  requireCsrf: false,
});
