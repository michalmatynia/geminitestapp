import { Prisma } from '@/shared/lib/db/prisma-client';
import prisma from '@/shared/lib/db/prisma';
import { isBaseIntegrationSlug } from '@/features/integrations/constants/slugs';
import { badRequestError, conflictError } from '@/shared/errors/app-error';
import {
  IntegrationRecord,
  IntegrationConnectionRecord,
  IntegrationRepository,
} from '../../types/integrations';
import {
  DEFAULT_CONNECTION_SETTING_KEY,
  ACTIVE_TEMPLATE_SETTING_KEY,
  PRODUCT_SYNC_PROFILE_SETTINGS_KEY,
  stripActiveTemplateScopesForConnection,
  remapProductSyncProfilesSetting,
  withDependencyTotal,
  normalizeOptionalConnectionId,
  toIntegrationRecord,
  toConnectionRecord,
  ConnectionDeleteOptions,
  ConnectionDependencyCounts,
} from './common';

const isPrismaNotFoundError = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025';

const updatePrismaConnectionScopedSettings = async (
  connectionId: string,
  replacementConnectionId: string | null
): Promise<void> => {
  const [defaultConnectionSetting, activeTemplateSetting, syncProfilesSetting] = await Promise.all([
    prisma.setting.findUnique({
      where: { key: DEFAULT_CONNECTION_SETTING_KEY },
      select: { value: true },
    }),
    prisma.setting.findUnique({
      where: { key: ACTIVE_TEMPLATE_SETTING_KEY },
      select: { value: true },
    }),
    prisma.setting.findUnique({
      where: { key: PRODUCT_SYNC_PROFILE_SETTINGS_KEY },
      select: { value: true },
    }),
  ]);

  if (defaultConnectionSetting?.value?.trim() === connectionId) {
    await prisma.setting.upsert({
      where: { key: DEFAULT_CONNECTION_SETTING_KEY },
      update: { value: replacementConnectionId ?? '' },
      create: {
        key: DEFAULT_CONNECTION_SETTING_KEY,
        value: replacementConnectionId ?? '',
      },
    });
  }

  const nextActiveTemplateValue = stripActiveTemplateScopesForConnection(
    activeTemplateSetting?.value ?? null,
    connectionId
  );
  if (nextActiveTemplateValue !== (activeTemplateSetting?.value ?? null)) {
    await prisma.setting.upsert({
      where: { key: ACTIVE_TEMPLATE_SETTING_KEY },
      update: { value: nextActiveTemplateValue ?? '' },
      create: {
        key: ACTIVE_TEMPLATE_SETTING_KEY,
        value: nextActiveTemplateValue ?? '',
      },
    });
  }

  const nextSyncProfilesValue = remapProductSyncProfilesSetting(
    syncProfilesSetting?.value ?? null,
    connectionId,
    replacementConnectionId
  );
  if (nextSyncProfilesValue !== (syncProfilesSetting?.value ?? null)) {
    await prisma.setting.upsert({
      where: { key: PRODUCT_SYNC_PROFILE_SETTINGS_KEY },
      update: { value: nextSyncProfilesValue ?? '[]' },
      create: {
        key: PRODUCT_SYNC_PROFILE_SETTINGS_KEY,
        value: nextSyncProfilesValue ?? '[]',
      },
    });
  }
};

const countPrismaConnectionDependencies = async (
  connectionId: string
): Promise<ConnectionDependencyCounts> => {
  const [
    productListings,
    categoryMappings,
    externalCategories,
    producerMappings,
    externalProducers,
    tagMappings,
    externalTags,
  ] = await Promise.all([
    prisma.productListing.count({ where: { connectionId } }),
    prisma.categoryMapping.count({ where: { connectionId } }),
    prisma.externalCategory.count({ where: { connectionId } }),
    prisma.producerMapping.count({ where: { connectionId } }),
    prisma.externalProducer.count({ where: { connectionId } }),
    prisma.tagMapping.count({ where: { connectionId } }),
    prisma.externalTag.count({ where: { connectionId } }),
  ]);

  return withDependencyTotal({
    productListings,
    categoryMappings,
    externalCategories,
    producerMappings,
    externalProducers,
    tagMappings,
    externalTags,
  });
};

const cleanupPrismaConnectionReferences = async (connectionId: string): Promise<void> => {
  await Promise.all([
    prisma.productListing.deleteMany({ where: { connectionId } }),
    prisma.categoryMapping.deleteMany({ where: { connectionId } }),
    prisma.externalCategory.deleteMany({ where: { connectionId } }),
    prisma.producerMapping.deleteMany({ where: { connectionId } }),
    prisma.externalProducer.deleteMany({ where: { connectionId } }),
    prisma.tagMapping.deleteMany({ where: { connectionId } }),
    prisma.externalTag.deleteMany({ where: { connectionId } }),
  ]);
  await updatePrismaConnectionScopedSettings(connectionId, null);
};

const reassignPrismaConnectionReferences = async (
  sourceConnectionId: string,
  replacementConnectionId: string
): Promise<void> => {
  await Promise.all([
    prisma.productListing.updateMany({
      where: { connectionId: sourceConnectionId },
      data: { connectionId: replacementConnectionId },
    }),
    prisma.categoryMapping.updateMany({
      where: { connectionId: sourceConnectionId },
      data: { connectionId: replacementConnectionId },
    }),
    prisma.externalCategory.updateMany({
      where: { connectionId: sourceConnectionId },
      data: { connectionId: replacementConnectionId },
    }),
    prisma.producerMapping.updateMany({
      where: { connectionId: sourceConnectionId },
      data: { connectionId: replacementConnectionId },
    }),
    prisma.externalProducer.updateMany({
      where: { connectionId: sourceConnectionId },
      data: { connectionId: replacementConnectionId },
    }),
    prisma.tagMapping.updateMany({
      where: { connectionId: sourceConnectionId },
      data: { connectionId: replacementConnectionId },
    }),
    prisma.externalTag.updateMany({
      where: { connectionId: sourceConnectionId },
      data: { connectionId: replacementConnectionId },
    }),
  ]);
  await updatePrismaConnectionScopedSettings(sourceConnectionId, replacementConnectionId);
};

