import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { hash } from "bcryptjs";
import prisma from "@/lib/prisma";
import { getMongoDb } from "@/lib/db/mongo-client";
import { getAuthDataProvider } from "@/lib/services/auth-provider";
import { normalizeAuthEmail } from "@/lib/services/auth-user-repository";

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
  const errorId = randomUUID();
  try {
    const body = await req.json();
    const data = registerSchema.parse(body);
    const email = normalizeAuthEmail(data.email);
    const passwordHash = await hash(data.password, 12);

    const provider = await getAuthDataProvider();
    if (provider === "mongodb") {
      if (!process.env.MONGODB_URI) {
        return NextResponse.json(
          { error: "MongoDB is not configured." },
          { status: 500 }
        );
      }
      const db = await getMongoDb();
      const existing = await db
        .collection<MongoUserDoc>("users")
        .findOne({ email });
      if (existing) {
        return NextResponse.json(
          { error: "User already exists." },
          { status: 400 }
        );
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
      return NextResponse.json(
        { error: "Postgres is not configured." },
        { status: 500 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: "User already exists." },
        { status: 400 }
      );
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
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid payload", details: error.flatten(), errorId },
        { status: 400 }
      );
    }
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message, errorId },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "An unknown error occurred", errorId },
      { status: 400 }
    );
  }
}
