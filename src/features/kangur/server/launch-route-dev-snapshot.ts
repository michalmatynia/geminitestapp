import 'server-only';

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import {
  parseKangurLaunchRouteSettings,
  type KangurLaunchRoute,
} from '@/features/kangur/settings';

const KANGUR_LAUNCH_ROUTE_DEV_SNAPSHOT_FILE = join(
  tmpdir(),
  'geminitestapp',
  createHash('sha1').update(process.cwd()).digest('hex'),
  'kangur-launch-route.snapshot.json'
);

const canUseKangurLaunchRouteDevSnapshot = (): boolean =>
  process.env['NODE_ENV'] === 'development';

type KangurLaunchRouteDevSnapshotPayload = {
  value: KangurLaunchRoute | null;
};

export const readKangurLaunchRouteDevSnapshot = async (): Promise<KangurLaunchRoute | null> => {
  if (!canUseKangurLaunchRouteDevSnapshot()) {
    return null;
  }

  try {
    const raw = await readFile(KANGUR_LAUNCH_ROUTE_DEV_SNAPSHOT_FILE, 'utf8');
    const parsed = JSON.parse(raw) as KangurLaunchRouteDevSnapshotPayload | null;
    return parseKangurLaunchRouteSettings(parsed?.value).route;
  } catch {
    return null;
  }
};

export const writeKangurLaunchRouteDevSnapshot = async (
  value: string | null | undefined
): Promise<KangurLaunchRoute> => {
  const normalized = parseKangurLaunchRouteSettings(value).route;

  if (!canUseKangurLaunchRouteDevSnapshot()) {
    return normalized;
  }

  try {
    await mkdir(dirname(KANGUR_LAUNCH_ROUTE_DEV_SNAPSHOT_FILE), { recursive: true });
    await writeFile(
      KANGUR_LAUNCH_ROUTE_DEV_SNAPSHOT_FILE,
      JSON.stringify({ value: normalized } satisfies KangurLaunchRouteDevSnapshotPayload),
      'utf8'
    );
  } catch {
    return normalized;
  }

  return normalized;
};
