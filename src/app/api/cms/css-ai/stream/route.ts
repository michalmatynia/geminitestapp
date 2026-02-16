export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { POST_handler } from './handler';

export const POST = apiHandler(POST_handler, {
  source: 'cms.css-ai.stream.POST',
});
