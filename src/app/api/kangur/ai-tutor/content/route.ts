export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { kangurAiTutorContentSchema } from '@/shared/contracts/kangur-ai-tutor-content';
import { apiHandler } from '@/shared/lib/api/api-handler';

import { getKangurAiTutorContentHandler, postKangurAiTutorContentHandler } from './handler';

export const GET = apiHandler(getKangurAiTutorContentHandler, {
  source: 'kangur.ai-tutor.content.GET',
  service: 'kangur.api',
  successLogging: 'off',
  resolveSessionUser: false,
});

export const POST = apiHandler(postKangurAiTutorContentHandler, {
  source: 'kangur.ai-tutor.content.POST',
  service: 'kangur.api',
  parseJsonBody: true,
  bodySchema: kangurAiTutorContentSchema,
});
