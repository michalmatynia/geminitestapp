import prisma from "@/lib/prisma";

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
  // Ensure preferences exist
  await getUserPreferences(userId);

  return await prisma.userPreferences.update({
    where: { userId },
    data,
  });
}

/**
 * Get or create preferences for user
 */
export async function getOrCreatePreferences(userId: string): Promise<UserPreferences> {
  return getUserPreferences(userId);
}
