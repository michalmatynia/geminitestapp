/**
 * Image Studio Run Executor
 * 
 * Orchestrates image processing and AI generation workflows for the Image Studio.
 * This service handles input validation, asset path resolution, project scoping, 
 * and routing to specific operation handlers (generation or object centering).
 * 
 * Features:
 * - Request Validation: Uses Zod schemas to ensure request payload integrity.
 * - Security: Enforces project-scoping for source assets to prevent cross-project 
 *   asset access.
 * - Operation Routing: Routes runs to either generation (`generate`) or object 
 *   processing (`center_object`) handlers.
 * - Asset Resolution: Sanitizes paths and verifies asset existence on disk before 
 *   initiating long-running transformations.
 * 
 * Usage:
 * Use this service to initiate image studio runs from API handlers. It provides 
 * a unified entry point for all image studio transformations.
 */

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

/**
 * Executes a run in the Image Studio based on the provided request payload.
 * 
 * @param rawRequest - The raw JSON request from the client.
 * @returns The result of the image operation (metadata and success state).
 * @throws `badRequestError` if validation fails, project scoping is violated, or assets are missing.
 */
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
  
  if (projectId === null) {
      throw badRequestError('Project id is required. Provide a valid projectId in the run request.');
  }

  const assetPath = normalizePublicAssetPath(request.asset?.filepath ?? '');
  const hasSourceAsset = assetPath.length > 0;
  let diskPath: string | null = null;

  if (hasSourceAsset) {
    if (!isProjectScopedAssetPath(assetPath, projectId)) {
      throw badRequestError(
        `Asset "${assetPath}" does not belong to project "${projectId}". Only assets uploaded to the current project can be used as the source image.`
      );
    }

    const resolvedDiskPath = resolveAssetPath(assetPath);
    ensureWithinProject(resolvedDiskPath, projectId);
    
    // Verify file existence on disk
    await fs.stat(resolvedDiskPath).catch(() => {
      throw badRequestError(
        `Asset file not found on disk: "${assetPath}". The file may have been deleted or the path is incorrect.`
      );
    });
    diskPath = resolvedDiskPath;
  }

  // Route to the appropriate handler
  if (operation === 'center_object') {
    if (diskPath === null) {
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
