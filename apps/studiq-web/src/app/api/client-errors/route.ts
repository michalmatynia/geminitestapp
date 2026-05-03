import { apiHandler } from '@/shared/lib/api/api-handler';
import { postHandler as POST_handler } from '../../../../../src/app/api/client-errors/handler';

// eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
export const POST = apiHandler(POST_handler as any, {
  source: 'client-errors.POST',
  parseJsonBody: false,
  rateLimitKey: 'write',
  requireCsrf: false,
});
