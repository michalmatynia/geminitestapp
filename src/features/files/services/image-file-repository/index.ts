import "server-only";

import { getProductDataProvider } from "@/features/products/server";
import { mongoImageFileRepository } from "@/features/files/services/image-file-repository/mongo-image-file-repository";
import { prismaImageFileRepository } from "@/features/files/services/image-file-repository/prisma-image-file-repository";
import type { ImageFileRepository } from "@/features/files/types/services/image-file-repository";

export const getImageFileRepository = async (): Promise<ImageFileRepository> => {
  const provider = await getProductDataProvider();
  if (provider === "mongodb") {
    return mongoImageFileRepository;
  }
  return prismaImageFileRepository;
};
