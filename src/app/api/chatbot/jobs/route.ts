export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { DELETE_handler, GET_handler, POST_handler } from './handler';

export const GET = apiHandler(GET_handler, { source: 'chatbot.jobs.GET' });

export const POST = apiHandler(POST_handler, { source: 'chatbot.jobs.POST' });

export const DELETE = apiHandler(DELETE_handler, { source: 'chatbot.jobs.DELETE' });
