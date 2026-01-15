import { getProductDataProvider } from "@/lib/services/product-provider";
import { mongoImageFileRepository } from "@/lib/services/image-file-repository/mongo-image-file-repository";
import { prismaImageFileRepository } from "@/lib/services/image-file-repository/prisma-image-file-repository";
import type { ImageFileRepository } from "@/types/services/image-file-repository";

export const getImageFileRepository = async (): Promise<ImageFileRepository> => {
  const provider = await getProductDataProvider();
  if (provider === "mongodb") {
    return mongoImageFileRepository;
  }
  return prismaImageFileRepository;
};
