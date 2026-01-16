import "dotenv/config";
import { MongoClient } from "mongodb";
import { PrismaClient } from "@prisma/client";

const provider = process.env.NOTE_DB_PROVIDER;
const hasMongo = Boolean(process.env.MONGODB_URI);
const hasPrisma = Boolean(process.env.DATABASE_URL);

const backfillMongo = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set.");
  }
  const dbName = process.env.MONGODB_DB || "app";
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  const notes = db.collection("notes");

  const result = await notes.updateMany(
    { color: { $type: "string" } },
    [{ $set: { color: { $toLower: "$color" } } }]
  );

  await client.close();
  return result.modifiedCount ?? 0;
};

const backfillPrisma = async () => {
  const prisma = new PrismaClient();
  const notes = await prisma.note.findMany({
    select: { id: true, color: true },
  });
  let updated = 0;
  for (const note of notes) {
    if (!note.color) continue;
    const normalized = note.color.toLowerCase();
    if (normalized === note.color) continue;
    await prisma.note.update({
      where: { id: note.id },
      data: { color: normalized },
    });
    updated += 1;
  }
  await prisma.$disconnect();
  return updated;
};

const main = async () => {
  if (provider === "mongodb" || (!provider && hasMongo)) {
    const count = await backfillMongo();
    console.log(`MongoDB: normalized ${count} note colors.`);
    return;
  }
  if (provider === "prisma" || (!provider && hasPrisma)) {
    const count = await backfillPrisma();
    console.log(`Prisma: normalized ${count} note colors.`);
    return;
  }
  throw new Error("No database configuration detected for backfill.");
};

main().catch((error) => {
  console.error("Failed to backfill note colors:", error);
  process.exit(1);
});
