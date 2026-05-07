export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { getHandler, postHandler } from './handler';

export const POST = apiHandler(postHandler, { source: 'database-engine-web.databases.json-backup.POST' });

export const GET = apiHandler(getHandler, { source: 'database-engine-web.databases.json-backup.GET' });
