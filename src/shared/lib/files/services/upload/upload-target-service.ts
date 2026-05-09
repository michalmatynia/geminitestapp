/**
 * Upload Target Service
 * 
 * Logic for resolving destination directories and public paths for file uploads 
 * based on category and project context.
 */

import path from 'path';
import {
  agentCreatorRoot,
  caseResolverRoot,
  notesRoot,
  productsRoot,
  studioRoot,
  uploadsRoot,
} from '../../server-constants';
import { tempFolderName } from '../../constants';
import { sanitizeSku, sanitizeSegment, sanitizeFolderPath } from './path-service';

export type UploadCategory = 
  | 'products'
  | 'notes'
  | 'cms'
  | 'studio'
  | 'case_resolver'
  | 'agentcreator';

/**
 * Resolves the destination directory and public path for a file upload.
 */
export const getUploadTarget = ({
  category,
  sku,
  noteId,
  projectId,
  folder,
}: {
  category?: UploadCategory;
  sku?: string | null | undefined;
  noteId?: string | null | undefined;
  projectId?: string | null | undefined;
  folder?: string | null | undefined;
}): { diskDir: string; publicDir: string } => {
  if (category === 'products') {
    const folderName = sku ? sanitizeSku(sku) : tempFolderName;
    return {
      diskDir: path.join(productsRoot, folderName),
      publicDir: `/uploads/products/${folderName}`,
    };
  }

  if (category === 'notes' && noteId) {
    return {
      diskDir: path.join(notesRoot, noteId),
      publicDir: `/uploads/notes/${noteId}`,
    };
  }

  if (category === 'cms') {
    return {
      diskDir: path.join(uploadsRoot, 'cms'),
      publicDir: '/uploads/cms',
    };
  }

  if (category === 'studio') {
    if (!projectId) throw new Error('projectId is required for studio uploads.');
    const safeProject = sanitizeSegment(projectId);
    const safeFolder = folder?.trim() ? sanitizeFolderPath(folder) : '';
    return {
      diskDir: safeFolder ? path.join(studioRoot, safeProject, safeFolder) : path.join(studioRoot, safeProject),
      publicDir: safeFolder ? `/uploads/studio/${safeProject}/${safeFolder}` : `/uploads/studio/${safeProject}`,
    };
  }

  if (category === 'case_resolver') {
    const safeFolder = folder?.trim() ? sanitizeFolderPath(folder) : '';
    return {
      diskDir: safeFolder ? path.join(caseResolverRoot, safeFolder) : caseResolverRoot,
      publicDir: safeFolder ? `/uploads/case-resolver/${safeFolder}` : '/uploads/case-resolver',
    };
  }

  if (category === 'agentcreator') {
    const safeFolder = folder?.trim() ? sanitizeFolderPath(folder) : '';
    return {
      diskDir: safeFolder ? path.join(agentCreatorRoot, safeFolder) : agentCreatorRoot,
      publicDir: safeFolder ? `/uploads/agentcreator/${safeFolder}` : '/uploads/agentcreator',
    };
  }

  return { diskDir: uploadsRoot, publicDir: '/uploads' };
};
