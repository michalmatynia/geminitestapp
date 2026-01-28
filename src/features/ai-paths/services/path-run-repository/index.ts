import "server-only";

import { getAppDbProvider } from "@/shared/lib/db/app-db-provider";
import { mongoPathRunRepository } from "./mongo-path-run-repository";
import { prismaPathRunRepository } from "./prisma-path-run-repository";
import type { AiPathRunRepository } from "@/features/ai-paths/types/path-run-repository";

export const getPathRunRepository = async (): Promise<AiPathRunRepository> => {
  const provider = await getAppDbProvider();
  if (provider === "mongodb") {
    return mongoPathRunRepository;
  }
  return prismaPathRunRepository;
};
