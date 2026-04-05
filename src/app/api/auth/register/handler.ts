import { hash } from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';

import { normalizeAuthEmail } from '@/features/auth/server';
import { getAuthSecurityPolicy, validatePasswordStrength } from '@/features/auth/server';
import { getAuthUserPageSettings } from '@/features/auth/server';
import { getAuthDataProvider, requireAuthProvider } from '@/features/auth/server';
import { logAuthEvent } from '@/features/auth/server';
import { ActivityTypes } from '@/shared/constants/observability';
import {
  registerPayloadSchema,
  type RegisterPayload,
} from '@/shared/contracts/auth';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import {
  conflictError,
  validationError,
  forbiddenError,
} from '@/shared/errors/app-error';
import { badRequestError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { logger } from '@/shared/utils/logger';
import { logActivity } from '@/shared/utils/observability/activity-service';

export const registerSchema = registerPayloadSchema;

type MongoUserDoc = {
  email: string;
  name?: string | null;
  passwordHash: string;
  emailVerified: Date | null;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function POST_handler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const data = ctx.body as RegisterPayload | undefined;
  if (!data) throw badRequestError('Invalid payload');
  await logAuthEvent({
    req,
    action: 'auth.register',
    stage: 'start',
    body: {
      email: data.email,
      name: data.name,
      emailVerified: data.emailVerified,
    },
  });
  const pageSettings = await getAuthUserPageSettings();
  if (!pageSettings.allowSignup) {
    throw forbiddenError('Registration is disabled.');
  }
  const policy = await getAuthSecurityPolicy();
  const passwordCheck = validatePasswordStrength(data.password, policy);
  if (!passwordCheck.ok) {
    throw validationError('Password does not meet security policy.', {
      issues: passwordCheck.errors,
    });
  }
  const email = normalizeAuthEmail(data.email);
  const passwordHash = await hash(data.password, 12);

  requireAuthProvider(await getAuthDataProvider());

  if (!process.env['MONGODB_URI']) {
    throw badRequestError('MongoDB is not configured.');
  }
  const db = await getMongoDb();
  const existing = await db.collection<MongoUserDoc>('users').findOne({ email });
  if (existing) {
    throw conflictError('User already exists.', { email });
  }
  const now = new Date();
  const doc: MongoUserDoc = {
    email,
    name: data.name ?? null,
    passwordHash,
    emailVerified: data.emailVerified ? now : null,
    image: null,
    createdAt: now,
    updatedAt: now,
  };
  const result = await db.collection<MongoUserDoc>('users').insertOne(doc);
  await logAuthEvent({
    req,
    action: 'auth.register',
    stage: 'success',
    userId: result.insertedId.toString(),
    body: { email: doc.email, name: doc.name },
    status: 201,
  });
  void logActivity({
    type: ActivityTypes.AUTH.REGISTERED,
    description: `User registered: ${doc.email}`,
    userId: result.insertedId.toString(),
    entityId: result.insertedId.toString(),
    entityType: 'user',
    metadata: { email: doc.email },
  }).catch((error: Error) => {
    logger.warn('Failed to log registration activity', {
      service: 'auth.register',
      error,
    });
  });
  return NextResponse.json(
    { id: result.insertedId.toString(), email: doc.email, name: doc.name },
    { status: 201 }
  );
}
