export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { getHandler } from './handler';

export const GET = apiHandlerWithParams<{ runId: string; file: string }>(getHandler, {
  source: 'ai-paths.playwright.[runId].artifacts.[file].GET',
});
