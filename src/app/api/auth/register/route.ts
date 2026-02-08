import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hash } from "bcryptjs";
import { getMongoDb } from "@/shared/lib/db/mongo-client";
import prisma from "@/shared/lib/db/prisma";
import { normalizeAuthEmail } from "@/features/auth/server";
import { getAuthSecurityPolicy, validatePasswordStrength } from "@/features/auth/server";
import { getAuthUserPageSettings } from "@/features/auth/server";
import { badRequestError } from "@/shared/errors/app-error";
import { conflictError, internalError, validationError, forbiddenError } from "@/shared/errors/app-error";
import { getAuthDataProvider, requireAuthProvider } from "@/features/auth/services/auth-provider";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { logAuthEvent } from "@/features/auth/utils/auth-request-logger";

export const runtime = "nodejs";

const registerSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
  name: z.string().trim().min(1).optional(),
  emailVerified: z.boolean().optional(),
});

type MongoUserDoc = {
  email: string;
  name?: string | null;
  passwordHash: string;
  emailVerified: Date | null;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

async function POST_handler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const data = ctx.body as z.infer<typeof registerSchema> | undefined;
  if (!data) throw badRequestError("Invalid payload");
  await logAuthEvent({
    req,
    action: "auth.register",
    stage: "start",
    body: { email: data.email, name: data.name, emailVerified: data.emailVerified },
  });
  const pageSettings = await getAuthUserPageSettings();
  if (!pageSettings.allowSignup) {
    throw forbiddenError("Registration is disabled.");
  }
  const policy = await getAuthSecurityPolicy();
  const passwordCheck = validatePasswordStrength(data.password, policy);
  if (!passwordCheck.ok) {
    throw validationError("Password does not meet security policy.", {
      issues: passwordCheck.errors,
    });
  }
  const email = normalizeAuthEmail(data.email);
  const passwordHash = await hash(data.password, 12);

  const provider = requireAuthProvider(await getAuthDataProvider());
  if (provider === "prisma") {
    if (!process.env["DATABASE_URL"]) {
      throw internalError("Prisma is not configured.");
    }
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      throw conflictError("User already exists.", { email });
    }
    const now = new Date();
    const user = await prisma.user.create({
      data: {
        email,
        name: data.name ?? null,
        passwordHash,
        emailVerified: data.emailVerified ? now : null,
        image: null,
      },
      select: { id: true, email: true, name: true },
    });
    await logAuthEvent({
      req,
      action: "auth.register",
      stage: "success",
      userId: user.id,
      body: { email: user.email, name: user.name },
      status: 201,
    });
    return NextResponse.json(
      { id: user.id, email: user.email, name: user.name },
      { status: 201 }
    );
  }

  if (!process.env["MONGODB_URI"]) {
    throw internalError("MongoDB is not configured.");
  }
  const db = await getMongoDb();
  const existing = await db
    .collection<MongoUserDoc>("users")
    .findOne({ email });
  if (existing) {
    throw conflictError("User already exists.", { email });
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
  const result = await db.collection<MongoUserDoc>("users").insertOne(doc);
  await logAuthEvent({
    req,
    action: "auth.register",
    stage: "success",
    userId: result.insertedId.toString(),
    body: { email: doc.email, name: doc.name },
    status: 201,
  });
  return NextResponse.json(
    { id: result.insertedId.toString(), email: doc.email, name: doc.name },
    { status: 201 }
  );
}

export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
 {
   source: "auth.register.POST",
   parseJsonBody: true,
   bodySchema: registerSchema,
   rateLimitKey: "auth",
   maxBodyBytes: 40_000,
   allowedMethods: ["POST"],
   requireCsrf: false,
 });
