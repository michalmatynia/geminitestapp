export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { postDatabasesPreviewHandler } from './handler';

export const POST = apiHandler(postDatabasesPreviewHandler, { source: 'database-engine-web.databases.preview.POST' });
