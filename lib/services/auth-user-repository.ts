import prisma from "@/lib/prisma";
import { getMongoDb } from "@/lib/db/mongo-client";
import { getAuthDataProvider } from "@/lib/services/auth-provider";

type AuthUserRecord = {
  id: string;
  email: string;
  name?: string | null;
  passwordHash?: string | null;
  image?: string | null;
};

type MongoUserDoc = {
  _id: { toString: () => string };
  email?: string | null;
  name?: string | null;
  passwordHash?: string | null;
  image?: string | null;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const findAuthUserByEmail = async (
  email: string
): Promise<AuthUserRecord | null> => {
  const normalized = normalizeEmail(email);
  const provider = await getAuthDataProvider();

  if (provider === "mongodb") {
    if (!process.env.MONGODB_URI) return null;
    const db = await getMongoDb();
    const user = await db
      .collection<MongoUserDoc>("users")
      .findOne({ email: normalized });
    if (!user || !user.email) return null;
    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name ?? null,
      passwordHash: user.passwordHash ?? null,
      image: user.image ?? null,
    };
  }

  if (!process.env.DATABASE_URL) return null;
  const user = await prisma.user.findUnique({
    where: { email: normalized },
    select: {
      id: true,
      email: true,
      name: true,
      passwordHash: true,
      image: true,
    },
  });
  if (!user || !user.email) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    passwordHash: user.passwordHash ?? null,
    image: user.image,
  };
};

export const normalizeAuthEmail = normalizeEmail;
