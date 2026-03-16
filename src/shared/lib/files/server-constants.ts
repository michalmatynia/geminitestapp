import 'server-only';

import path from 'path';

const DEFAULT_UPLOADS_ROOT = '/var/tmp/libapp-uploads';

export const uploadsRoot = DEFAULT_UPLOADS_ROOT;
export const productsRoot = `${uploadsRoot}/products`;
export const notesRoot = `${uploadsRoot}/notes`;
export const studioRoot = `${uploadsRoot}/studio`;
export const caseResolverRoot = `${uploadsRoot}/case-resolver`;
export const agentCreatorRoot = `${uploadsRoot}/agentcreator`;
export const assets3dRoot = `${uploadsRoot}/assets3d`;
export const publicRoot = path.resolve(process.cwd(), 'public');
