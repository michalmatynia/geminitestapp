import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { getMongoDb } from "@/shared/lib/db/mongo-client";
import prisma from "@/shared/lib/db/prisma";
import { normalizeAuthEmail } from "@/features/auth/server";
import { auth } from "@/features/auth/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { authError, badRequestError, conflictError, internalError, notFoundError } from "@/shared/errors/app-error";
import type { AuthUserDto } from "@/shared/dtos/auth";
import { getAuthDataProvider, requireAuthProvider } from "@/features/auth/services/auth-provider";
import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { logAuthEvent } from "@/features/auth/utils/auth-request-logger";

export const runtime = "nodejs";

const updateSchema = z.object({
  name: z.string().trim().min(1).max(200).optional().nullable(),
  email: z.string().trim().email().optional().nullable(),
  emailVerified: z.boolean().optional().nullable(),
});

type MongoUserDoc = {
  _id: ObjectId;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  emailVerified?: Date | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
};

async function PATCH_handler(req: NextRequest, ctx: ApiHandlerContext, params: { id: string }): Promise<Response> {
  try {
    const session = await auth();
    const hasAccess =
      session?.user?.isElevated ||
      session?.user?.permissions?.includes("auth.users.write");
    if (!hasAccess) {
      throw authError("Unauthorized.");
    }
    const data = ctx.body as z.infer<typeof updateSchema> | undefined;
    if (!data) {
      throw badRequestError("Invalid payload");
    }
    await logAuthEvent({
      req,
      action: "auth.users.update",
      stage: "start",
      userId: session?.user?.id ?? null,
      body: { targetUserId: params.id },
    });

    const { name, email, emailVerified } = data;
    if (name === undefined && email === undefined && emailVerified === undefined) {
      return NextResponse.json(
        { error: "No updates provided." },
        { status: 400 }
      );
    }

    const { id: userId } = params;
    const provider = requireAuthProvider(await getAuthDataProvider());

    if (provider === "prisma") {
      if (!process.env.DATABASE_URL) {
        throw internalError("Prisma is not configured.");
      }
      const existing = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          emailVerified: true,
        },
      });
      if (!existing) {
        throw notFoundError("User not found.");
      }

      const nextEmail =
        typeof email === "string" ? normalizeAuthEmail(email) : undefined;
      if (nextEmail && nextEmail !== existing.email) {
        const conflict = await prisma.user.findUnique({
          where: { email: nextEmail },
          select: { id: true },
        });
        if (conflict && conflict.id !== userId) {
          throw conflictError("Email already in use.");
        }
      }

      const updated = await prisma.user.update({
        where: { id: userId },
        data: {
          ...(typeof name === "string" ? { name } : {}),
          ...(typeof nextEmail === "string" ? { email: nextEmail } : {}),
          ...(typeof emailVerified === "boolean"
            ? { emailVerified: emailVerified ? new Date() : null }
            : {}),
        },
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          emailVerified: true,
        },
      });

      const nowIso = new Date().toISOString();
      const payload: AuthUserDto = {
        id: updated.id,
        email: updated.email ?? null,
        name: updated.name ?? null,
        image: updated.image ?? null,
        emailVerified: updated.emailVerified
          ? updated.emailVerified.toISOString()
          : null,
        provider,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      await logAuthEvent({
        req,
        action: "auth.users.update",
        stage: "success",
        userId: session?.user?.id ?? null,
        body: { targetUserId: params.id },
        status: 200,
      });
      return NextResponse.json(payload);
    }

    if (!process.env.MONGODB_URI) {
      throw internalError("MongoDB is not configured.");
    }
    if (!ObjectId.isValid(userId)) {
      throw notFoundError("User not found.");
    }
    const db = await getMongoDb();
    const objectId = new ObjectId(userId);
    const existing = await db
      .collection<MongoUserDoc>("users")
      .findOne({ _id: objectId });
    if (!existing) {
      throw notFoundError("User not found.");
    }

    const nextEmail =
      typeof email === "string" ? normalizeAuthEmail(email) : undefined;
    if (nextEmail && nextEmail !== existing.email) {
      const conflict = await db
        .collection<MongoUserDoc>("users")
        .findOne({ email: nextEmail });
      if (conflict && conflict._id.toString() !== userId) {
        throw conflictError("Email already in use.");
      }
    }

    const updateDoc: Partial<MongoUserDoc> = {
      ...(typeof name === "string" ? { name } : {}),
      ...(typeof nextEmail === "string" ? { email: nextEmail } : {}),
      ...(typeof emailVerified === "boolean"
        ? { emailVerified: emailVerified ? new Date() : null }
        : {}),
      updatedAt: new Date(),
    };

    await db.collection<MongoUserDoc>("users").updateOne(
      { _id: objectId },
      { $set: updateDoc }
    );

    const updated = await db
      .collection<MongoUserDoc>("users")
      .findOne({ _id: objectId });
    if (!updated) {
      throw notFoundError("User not found.");
    }

    const payload: AuthUserDto = {
      id: updated._id.toString(),
      email: updated.email ?? null,
      name: updated.name ?? null,
      image: updated.image ?? null,
      emailVerified: updated.emailVerified
        ? updated.emailVerified.toISOString()
        : null,
      provider: "mongodb",
      createdAt: updated.createdAt?.toISOString() ?? new Date().toISOString(),
      updatedAt: updated.updatedAt?.toISOString() ?? new Date().toISOString(),
    };
    await logAuthEvent({
      req,
      action: "auth.users.update",
      stage: "success",
      userId: session?.user?.id ?? null,
      body: { targetUserId: params.id },
      status: 200,
    });
    return NextResponse.json(payload);
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "auth.users.[id].PATCH",
      fallbackMessage: "Failed to update user",
    });
  }
}

export const PATCH = apiHandlerWithParams<{ id: string }>(PATCH_handler, {
  source: "auth.users.[id].PATCH",
  parseJsonBody: true,
  bodySchema: updateSchema,
  rateLimitKey: "write",
  maxBodyBytes: 20_000,
  allowedMethods: ["PATCH"],
  requireCsrf: false,
});
