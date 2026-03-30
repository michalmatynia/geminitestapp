export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { GET_handler, PATCH_handler, DELETE_handler } from './handler';

export const GET = apiHandler(GET_handler, {
  source: 'filemaker.mail.threads.detail.GET',
});

export const PATCH = apiHandler(PATCH_handler, {
  source: 'filemaker.mail.threads.detail.PATCH',
});

export const DELETE = apiHandler(DELETE_handler, {
  source: 'filemaker.mail.threads.detail.DELETE',
});

