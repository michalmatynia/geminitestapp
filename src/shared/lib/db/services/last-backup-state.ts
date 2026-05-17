import 'server-only';

import { promises as fs } from 'fs';
import { join } from 'path';

import { backupsDir } from '@/shared/lib/db/utils/mongo';

const STATE_FILE = join(backupsDir, '.last-backup.json');

export type LastBackupState = {
  lastBackupAt: string;
  application: string | null;
};

export const readLastBackupState = async (): Promise<LastBackupState | null> => {
  try {
    const raw = await fs.readFile(STATE_FILE, 'utf8');
    return JSON.parse(raw) as LastBackupState;
  } catch {
    return null;
  }
};

export const writeLastBackupState = async (state: LastBackupState): Promise<void> => {
  try {
    await fs.mkdir(backupsDir, { recursive: true });
    await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
  } catch {
    // best-effort — never block the backup result
  }
};
