export const runtime = 'nodejs';
export const revalidate = 600;

import { apiHandler } from '@/shared/lib/api/api-handler';

import { getPriceGroupsHandler, postPriceGroupsHandler } from './handler';

export const GET = apiHandler(getPriceGroupsHandler, { source: 'price-groups.GET' });

export const POST = apiHandler(postPriceGroupsHandler, { source: 'price-groups.POST' });
