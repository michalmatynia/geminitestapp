import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/features/auth/server';
import { getAuthDataProvider, requireAuthProvider } from '@/features/auth/services/auth-provider';
import { logAuthEvent } from '@/features/auth/utils/auth-request-logger';
import type { AuthUserDto } from '@/shared/dtos/auth';
import { authError, internalError } from '@/shared/errors/app-error';
import { apiHandler } from '@/shared/lib/api/api-handler';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';
import type { ApiHandlerContext } from '@/shared/types/api';

import type { ObjectId } from 'mongodb';

export const runtime = 'nodejs';

type MongoUserDoc = {
  _id: ObjectId;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  emailVerified?: Date | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
};

async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const session = await auth();
  const hasAccess =
    session?.user?.isElevated ||
    session?.user?.permissions?.includes('auth.users.read');
  if (!hasAccess) {
    throw authError('Unauthorized.');
  }
  await logAuthEvent({
    req,
    action: 'auth.users.list',
    stage: 'start',
    userId: session?.user?.id ?? null,
  });
  const provider = requireAuthProvider(await getAuthDataProvider());
  if (provider === 'prisma') {
    if (!process.env['DATABASE_URL']) {
      throw internalError('Prisma is not configured.');
    }
    const rows = await prisma.user.findMany({
      take: 500,
      orderBy: { id: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        emailVerified: true,
      },
    });
    const nowIso = new Date().toISOString();
    const users: AuthUserDto[] = rows.map((row) => ({
      id: row.id,
      email: row.email ?? null,
      name: row.name ?? null,
      image: row.image ?? null,
      emailVerified: row.emailVerified ? row.emailVerified.toISOString() : null,
      provider,
      createdAt: nowIso,
      updatedAt: nowIso,
    }));
    await logAuthEvent({
      req,
      action: 'auth.users.list',
      stage: 'success',
      userId: session?.user?.id ?? null,
      status: 200,
      extra: { count: users.length },
    });
    return NextResponse.json({ provider, users });
  }

  if (!process.env['MONGODB_URI']) {
    throw internalError('MongoDB is not configured.');
  }
  const db = await getMongoDb();
  const docs = await db
    .collection<MongoUserDoc>('users')
    .find({})
    .sort({ createdAt: -1 })
    .limit(500)
    .toArray();

  const users: AuthUserDto[] = docs.map((doc: MongoUserDoc) => ({
    id: doc._id.toString(),
    email: doc.email ?? null,
    name: doc.name ?? null,
    image: doc.image ?? null,
    emailVerified: doc.emailVerified
      ? doc.emailVerified.toISOString()
      : null,
    provider: 'mongodb',
    createdAt: doc.createdAt?.toISOString() ?? new Date().toISOString(),
    updatedAt: doc.updatedAt?.toISOString() ?? new Date().toISOString(),
  }));

  await logAuthEvent({
    req,
    action: 'auth.users.list',
    stage: 'success',
    userId: session?.user?.id ?? null,
    status: 200,
    extra: { count: users.length },
  });
  return NextResponse.json({ provider: 'mongodb', users });
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
  { source: 'auth.users.GET', requireCsrf: false });
