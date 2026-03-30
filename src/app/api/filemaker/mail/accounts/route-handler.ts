export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { GET_handler, POST_handler } from './handler';

export const GET = apiHandler(GET_handler, {
  source: 'filemaker.mail.accounts.GET',
});

export const POST = apiHandler(POST_handler, {
  source: 'filemaker.mail.accounts.POST',
});

