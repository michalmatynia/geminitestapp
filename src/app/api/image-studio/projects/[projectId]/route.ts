export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import {
  deleteImageStudioProjectHandler,
  patchImageStudioProjectHandler,
} from './handler';

export const DELETE = apiHandlerWithParams<{ projectId: string }>(
  deleteImageStudioProjectHandler,
  { source: 'image-studio.projects.DELETE' }
);

export const PATCH = apiHandlerWithParams<{ projectId: string }>(
  patchImageStudioProjectHandler,
  { source: 'image-studio.projects.[projectId].PATCH' }
);
