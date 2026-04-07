import fs from 'fs/promises';
import path from 'path';

import { uploadsRoot } from '@/shared/lib/files/server-constants';
import { uploadToConfiguredStorage } from '@/shared/lib/files/services/storage/file-storage-service';

export const persistAudioBuffer = async (input: {
  lessonId: string;
  cacheKey: string;
  buffer: Buffer;
}): Promise<string> => {
  const filename = `${input.cacheKey}.mp3`;
  const diskDir = path.join(uploadsRoot, 'kangur', 'tts');
  const publicPath = `/uploads/kangur/tts/${filename}`;
  const localDiskPath = path.join(diskDir, filename);

  const storageResult = await uploadToConfiguredStorage({
    buffer: input.buffer,
    filename,
    mimetype: 'audio/mpeg',
    publicPath,
    category: 'kangur-tts',
    projectId: input.lessonId,
    folder: 'tts',
    writeLocalCopy: async (): Promise<void> => {
      await fs.mkdir(diskDir, { recursive: true });
      await fs.writeFile(localDiskPath, input.buffer);
    },
  });

  return storageResult.filepath;
};
