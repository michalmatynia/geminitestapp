import { apiHandler } from '@/shared/lib/api/api-handler';

import { GET_handler, POST_handler } from './handler';

export const runtime = 'nodejs';

export const GET = apiHandler(
  GET_handler,
  { source: 'auth.[...nextauth].GET', requireCsrf: false });
export const POST = apiHandler(
  POST_handler,
  { source: 'auth.[...nextauth].POST', requireCsrf: false });
