import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

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
