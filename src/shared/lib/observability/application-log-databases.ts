import 'server-only';

import type { Db } from 'mongodb';

import {
  observabilityApplicationIdValues,
  type ObservabilityApplicationId,
} from '@/shared/contracts/system';
import { getMongoDb as getRootMongoDb } from '@/shared/lib/db/mongo-client';
import {
  hasArchMongoSourceEnv,
  hasCmsBuilderMongoSourceEnv,
  hasEcommerceMongoSourceEnv,
  hasStudiqMongoSourceEnv,
} from '@/shared/lib/db/mongo-source-env';
import { normalizeObservabilityApplicationId } from '@/shared/lib/observability/application-log-origin';

const FEDERATED_APPLICATION_IDS_ENV = 'OBSERVABILITY_FEDERATED_APPLICATION_IDS';
const DISABLED_APPLICATION_IDS_ENV = 'OBSERVABILITY_DISABLED_APPLICATION_IDS';

type ApplicationMongoResolver = {
  isConfigured: () => boolean;
  getMongoDb: () => Promise<Db>;
};

const parseApplicationIdList = (
  value: string | undefined
): ObservabilityApplicationId[] | null => {
  if (typeof value !== 'string' || value.trim().length === 0) return null;

  const ids: ObservabilityApplicationId[] = [];
  for (const token of value.split(/[,\s]+/)) {
    const applicationId = normalizeObservabilityApplicationId(token);
    if (applicationId !== null && !ids.includes(applicationId)) {
      ids.push(applicationId);
    }
  }

  return ids.length > 0 ? ids : null;
};

export const getFederatedObservabilityApplicationIds = (
  defaultApplicationIds: readonly ObservabilityApplicationId[] = observabilityApplicationIdValues
): ObservabilityApplicationId[] => {
  const enabledApplicationIds = parseApplicationIdList(process.env[FEDERATED_APPLICATION_IDS_ENV]);
  if (enabledApplicationIds !== null) {
    return enabledApplicationIds.filter((applicationId) =>
      defaultApplicationIds.includes(applicationId)
    );
  }

  const disabledApplicationIds = parseApplicationIdList(process.env[DISABLED_APPLICATION_IDS_ENV]);
  if (disabledApplicationIds !== null) {
    return defaultApplicationIds.filter(
      (applicationId) => !disabledApplicationIds.includes(applicationId)
    );
  }

  return [...defaultApplicationIds];
};

const applicationMongoResolvers: Partial<
  Record<ObservabilityApplicationId, ApplicationMongoResolver>
> = {
  studiq: {
    isConfigured: hasStudiqMongoSourceEnv,
    getMongoDb: async () => {
      const { getMongoDb } = await import('@/shared/lib/db/studiq-mongo-client');
      return getMongoDb();
    },
  },
  'cms-builder': {
    isConfigured: hasCmsBuilderMongoSourceEnv,
    getMongoDb: async () => {
      const { getMongoDb } = await import('@/shared/lib/db/cms-builder-mongo-client');
      return getMongoDb();
    },
  },
  stargater: {
    isConfigured: hasEcommerceMongoSourceEnv,
    getMongoDb: async () => {
      const { getMongoDb } = await import('@/shared/lib/db/ecommerce-mongo-client');
      return getMongoDb();
    },
  },
  arch: {
    isConfigured: hasArchMongoSourceEnv,
    getMongoDb: async () => {
      const { getMongoDb } = await import('@/shared/lib/db/arch-mongo-client');
      return getMongoDb();
    },
  },
};

export const getObservabilityApplicationMongoDb = async (
  applicationId: ObservabilityApplicationId
): Promise<Db> => {
  const resolver = applicationMongoResolvers[applicationId];
  if (resolver?.isConfigured() === true) return resolver.getMongoDb();

  return getRootMongoDb();
};

export const isCentralObservabilityApplication = (
  applicationId: ObservabilityApplicationId
): boolean => applicationId === 'geminitestapp';

export const getMongoDatabaseName = (db: Db): string | null => {
  const candidate = (db as Db & { databaseName?: unknown }).databaseName;
  return typeof candidate === 'string' && candidate.trim().length > 0 ? candidate : null;
};
