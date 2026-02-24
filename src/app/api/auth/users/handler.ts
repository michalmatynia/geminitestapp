import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/features/auth/server';
import { getAuthDataProvider, requireAuthProvider } from '@/features/auth/server';
import { logAuthEvent } from '@/features/auth/server';
import type { AuthUser } from '@/shared/contracts/auth';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { authError, internalError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';

import type { ObjectId } from 'mongodb';

type MongoUserDoc = {
  _id: ObjectId;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  emailVerified?: Date | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
};

export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
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
    const users: AuthUser[] = rows.map((row) => ({
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
    return NextResponse.json({ provider, users }, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
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

  const users: AuthUser[] = docs.map((doc: MongoUserDoc) => ({
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
  return NextResponse.json({ provider: 'mongodb', users }, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
