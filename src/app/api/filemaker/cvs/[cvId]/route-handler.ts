export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { deleteHandler, getHandler, patchHandler } from './handler';

export const GET = apiHandlerWithParams<{ cvId: string }>(getHandler, {
  source: 'filemaker.cvs.[cvId].GET',
});

export const PATCH = apiHandlerWithParams<{ cvId: string }>(patchHandler, {
  source: 'filemaker.cvs.[cvId].PATCH',
});

export const DELETE = apiHandlerWithParams<{ cvId: string }>(deleteHandler, {
  source: 'filemaker.cvs.[cvId].DELETE',
});
