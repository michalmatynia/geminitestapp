import "server-only";

import { getProductDataProvider } from "@/features/products/services/product-provider";
import { mongoCatalogRepository } from "@/features/products/services/catalog-repository/mongo-catalog-repository";
import { prismaCatalogRepository } from "@/features/products/services/catalog-repository/prisma-catalog-repository";
import type { CatalogRepository } from "@/features/products/types/services/catalog-repository";

export const getCatalogRepository = async (): Promise<CatalogRepository> => {
  const provider = await getProductDataProvider();
  if (provider === "mongodb") {
    return mongoCatalogRepository;
  }
  return prismaCatalogRepository;
};
