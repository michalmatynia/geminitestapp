import { NextResponse } from "next/server";
import type { ObjectId } from "mongodb";
import prisma from "@/shared/lib/db/prisma";
import { getMongoDb } from "@/shared/lib/db/mongo-client";
import { getAuthDataProvider } from "@/features/auth/server";
import { auth } from "@/features/auth/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { authError, internalError } from "@/shared/errors/app-error";
import type { AuthUserSummary } from "@/features/auth/server";
import { apiHandler } from "@/shared/lib/api/api-handler";

export const runtime = "nodejs";

type MongoUserDoc = {
  _id: ObjectId;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  emailVerified?: Date | null;
  createdAt?: Date | null;
};

async function GET_handler(req: NextRequest): Promise<Response> {
  try {
    const session = await auth();
    const hasAccess =
      session?.user?.isElevated ||
      session?.user?.permissions?.includes("auth.users.read");
    if (!hasAccess) {
      throw authError("Unauthorized.");
    }
    const provider = await getAuthDataProvider();
    if (provider === "mongodb") {
      if (!process.env.MONGODB_URI) {
        throw internalError("MongoDB is not configured.");
      }
      const db = await getMongoDb();
      const docs = await db
        .collection<MongoUserDoc>("users")
        .find({})
        .sort({ createdAt: -1 })
        .limit(500)
        .toArray();

      const users: AuthUserSummary[] = docs.map((doc: MongoUserDoc) => ({
        id: doc._id.toString(),
        email: doc.email ?? null,
        name: doc.name ?? null,
        image: doc.image ?? null,
        emailVerified: doc.emailVerified
          ? doc.emailVerified.toISOString()
          : null,
        provider,
      }));

      return NextResponse.json({ provider, users });
    }

    if (!process.env.DATABASE_URL) {
      throw internalError("Postgres is not configured.");
    }

    type PrismaUserSummary = {
      id: string;
      email: string | null;
      name: string | null;
      image: string | null;
      emailVerified: Date | null;
    };

    const users = (await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        emailVerified: true,
      },
      orderBy: { email: "asc" },
    })) as PrismaUserSummary[];

    const payload: AuthUserSummary[] = users.map((user: PrismaUserSummary) => ({
      id: user.id,
      email: user.email ?? null,
      name: user.name ?? null,
      image: user.image ?? null,
      emailVerified: user.emailVerified
        ? user.emailVerified.toISOString()
        : null,
      provider,
    }));

    return NextResponse.json({ provider, users: payload });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "auth.users.GET",
      fallbackMessage: "Failed to load users",
    });
  }
}

export const GET = apiHandler(GET_handler, { source: "auth.users.GET" });
