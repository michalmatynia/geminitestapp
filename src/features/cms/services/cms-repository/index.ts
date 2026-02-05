import "server-only";

import { getCmsDataProvider } from "../cms-provider";
import { prismaCmsRepository } from "./prisma-cms-repository";
import { mongoCmsRepository } from "./mongo-cms-repository";
import prisma from "@/shared/lib/db/prisma";
import { Prisma } from "@prisma/client";
import type { CmsRepository } from "../../types/services/cms-repository";

let cachedRepository: CmsRepository | null = null;
let cachedProvider: "mongodb" | "prisma" | null = null;

const isMissingTableError = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  (error.code === "P2021" || error.code === "P2022");

const canUsePrismaCms = async (): Promise<boolean> => {
  if (!process.env.DATABASE_URL) return false;
  if (!("page" in prisma)) return false;
  try {
    await prisma.page.findFirst({ select: { id: true } });
    return true;
  } catch (error) {
    if (isMissingTableError(error)) return false;
    throw error;
  }
};

export async function getCmsRepository(): Promise<CmsRepository> {
  if (cachedRepository) return cachedRepository;
  const provider = await getCmsDataProvider();
  cachedProvider = provider;

  if (provider === "mongodb") {
    cachedRepository = mongoCmsRepository;
    return cachedRepository;
  }

  const prismaReady = await canUsePrismaCms();
  if (prismaReady) {
    cachedRepository = prismaCmsRepository;
    return cachedRepository;
  }

  if (process.env.MONGODB_URI) {
    console.warn("[cms] Prisma CMS tables missing; falling back to MongoDB.");
    cachedRepository = mongoCmsRepository;
    cachedProvider = "mongodb";
    return cachedRepository;
  }

  throw new Error("Prisma CMS tables are missing. Run `npx prisma db push`.");
}

export const getCmsRepositoryProvider = (): "mongodb" | "prisma" | null => cachedProvider;
