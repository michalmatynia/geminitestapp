export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { getLastBackupHandler } from './handler';

export const GET = apiHandler(getLastBackupHandler, {
  source: 'database-engine-web.databases.last-backup.GET',
});
