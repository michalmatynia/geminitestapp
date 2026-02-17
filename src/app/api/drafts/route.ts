export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 10;

import { apiHandler } from '@/shared/lib/api/api-handler';

import { GET_handler, POST_handler } from './handler';

export const GET = apiHandler(GET_handler, { source: 'drafts.GET' });
export const POST = apiHandler(POST_handler, { source: 'drafts.POST' });
