export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { kangurAiTutorNativeGuideStoreSchema } from '@/shared/contracts/kangur-ai-tutor-native-guide';
import { apiHandler } from '@/shared/lib/api/api-handler';

import {
  getKangurAiTutorNativeGuideHandler,
  postKangurAiTutorNativeGuideHandler,
  querySchema,
} from './handler';

export const GET = apiHandler(getKangurAiTutorNativeGuideHandler, {
  source: 'kangur.ai-tutor.native-guide.GET',
  service: 'kangur.api',
  successLogging: 'off',
  resolveSessionUser: false,
  querySchema,
  requireAuth: true,
});

export const POST = apiHandler(postKangurAiTutorNativeGuideHandler, {
  source: 'kangur.ai-tutor.native-guide.POST',
  service: 'kangur.api',
  parseJsonBody: true,
  bodySchema: kangurAiTutorNativeGuideStoreSchema,
  requireAuth: true,
});
