import { getMongoDb } from "@/shared/lib/db/mongo-client";

const LEGACY_KEYS = [
  "product_db_provider",
  "integration_db_provider",
  "auth_db_provider",
];

async function cleanupPrisma() {
  if (!process.env.DATABASE_URL) {
    console.log("[cleanup] Prisma skipped (DATABASE_URL not set)");
    return { count: 0 };
  }
  try {
    const { default: prisma } = await import("@/shared/lib/db/prisma");
    const result = await prisma.setting.deleteMany({
      where: { key: { in: LEGACY_KEYS } },
    });
    console.log(`[cleanup] Prisma deleted ${result.count} legacy settings`);
    return { count: result.count };
  } catch (error) {
    console.error("[cleanup] Prisma cleanup failed:", error);
    return { count: 0 };
  }
}

async function cleanupMongo() {
  if (!process.env.MONGODB_URI) {
    console.log("[cleanup] Mongo skipped (MONGODB_URI not set)");
    return { count: 0 };
  }
  try {
    const db = await getMongoDb();
    const result = await db
      .collection("settings")
      .deleteMany({
        $or: [
          { _id: { $in: LEGACY_KEYS as any } },
          { key: { $in: LEGACY_KEYS } },
        ],
      } as any);
    console.log(`[cleanup] Mongo deleted ${result.deletedCount ?? 0} legacy settings`);
    return { count: result.deletedCount ?? 0 };
  } catch (error) {
    console.error("[cleanup] Mongo cleanup failed:", error);
    return { count: 0 };
  }
}

async function main() {
  await cleanupPrisma();
  await cleanupMongo();
}

main().catch((error) => {
  console.error("[cleanup] Failed:", error);
  process.exit(1);
});
