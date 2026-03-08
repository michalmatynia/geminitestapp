import 'server-only';

import path from 'path';

export const uploadsRoot = path.join(process.cwd(), 'public', 'uploads');
export const productsRoot = path.join(uploadsRoot, 'products');
export const notesRoot = path.join(uploadsRoot, 'notes');
export const studioRoot = path.join(uploadsRoot, 'studio');
export const caseResolverRoot = path.join(uploadsRoot, 'case-resolver');
export const agentCreatorRoot = path.join(uploadsRoot, 'agentcreator');
export const publicRoot = path.resolve(process.cwd(), 'public');
