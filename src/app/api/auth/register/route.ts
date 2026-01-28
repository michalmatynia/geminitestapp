import { NextResponse } from "next/server";
import { z } from "zod";
import { hash } from "bcryptjs";
import prisma from "@/shared/lib/db/prisma";
import { getMongoDb } from "@/shared/lib/db/mongo-client";
import { getAuthDataProvider } from "@/features/auth/server";
import { normalizeAuthEmail } from "@/features/auth/server";
import { getAuthSecurityPolicy, validatePasswordStrength } from "@/features/auth/server";
import { getAuthUserPageSettings } from "@/features/auth/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { parseJsonBody } from "@/features/products/server";
import { conflictError, internalError, validationError, forbiddenError } from "@/shared/errors/app-error";
import { apiHandler } from "@/shared/lib/api/api-handler";

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

async function POST_handler(req: Request) {
  try {
    const parsed = await parseJsonBody(req, registerSchema, {
      logPrefix: "auth.register.POST",
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const data = parsed.data;
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

    const provider = await getAuthDataProvider();
    if (provider === "mongodb") {
      if (!process.env.MONGODB_URI) {
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
      return NextResponse.json(
        { id: result.insertedId.toString(), email: doc.email, name: doc.name },
        { status: 201 }
      );
    }

    if (!process.env.DATABASE_URL) {
      throw internalError("Postgres is not configured.");
    }

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      throw conflictError("User already exists.", { email });
    }

    const user = await prisma.user.create({
      data: {
        email,
        name: data.name ?? null,
        passwordHash,
        ...(data.emailVerified ? { emailVerified: new Date() } : {}),
      },
      select: { id: true, email: true, name: true },
    });
    return NextResponse.json(user, { status: 201 });
  } catch (error: unknown) {
    return createErrorResponse(error, {
      request: req,
      source: "auth.register.POST",
      fallbackMessage: "Failed to register user",
    });
  }
}

export const POST = apiHandler(POST_handler, { source: "auth.register.POST" });
