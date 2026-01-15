import { getProductDataProvider } from "@/lib/services/product-provider";
import { mongoCatalogRepository } from "@/lib/services/catalog-repository/mongo-catalog-repository";
import { prismaCatalogRepository } from "@/lib/services/catalog-repository/prisma-catalog-repository";
import type { CatalogRepository } from "@/lib/services/catalog-repository/types";

export const getCatalogRepository = async (): Promise<CatalogRepository> => {
  const provider = await getProductDataProvider();
  if (provider === "mongodb") {
    return mongoCatalogRepository;
  }
  return prismaCatalogRepository;
};
