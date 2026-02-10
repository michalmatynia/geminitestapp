import { Prisma } from '@prisma/client';

import type {
  BaseProducer,
  ExternalProducer,
  ExternalProducerSyncInput,
} from '@/features/integrations/types/producer-mapping';
import prisma from '@/shared/lib/db/prisma';

export type ExternalProducerRepository = {
  syncFromBase: (connectionId: string, producers: BaseProducer[]) => Promise<number>;
  listByConnection: (connectionId: string) => Promise<ExternalProducer[]>;
  getById: (id: string) => Promise<ExternalProducer | null>;
  getByExternalId: (connectionId: string, externalId: string) => Promise<ExternalProducer | null>;
  deleteByConnection: (connectionId: string) => Promise<number>;
};

type ExternalProducerDoc = Prisma.ExternalProducerGetPayload<Record<string, never>>;

const toRecord = (doc: ExternalProducerDoc): ExternalProducer => ({
  id: doc.id,
  connectionId: doc.connectionId,
  externalId: doc.externalId,
  name: doc.name,
  metadata: doc.metadata as Record<string, unknown> | null,
  fetchedAt: doc.fetchedAt,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

export function getExternalProducerRepository(): ExternalProducerRepository {
  return {
    async syncFromBase(connectionId: string, producers: BaseProducer[]): Promise<number> {
      const now = new Date();
      const syncInputs: ExternalProducerSyncInput[] = producers.map((producer: BaseProducer) => ({
        connectionId,
        externalId: producer.id,
        name: producer.name,
      }));

      let count = 0;
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        for (const input of syncInputs) {
          await tx.externalProducer.upsert({
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

    async listByConnection(connectionId: string): Promise<ExternalProducer[]> {
      const records = await prisma.externalProducer.findMany({
        where: { connectionId },
        orderBy: [{ name: 'asc' }],
      });

      return records.map((record: ExternalProducerDoc) => toRecord(record));
    },

    async getById(id: string): Promise<ExternalProducer | null> {
      const record = await prisma.externalProducer.findUnique({
        where: { id },
      });
      if (!record) return null;
      return toRecord(record);
    },

    async getByExternalId(
      connectionId: string,
      externalId: string
    ): Promise<ExternalProducer | null> {
      const record = await prisma.externalProducer.findUnique({
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
      const result = await prisma.externalProducer.deleteMany({
        where: { connectionId },
      });
      return result.count;
    },
  };
}
