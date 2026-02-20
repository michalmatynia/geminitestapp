import { Prisma, Producer as PrismaProducer } from '@prisma/client';

import type { 
  ProducerRepository, 
  ProducerFilters 
} from '@/shared/contracts/products';
import prisma from '@/shared/lib/db/prisma';
import type { 
  Producer 
} from '@/shared/contracts/products';

const toProducerDomain = (producer: PrismaProducer): Producer => ({
  id: producer.id,
  name: producer.name,
  website: producer.website ?? null,
  createdAt: producer.createdAt.toISOString(),
  updatedAt: producer.updatedAt.toISOString(),
});

export const prismaProducerRepository: ProducerRepository = {
  async listProducers(filters: ProducerFilters): Promise<Producer[]> {
    const where: Prisma.ProducerWhereInput = {};
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { website: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const producers = await prisma.producer.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return producers.map(toProducerDomain);
  },

  async getProducerById(id: string): Promise<Producer | null> {
    const producer = await prisma.producer.findUnique({
      where: { id },
    });
    return producer ? toProducerDomain(producer) : null;
  },

  async createProducer(data: { name: string; website?: string | null }): Promise<Producer> {
    const producer = await prisma.producer.create({
      data: {
        name: data.name,
        ...(data.website !== undefined && { website: data.website }),
      },
    });
    return toProducerDomain(producer);
  },

  async updateProducer(id: string, data: { name?: string; website?: string | null }): Promise<Producer> {
    const producer = await prisma.producer.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.website !== undefined && { website: data.website }),
      },
    });
    return toProducerDomain(producer);
  },

  async deleteProducer(id: string): Promise<void> {
    await prisma.producer.delete({
      where: { id },
    });
  },

  async findByName(name: string): Promise<Producer | null> {
    const producer = await prisma.producer.findUnique({
      where: { name },
    });
    return producer ? toProducerDomain(producer) : null;
  },
};