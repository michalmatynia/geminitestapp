import 'server-only';

import fs from 'fs/promises';

import {
  imageStudioRunRequestSchema,
  type ImageStudioRunRequest,
  type ImageStudioRunExecutionMeta,
  type ImageStudioRunExecutionResult,
} from '@/shared/contracts/image-studio';
import { badRequestError } from '@/shared/errors/app-error';
import {
  ensureWithinProject,
  isProjectScopedAssetPath,
  normalizePublicAssetPath,
  resolveAssetPath,
  sanitizeImageStudioProjectId,
} from './run-executor-utils';
import { executeCenterOperation } from './handlers/center-handler';
import { executeGenerationOperation } from './handlers/generation-handler';

export {
  imageStudioRunRequestSchema,
  type ImageStudioRunRequest,
  type ImageStudioRunExecutionMeta,
  type ImageStudioRunExecutionResult,
};

export { resolveExpectedOutputCount, sanitizeImageStudioProjectId } from './run-executor-utils';

export async function executeImageStudioRun(
  rawRequest: unknown
): Promise<ImageStudioRunExecutionResult> {
  const parsed = imageStudioRunRequestSchema.safeParse(rawRequest);
  if (!parsed.success) {
    throw badRequestError('Invalid payload', { errors: parsed.error.format() });
  }

  const request = parsed.data;
  const operation = request.operation === 'center_object' ? 'center_object' : 'generate';
  const projectId = sanitizeImageStudioProjectId(request.projectId);
  if (!projectId) throw badRequestError('Project id is required.');

  const assetPath = normalizePublicAssetPath(request.asset?.filepath ?? '');
  const hasSourceAsset = Boolean(assetPath);
  let diskPath: string | null = null;

  if (hasSourceAsset) {
    if (!isProjectScopedAssetPath(assetPath, projectId)) {
      throw badRequestError('Asset must belong to the current project.');
    }

    const resolvedDiskPath = resolveAssetPath(assetPath);
    ensureWithinProject(resolvedDiskPath, projectId);
    await fs.stat(resolvedDiskPath).catch(() => {
      throw badRequestError('Asset file not found.');
    });
    diskPath = resolvedDiskPath;
  }

  if (operation === 'center_object') {
    if (!diskPath) {
      throw badRequestError('Source asset is required for center operation.');
    }
    return executeCenterOperation({
      request,
      projectId,
      diskPath,
    });
  }

  return executeGenerationOperation({
    request,
    projectId,
    diskPath,
    hasSourceAsset,
    assetPath,
  });
}
