import 'server-only';

import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import prisma from '@/shared/lib/db/prisma';

type IntegrationDbProvider = 'prisma' | 'mongodb';

export const getIntegrationDataProvider = async (): Promise<IntegrationDbProvider> => {
  void prisma;
  return getAppDbProvider();
};
