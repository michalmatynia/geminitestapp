import 'server-only';

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { normalizeFrontPageApp, type FrontPageSelectableApp } from '@/shared/lib/front-page-app';

const FRONT_PAGE_DEV_SNAPSHOT_FILE = join(
  tmpdir(),
  'geminitestapp',
  createHash('sha1').update(process.cwd()).digest('hex'),
  'front-page-app.snapshot.json'
);

const canUseFrontPageDevSnapshot = (): boolean => process.env['NODE_ENV'] === 'development';

type FrontPageDevSnapshotPayload = {
  value: FrontPageSelectableApp | null;
};

export const readFrontPageDevSnapshot = async (): Promise<FrontPageSelectableApp | null> => {
  if (!canUseFrontPageDevSnapshot()) {
    return null;
  }

  try {
    const raw = await readFile(FRONT_PAGE_DEV_SNAPSHOT_FILE, 'utf8');
    const parsed = JSON.parse(raw) as FrontPageDevSnapshotPayload | null;
    return normalizeFrontPageApp(parsed?.value);
  } catch {
    return null;
  }
};

export const writeFrontPageDevSnapshot = async (
  value: string | null | undefined
): Promise<FrontPageSelectableApp | null> => {
  if (!canUseFrontPageDevSnapshot()) {
    return normalizeFrontPageApp(value);
  }

  const normalized = normalizeFrontPageApp(value);
  try {
    await mkdir(dirname(FRONT_PAGE_DEV_SNAPSHOT_FILE), { recursive: true });
    await writeFile(
      FRONT_PAGE_DEV_SNAPSHOT_FILE,
      JSON.stringify({ value: normalized } satisfies FrontPageDevSnapshotPayload),
      'utf8'
    );
  } catch {
    return normalized;
  }

  return normalized;
};
