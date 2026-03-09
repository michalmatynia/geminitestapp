export const runtime = 'nodejs';
export const maxDuration = 300;

import { apiHandler } from '@/shared/lib/api/api-handler';

import { DELETE_handler, POST_handler } from './handler';

export const POST = apiHandler(POST_handler, {
  source: 'agentcreator.personas.avatar.POST',
});

export const DELETE = apiHandler(DELETE_handler, {
  source: 'agentcreator.personas.avatar.DELETE',
});
