import { NextResponse } from "next/server";
import { z } from "zod";
import { hash } from "bcryptjs";
import prisma from "@/lib/prisma";
import { getMongoDb } from "@/lib/db/mongo-client";
import { getAuthDataProvider } from "@/lib/services/auth-provider";
import { normalizeAuthEmail } from "@/lib/services/auth-user-repository";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { parseJsonBody } from "@/lib/api/parse-json";
import { conflictError, internalError } from "@/lib/errors/app-error";

export const runtime = "nodejs";

const registerSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
  name: z.string().trim().min(1).optional(),
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

export async function POST(req: Request) {
  try {
    const parsed = await parseJsonBody(req, registerSchema, {
      logPrefix: "auth.register.POST",
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const data = parsed.data;
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
        emailVerified: null,
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
