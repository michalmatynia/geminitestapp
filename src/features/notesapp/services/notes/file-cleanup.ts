import 'server-only';

import fs from 'fs/promises';
import path from 'path';

import {
  deleteFileFromStorage,
  getPublicPathFromStoredPath,
} from '@/shared/lib/files/services/image-file-service';
import { notesRoot } from '@/shared/lib/files/server-constants';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


export async function cleanupNoteFile(noteId: string, filepath: string): Promise<void> {
  try {
    await deleteFileFromStorage(filepath);
    const noteDir = path.join(notesRoot, noteId);
    const normalizedPath = getPublicPathFromStoredPath(filepath);
    if (normalizedPath && !normalizedPath.startsWith(`/uploads/notes/${noteId}/`)) {
      return;
    }
    try {
      const remaining = await fs.readdir(noteDir);
      if (remaining.length === 0) {
        await fs.rmdir(noteDir);
      }
    } catch (error) {
      void ErrorSystem.captureException(error);
    
      // ignore cleanup errors
    }
  } catch (error) {
    void ErrorSystem.captureException(error);
  
    // ignore
  }
}
