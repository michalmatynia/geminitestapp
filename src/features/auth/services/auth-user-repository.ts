import { getAuthDataProvider, requireAuthProvider } from '@/features/auth/services/auth-provider';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';
import type { AuthUserRecord } from '@/shared/contracts/auth';

type MongoUserDoc = {
  email?: string | null;
  name?: string | null;
  passwordHash?: string | null;
  image?: string | null;
  emailVerified?: Date | null;
};

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

export const findAuthUserByEmail = async (email: string): Promise<AuthUserRecord | null> => {
  const normalized = normalizeEmail(email);
  const provider = requireAuthProvider(await getAuthDataProvider());
  await logSystemEvent({
    level: 'info',
    message: `[AUTH-REPO] Finding user ${normalized} using ${provider}`,
    context: { email: normalized, provider },
  });
  if (provider === 'prisma') {
    const user = await prisma.user.findUnique({
      where: { email: normalized },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
        image: true,
        emailVerified: true,
      },
    });
    if (!user?.email) return null;
    return {
      id: user.id,
      email: user.email,
      name: user.name ?? null,
      passwordHash: user.passwordHash ?? null,
      image: user.image ?? null,
      emailVerified: user.emailVerified ?? null,
    };
  }
  if (!process.env['MONGODB_URI']) {
    await logSystemEvent({
      level: 'warn',
      message: '[AUTH-REPO] MONGODB_URI missing',
    });
    return null;
  }
  const db = await getMongoDb();
  const user = await db.collection<MongoUserDoc>('users').findOne({ email: normalized });
  if (!user || !user.email) {
    await logSystemEvent({
      level: 'info',
      message: '[AUTH-REPO] MongoDB user not found',
      context: { email: normalized },
    });
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

export const findAuthUserById = async (userId: string): Promise<AuthUserRecord | null> => {
  const provider = requireAuthProvider(await getAuthDataProvider());
  if (provider === 'prisma') {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
        image: true,
        emailVerified: true,
      },
    });
    if (!user?.email) return null;
    return {
      id: user.id,
      email: user.email,
      name: user.name ?? null,
      passwordHash: user.passwordHash ?? null,
      image: user.image ?? null,
      emailVerified: user.emailVerified ?? null,
    };
  }
  if (!process.env['MONGODB_URI']) return null;
  const db = await getMongoDb();
  const { ObjectId } = await import('mongodb');
  if (!ObjectId.isValid(userId)) return null;
  const user = await db.collection<MongoUserDoc>('users').findOne({ _id: new ObjectId(userId) });
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
