import { getFsPromises } from '@/shared/lib/files/runtime-fs';
import { RUN_ROOT_DIR, RUN_TTL_MS, resolveRunStatePath, resolveRunArtifactsDir } from '../playwright-node-runner.helpers';
import path from 'path';

export const nodeFs = getFsPromises();
export const STICKY_SESSION_ROOT_DIR = path.join(RUN_ROOT_DIR, 'sticky-sessions');
export const STICKY_SESSION_TTL_MS = RUN_TTL_MS;

export const runtimeConfig = {
  resolveRunStatePath,
  resolveRunArtifactsDir,
};
