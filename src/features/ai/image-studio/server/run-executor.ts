import 'server-only';

import fs from 'fs/promises';

import { imageStudioRunRequestSchema } from '@/shared/contracts/image-studio/run';
import { type ImageStudioRunRequest, type ImageStudioRunExecutionMeta, type ImageStudioRunExecutionResult } from '@/shared/contracts/image-studio';
import { badRequestError } from '@/shared/errors/app-error';

import { executeCenterOperation } from './handlers/center-handler';
import { executeGenerationOperation } from './handlers/generation-handler';
import {
  ensureWithinProject,
  isProjectScopedAssetPath,
  normalizePublicAssetPath,
  resolveAssetPath,
  sanitizeImageStudioProjectId,
} from './run-executor-utils';

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
  if (!projectId) throw badRequestError('Project id is required. Provide a valid projectId in the run request.');

  const assetPath = normalizePublicAssetPath(request.asset?.filepath ?? '');
  const hasSourceAsset = Boolean(assetPath);
  let diskPath: string | null = null;

  if (hasSourceAsset) {
    if (!isProjectScopedAssetPath(assetPath, projectId)) {
      throw badRequestError(
        `Asset "${assetPath}" does not belong to project "${projectId}". Only assets uploaded to the current project can be used as the source image.`
      );
    }

    const resolvedDiskPath = resolveAssetPath(assetPath);
    ensureWithinProject(resolvedDiskPath, projectId);
    await fs.stat(resolvedDiskPath).catch(() => {
      throw badRequestError(
        `Asset file not found on disk: "${assetPath}". The file may have been deleted or the path is incorrect.`
      );
    });
    diskPath = resolvedDiskPath;
  }

  if (operation === 'center_object') {
    if (!diskPath) {
      throw badRequestError('Source asset is required for the center_object operation. Select a source image before running centering.');
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
