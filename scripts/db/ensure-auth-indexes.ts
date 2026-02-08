import "dotenv/config";
import { getMongoDb } from "@/shared/lib/db/mongo-client";

async function main() {
  if (!process.env['MONGODB_URI']) {
    console.error("MONGODB_URI is not set.");
    process.exit(1);
  }

  const db = await getMongoDb();

  await db
    .collection("auth_security_attempts")
    .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await db
    .collection("auth_security_attempts")
    .createIndex({ scope: 1, value: 1 });

  await db
    .collection("auth_login_challenges")
    .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await db
    .collection("auth_login_challenges")
    .createIndex({ userId: 1 });

  console.log("Auth indexes ensured.");
  process.exit(0);
}

main().catch((error) => {
  console.error("Failed to ensure auth indexes:", error);
  process.exit(1);
});
