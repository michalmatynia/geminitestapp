import "dotenv/config";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { getMongoDb } from "@/lib/db/mongo-client";
import { AUTH_SETTINGS_KEYS, parseJsonSetting, serializeSetting } from "@/lib/constants/auth-management";

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];

  if (!email || !password) {
    console.error("Usage: npx tsx scripts/create-superuser.ts <email> <password>");
    process.exit(1);
  }

  console.log(`Creating superuser: ${email}...`);

  const passwordHash = await bcrypt.hash(password, 12);
  let userId: string | null = null;
  let providerUsed = "";

  // 1. Create User
  if (process.env.MONGODB_URI) {
    // Try MongoDB first if configured
    console.log("Checking MongoDB...");
    try {
      const db = await getMongoDb();
      const existing = await db.collection("users").findOne({ email });
      
      if (existing) {
        console.log("User exists in MongoDB. Updating password...");
        await db.collection("users").updateOne(
          { _id: existing._id },
          { $set: { passwordHash, updatedAt: new Date() } }
        );
        userId = existing._id.toString();
      } else {
        console.log("Creating user in MongoDB...");
        const result = await db.collection("users").insertOne({
          email,
          name: "Super Admin",
          passwordHash,
          image: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        userId = result.insertedId.toString();
      }
      providerUsed = "mongodb";
    } catch (e) {
      console.error("MongoDB operation failed:", e);
    }
  }

  if (!userId && process.env.DATABASE_URL) {
    // Fallback to Prisma
    console.log("Checking Prisma (Postgres)...");
    try {
      const user = await prisma.user.upsert({
        where: { email },
        update: { passwordHash },
        create: {
          email,
          name: "Super Admin",
          passwordHash,
        },
      });
      userId = user.id;
      providerUsed = "prisma";
    } catch (e) {
      console.error("Prisma operation failed:", e);
    }
  }

  if (!userId) {
    console.error("Failed to create user. No DB provider available or operations failed.");
    process.exit(1);
  }

  console.log(`User ensured with ID: ${userId} (${providerUsed})`);

  // 2. Assign Role
  console.log("Assigning 'super_admin' role...");
  
  if (providerUsed === "mongodb") {
    const db = await getMongoDb();
    const settingsCollection = db.collection("settings");
    
    // Fetch existing roles map
    const rolesDoc = await settingsCollection.findOne({ 
      $or: [{ _id: AUTH_SETTINGS_KEYS.userRoles }, { key: AUTH_SETTINGS_KEYS.userRoles }] 
    });
    
    let userRoles = parseJsonSetting<Record<string, string>>(rolesDoc?.value as string, {});
    userRoles[userId] = "super_admin";
    
    const value = serializeSetting(userRoles);
    
    await settingsCollection.updateOne(
      { key: AUTH_SETTINGS_KEYS.userRoles }, // Use 'key' for consistency
      { $set: { key: AUTH_SETTINGS_KEYS.userRoles, value, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
    );
    console.log("Role assigned in MongoDB settings.");

  } else {
    // Prisma Settings
    const setting = await prisma.setting.findUnique({
      where: { key: AUTH_SETTINGS_KEYS.userRoles },
    });
    
    let userRoles = parseJsonSetting<Record<string, string>>(setting?.value, {});
    userRoles[userId] = "super_admin";
    
    await prisma.setting.upsert({
      where: { key: AUTH_SETTINGS_KEYS.userRoles },
      update: { value: serializeSetting(userRoles) },
      create: { key: AUTH_SETTINGS_KEYS.userRoles, value: serializeSetting(userRoles) },
    });
    console.log("Role assigned in Prisma settings.");
  }

  console.log("\nSuccess! Superuser created.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
