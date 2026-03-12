import { apiHandler } from '@/shared/lib/api';

import {
  getKangurPageContentHandler,
  postKangurPageContentHandler,
  querySchema,
} from './handler';
import { kangurPageContentStoreSchema } from '@/shared/contracts/kangur-page-content';

export const GET = apiHandler(getKangurPageContentHandler, {
  source: 'kangur.ai-tutor.page-content.GET',
  querySchema,
});

export const POST = apiHandler(postKangurPageContentHandler, {
  source: 'kangur.ai-tutor.page-content.POST',
  bodySchema: kangurPageContentStoreSchema,
});
