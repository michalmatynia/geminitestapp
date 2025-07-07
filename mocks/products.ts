import { PrismaClient } from "@prisma/client";
import cuid from "cuid";

export const createMockProduct = async (
  prisma: PrismaClient,
  overrides: Partial<{
    name: string;
    price: number;
    sku: string;
    createdAt: Date;
  }> = {}
) => {
  return await prisma.product.create({
    data: {
      name: "Test Product",
      price: 100,
      sku: `TP${cuid()}`,
      createdAt: new Date(),
      ...overrides,
    },
  });
};
