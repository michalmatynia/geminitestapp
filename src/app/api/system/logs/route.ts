export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { DELETE_handler, GET_handler, POST_handler } from './handler';

export const GET = apiHandler(GET_handler, { source: 'system.logs.GET' });

export const POST = apiHandler(POST_handler, { source: 'system.logs.POST' });

export const DELETE = apiHandler(DELETE_handler, { source: 'system.logs.DELETE' });
