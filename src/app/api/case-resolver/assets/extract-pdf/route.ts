export const runtime = 'nodejs';
export const maxDuration = 300;

import { apiHandler } from '@/shared/lib/api/api-handler';

import { POST_handler } from './handler';

export const POST = apiHandler(POST_handler, { source: 'case-resolver.assets.extract-pdf.POST' });
