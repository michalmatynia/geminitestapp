export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { deleteHandler, patchHandler } from './handler';

export const PATCH = apiHandlerWithParams<{
  personId: string;
  recordId: string;
  recordKind: string;
}>(patchHandler, {
  source: 'filemaker.persons.[personId].linked-records.[recordKind].[recordId].PATCH',
});

export const DELETE = apiHandlerWithParams<{
  personId: string;
  recordId: string;
  recordKind: string;
}>(deleteHandler, {
  source: 'filemaker.persons.[personId].linked-records.[recordKind].[recordId].DELETE',
});