const resolvePrismaReplacementConnectionId = async (input: {
  connectionId: string;
  integrationId: string;
  replacementConnectionId?: string | null | undefined;
}): Promise<string | null> => {
  const requestedReplacementId = normalizeOptionalConnectionId(input.replacementConnectionId);
  if (requestedReplacementId) {
    if (requestedReplacementId === input.connectionId) {
      throw badRequestError(
        'Replacement connection must be different from the deleted connection.'
      );
    }

    const replacementConnection = await prisma.integrationConnection.findFirst({
      where: {
        id: requestedReplacementId,
        integrationId: input.integrationId,
      },
      select: { id: true },
    });
    if (!replacementConnection) {
      throw badRequestError('Replacement connection does not exist in this integration.', {
        replacementConnectionId: requestedReplacementId,
        integrationId: input.integrationId,
      });
    }
    return replacementConnection.id;
  }

  const fallbackConnection = await prisma.integrationConnection.findFirst({
    where: {
      integrationId: input.integrationId,
      id: { not: input.connectionId },
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: { id: true },
  });
  return fallbackConnection?.id ?? null;
};

export function getPrismaIntegrationRepository(): IntegrationRepository {
  return {
    async listIntegrations(): Promise<IntegrationRecord[]> {
      const docs = await prisma.integration.findMany({
        orderBy: { name: 'asc' },
      });
      return docs.map(toIntegrationRecord);
    },

    async upsertIntegration(input: { name: string; slug: string }): Promise<IntegrationRecord> {
      const doc = await prisma.integration.upsert({
        where: { slug: input.slug },
        update: { name: input.name },
        create: { name: input.name, slug: input.slug },
      });
      return toIntegrationRecord(doc);
    },

    async getIntegrationById(id: string): Promise<IntegrationRecord | null> {
      const doc = await prisma.integration.findUnique({
        where: { id },
      });
      return doc ? toIntegrationRecord(doc) : null;
    },

    async listConnections(integrationId: string): Promise<IntegrationConnectionRecord[]> {
      const docs = await prisma.integrationConnection.findMany({
        where: { integrationId },
        orderBy: { name: 'asc' },
      });
      return docs.map(toConnectionRecord);
    },

    async getConnectionById(id: string): Promise<IntegrationConnectionRecord | null> {
      const doc = await prisma.integrationConnection.findUnique({
        where: { id },
      });
      return doc ? toConnectionRecord(doc) : null;
    },

    async getConnectionByIdAndIntegration(
      id: string,
      integrationId: string
    ): Promise<IntegrationConnectionRecord | null> {
      const doc = await prisma.integrationConnection.findFirst({
        where: { id, integrationId },
      });
      return doc ? toConnectionRecord(doc) : null;
    },

    async createConnection(
      integrationId: string,
      input: Record<string, unknown>
    ): Promise<IntegrationConnectionRecord> {
      const data: Prisma.IntegrationConnectionCreateInput = {
        integration: { connect: { id: integrationId } },
        name: String(input['name'] || 'New Connection'),
        username: String(input['username'] || ''),
        password: String(input['password'] || ''),
        ...input,
      } as unknown as Prisma.IntegrationConnectionCreateInput;
      const doc = await prisma.integrationConnection.create({ data });
      return toConnectionRecord(doc);
    },

    async updateConnection(
      id: string,
      input: Partial<IntegrationConnectionRecord>
    ): Promise<IntegrationConnectionRecord> {
      const updateData: Record<string, unknown> = { ...input };
      delete updateData['id'];
      delete updateData['createdAt'];

      const doc = await prisma.integrationConnection.update({
        where: { id },
        data: updateData as unknown as Prisma.IntegrationConnectionUpdateInput,
      });
      return toConnectionRecord(doc);
    },

    async deleteConnection(id: string, options?: ConnectionDeleteOptions): Promise<void> {
      const connection = await prisma.integrationConnection.findUnique({
        where: { id },
        select: { id: true, integrationId: true },
      });
      if (!connection) return;

      const integration = await prisma.integration.findUnique({
        where: { id: connection.integrationId },
        select: { slug: true },
      });
      const isBaseConnection = isBaseIntegrationSlug(integration?.slug ?? null);

      if (!isBaseConnection) {
        await cleanupPrismaConnectionReferences(id);
      } else {
        const dependencyCounts = await countPrismaConnectionDependencies(id);
        const replacementConnectionId = await resolvePrismaReplacementConnectionId({
          connectionId: id,
          integrationId: connection.integrationId,
          replacementConnectionId: options?.replacementConnectionId,
        });

        if (dependencyCounts.total > 0 && !replacementConnectionId) {
          throw conflictError(
            'Deleting this Base.com connection would orphan listing and mapping status links. Create/select another Base.com connection and retry with replacementConnectionId.',
            {
              connectionId: id,
              integrationId: connection.integrationId,
              dependencyCounts,
              replacementRequired: true,
            }
          );
        }

        if (replacementConnectionId) {
          await reassignPrismaConnectionReferences(id, replacementConnectionId);
        } else {
          await updatePrismaConnectionScopedSettings(id, null);
        }
      }

      try {
        await prisma.integrationConnection.delete({ where: { id } });
      } catch (error) {
        if (!isPrismaNotFoundError(error)) {
          throw error;
        }
      }
    },
  };
}
