import { apiHandler } from '@/shared/lib/api/api-handler';
import { POST_handler } from '../../../../../src/app/api/client-errors/handler';

export const POST = apiHandler(POST_handler, {
  source: 'client-errors.POST',
  parseJsonBody: false,
  rateLimitKey: 'write',
  requireCsrf: false,
});
