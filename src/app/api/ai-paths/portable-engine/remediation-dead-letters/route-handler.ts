export const runtime = 'nodejs';

import { z } from 'zod';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { getDeadLettersHandler, postDeadLettersHandler, querySchema } from './handler';

const bodySchema = z.unknown();

export const GET = apiHandler(getDeadLettersHandler, {
  source: 'ai-paths.portable-engine.remediation-dead-letters.GET',
  querySchema,
});

export const POST = apiHandler(postDeadLettersHandler, {
  source: 'ai-paths.portable-engine.remediation-dead-letters.POST',
  parseJsonBody: true,
  bodySchema,
});
