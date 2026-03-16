import 'server-only';

import path from 'path';

const DEFAULT_UPLOADS_ROOT = '/var/tmp/libapp-uploads';
const TEST_UPLOADS_ROOT = path.resolve(process.cwd(), 'public', 'uploads');
const USE_TEST_UPLOADS_ROOT =
  process.env['VITEST'] === 'true' || process.env['NODE_ENV'] === 'test';

export const uploadsRoot = USE_TEST_UPLOADS_ROOT
  ? TEST_UPLOADS_ROOT
  : path.resolve(DEFAULT_UPLOADS_ROOT);
export const productsRoot = path.join(uploadsRoot, 'products');
export const notesRoot = path.join(uploadsRoot, 'notes');
export const studioRoot = path.join(uploadsRoot, 'studio');
export const caseResolverRoot = path.join(uploadsRoot, 'case-resolver');
export const agentCreatorRoot = path.join(uploadsRoot, 'agentcreator');
export const assets3dRoot = path.join(uploadsRoot, 'assets3d');
export const publicRoot = path.resolve(process.cwd(), 'public');
