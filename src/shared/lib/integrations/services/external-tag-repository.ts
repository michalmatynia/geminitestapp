import { Prisma } from '@prisma/client';

import type { BaseTag, ExternalTag, ExternalTagSyncInput } from '@/shared/contracts/integrations';
import prisma from '@/shared/lib/db/prisma';

export type ExternalTagRepository = {
  syncFromBase: (connectionId: string, tags: BaseTag[]) => Promise<number>;
  listByConnection: (connectionId: string) => Promise<ExternalTag[]>;
  getById: (id: string) => Promise<ExternalTag | null>;
  getByExternalId: (connectionId: string, externalId: string) => Promise<ExternalTag | null>;
  deleteByConnection: (connectionId: string) => Promise<number>;
};

type ExternalTagDoc = Prisma.ExternalTagGetPayload<Record<string, never>>;

const toRecord = (doc: ExternalTagDoc): ExternalTag => ({
  id: doc.id,
  connectionId: doc.connectionId,
  externalId: doc.externalId,
  name: doc.name,
  metadata: doc.metadata as Record<string, unknown> | null,
  fetchedAt: doc.fetchedAt.toISOString(),
  createdAt: doc.createdAt.toISOString(),
  updatedAt: doc.updatedAt.toISOString(),
});

export function getExternalTagRepository(): ExternalTagRepository {
  return {
    async syncFromBase(connectionId: string, tags: BaseTag[]): Promise<number> {
      const now = new Date();
      const syncInputs: ExternalTagSyncInput[] = tags.map((tag: BaseTag) => ({
        connectionId,
        externalId: tag.id,
        name: tag.name,
      }));

      let count = 0;
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        for (const input of syncInputs) {
          await tx.externalTag.upsert({
            where: {
              connectionId_externalId: {
                connectionId: input.connectionId,
                externalId: input.externalId,
              },
            },
            create: {
              connectionId: input.connectionId,
              externalId: input.externalId,
              name: input.name,
              fetchedAt: now,
            },
            update: {
              name: input.name,
              fetchedAt: now,
            },
          });
          count++;
        }
      });

      return count;
    },

    async listByConnection(connectionId: string): Promise<ExternalTag[]> {
      const records = await prisma.externalTag.findMany({
        where: { connectionId },
        orderBy: [{ name: 'asc' }],
      });

      return records.map((record: ExternalTagDoc) => toRecord(record));
    },

    async getById(id: string): Promise<ExternalTag | null> {
      const record = await prisma.externalTag.findUnique({
        where: { id },
      });
      if (!record) return null;
      return toRecord(record);
    },

    async getByExternalId(connectionId: string, externalId: string): Promise<ExternalTag | null> {
      const record = await prisma.externalTag.findUnique({
        where: {
          connectionId_externalId: {
            connectionId,
            externalId,
          },
        },
      });
      if (!record) return null;
      return toRecord(record);
    },

    async deleteByConnection(connectionId: string): Promise<number> {
      const result = await prisma.externalTag.deleteMany({
        where: { connectionId },
      });
      return result.count;
    },
  };
}
