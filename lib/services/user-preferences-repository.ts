import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getMongoDb } from "@/lib/db/mongo-client";
import { getProductDataProvider } from "@/lib/services/product-provider";
import { operationFailedError } from "@/lib/errors/app-error";

export type UserPreferencesData = {
  productListNameLocale?: string | null;
  productListCatalogFilter?: string | null;
  productListCurrencyCode?: string | null;
  productListPageSize?: number | null;
};

export type UserPreferences = {
  id: string;
  userId: string;
  productListNameLocale: string | null;
  productListCatalogFilter: string | null;
  productListCurrencyCode: string | null;
  productListPageSize: number | null;
  createdAt: Date;
  updatedAt: Date;
};

type UserPreferencesDocument = {
  _id: string;
  userId: string;
  productListNameLocale: string | null;
  productListCatalogFilter: string | null;
  productListCurrencyCode: string | null;
  productListPageSize: number | null;
  createdAt: Date;
  updatedAt: Date;
};

const USER_PREFERENCES_COLLECTION = "user_preferences";

const toUserPreferences = (doc: UserPreferencesDocument): UserPreferences => ({
  id: doc._id,
  userId: doc.userId,
  productListNameLocale: doc.productListNameLocale,
  productListCatalogFilter: doc.productListCatalogFilter,
  productListCurrencyCode: doc.productListCurrencyCode,
  productListPageSize: doc.productListPageSize,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

const resolvePreferencesProvider = async (): Promise<"mongodb" | "prisma"> => {
  const provider = await getProductDataProvider();
  if (provider === "mongodb" && process.env.MONGODB_URI) return "mongodb";
  return "prisma";
};

const defaultPreferences = (userId: string) => ({
  userId,
  productListNameLocale: "name_en",
  productListCatalogFilter: "all",
  productListCurrencyCode: null,
  productListPageSize: 50,
});

/**
 * Ensure default user exists
 */
async function ensureDefaultUser(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    await prisma.user.create({
      data: {
        id: userId,
        name: "Default User",
        email: null,
      },
    });
  }
}

/**
 * Get user preferences by user ID
 * Creates default preferences if they don't exist
 */
export async function getUserPreferences(userId: string): Promise<UserPreferences> {
  const provider = await resolvePreferencesProvider();
  if (provider === "mongodb") {
    const db = await getMongoDb();
    const doc = await db
      .collection<UserPreferencesDocument>(USER_PREFERENCES_COLLECTION)
      .findOne({ $or: [{ _id: userId }, { userId }] });

    if (doc) {
      return toUserPreferences(doc);
    }

    const now = new Date();
    const document: UserPreferencesDocument = {
      _id: userId,
      ...defaultPreferences(userId),
      createdAt: now,
      updatedAt: now,
    };
    await db
      .collection<UserPreferencesDocument>(USER_PREFERENCES_COLLECTION)
      .insertOne(document);
    return toUserPreferences(document);
  }

  const existing = await prisma.userPreferences.findUnique({
    where: { userId },
  });

  if (existing) {
    return existing;
  }

  // Ensure user exists first
  await ensureDefaultUser(userId);

  // Create default preferences
  return await prisma.userPreferences.create({
    data: {
      userId,
      productListNameLocale: "name_en",
      productListCatalogFilter: "all",
      productListCurrencyCode: null,
      productListPageSize: 50,
    },
  });
}

/**
 * Update user preferences
 */
export async function updateUserPreferences(
  userId: string,
  data: Partial<UserPreferencesData>
): Promise<UserPreferences> {
  const provider = await resolvePreferencesProvider();
  if (provider === "mongodb") {
    const db = await getMongoDb();
    const now = new Date();
    const result = await db
      .collection<UserPreferencesDocument>(USER_PREFERENCES_COLLECTION)
      .findOneAndUpdate(
        { $or: [{ _id: userId }, { userId }] },
        {
          $set: {
            ...data,
            userId,
            updatedAt: now,
          },
          $setOnInsert: {
            ...defaultPreferences(userId),
            createdAt: now,
          },
        },
        { upsert: true, returnDocument: "after" }
      );

    if (!result) {
      throw operationFailedError("Failed to update preferences", undefined, {
        userId,
      });
    }

    return toUserPreferences(result);
  }

  try {
    // Ensure preferences exist
    await getUserPreferences(userId);

    return await prisma.userPreferences.update({
      where: { userId },
      data,
    });
  } catch (error) {
    // If it's a foreign key error, ensure user exists and try again
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      await ensureDefaultUser(userId);
      await getUserPreferences(userId);
      return await prisma.userPreferences.update({
        where: { userId },
        data,
      });
    }
    throw error;
  }
}

/**
 * Get or create preferences for user
 */
export async function getOrCreatePreferences(userId: string): Promise<UserPreferences> {
  return getUserPreferences(userId);
}
