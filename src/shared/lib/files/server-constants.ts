import 'server-only';

import path from 'path';

import { logger } from '@/shared/utils/logger';

const DEFAULT_UPLOADS_ROOT = '/var/tmp/libapp-uploads';
const PUBLIC_UPLOADS_ROOT = path.resolve(process.cwd(), 'public', 'uploads');
const TEST_UPLOADS_ROOT = PUBLIC_UPLOADS_ROOT;
const USE_TEST_UPLOADS_ROOT =
  process.env['VITEST'] === 'true' || process.env['NODE_ENV'] === 'test';
const ENV_UPLOADS_ROOT = process.env['UPLOADS_ROOT']?.trim();

export const uploadsRoot = ENV_UPLOADS_ROOT
  ? path.resolve(ENV_UPLOADS_ROOT)
  : USE_TEST_UPLOADS_ROOT
    ? TEST_UPLOADS_ROOT
    : path.resolve(DEFAULT_UPLOADS_ROOT);

if (
  process.env['NODE_ENV'] !== 'production' &&
  process.env['VITEST'] !== 'true' &&
  uploadsRoot !== PUBLIC_UPLOADS_ROOT
) {
  logger.warn(
    `[uploads] uploadsRoot points to "${uploadsRoot}", but /uploads is served from "${PUBLIC_UPLOADS_ROOT}". ` +
      'Set UPLOADS_ROOT="public/uploads" to see local uploads in dev.'
  );
}
export const productsRoot = path.join(uploadsRoot, 'products');
export const notesRoot = path.join(uploadsRoot, 'notes');
export const studioRoot = path.join(uploadsRoot, 'studio');
export const caseResolverRoot = path.join(uploadsRoot, 'case-resolver');
export const agentCreatorRoot = path.join(uploadsRoot, 'agentcreator');
export const assets3dRoot = path.join(uploadsRoot, 'assets3d');
export const publicRoot = path.resolve(process.cwd(), 'public');
