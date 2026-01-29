import "server-only";

import { getCmsDataProvider } from "../cms-provider";
import { prismaCmsRepository } from "./prisma-cms-repository";
import { mongoCmsRepository } from "./mongo-cms-repository";
import type { CmsRepository } from "../../types/services/cms-repository";

export async function getCmsRepository(): Promise<CmsRepository> {
  const provider = await getCmsDataProvider();

  if (provider === "mongodb") {
    return mongoCmsRepository;
  }

  return prismaCmsRepository;
}
