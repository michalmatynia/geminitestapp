import { getMongoDb } from "@/shared/lib/db/mongo-client";

type AuthUserRecord = {
  id: string;
  email: string;
  name?: string | null;
  passwordHash?: string | null;
  image?: string | null;
  emailVerified?: Date | null;
};

type MongoUserDoc = {
  email?: string | null;
  name?: string | null;
  passwordHash?: string | null;
  image?: string | null;
  emailVerified?: Date | null;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const findAuthUserByEmail = async (
  email: string
): Promise<AuthUserRecord | null> => {
  const normalized = normalizeEmail(email);
  console.log(`[AUTH-REPO] Finding user ${normalized} using mongodb`);
  if (!process.env.MONGODB_URI) {
    console.log("[AUTH-REPO] MONGODB_URI missing");
    return null;
  }
  const db = await getMongoDb();
  const user = await db
    .collection<MongoUserDoc>("users")
    .findOne({ email: normalized });
  if (!user || !user.email) {
    console.log("[AUTH-REPO] MongoDB user not found");
    return null;
  }
  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name ?? null,
    passwordHash: user.passwordHash ?? null,
    image: user.image ?? null,
    emailVerified: user.emailVerified ?? null,
  };
};

export const findAuthUserById = async (
  userId: string
): Promise<AuthUserRecord | null> => {
  if (!process.env.MONGODB_URI) return null;
  const db = await getMongoDb();
  const { ObjectId } = await import("mongodb");
  if (!ObjectId.isValid(userId)) return null;
  const user = await db
    .collection<MongoUserDoc>("users")
    .findOne({ _id: new ObjectId(userId) });
  if (!user || !user.email) return null;
  return {
    id: userId,
    email: user.email,
    name: user.name ?? null,
    passwordHash: user.passwordHash ?? null,
    image: user.image ?? null,
    emailVerified: user.emailVerified ?? null,
  };
};

export const normalizeAuthEmail = normalizeEmail;
