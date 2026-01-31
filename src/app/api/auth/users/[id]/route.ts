import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { getMongoDb } from "@/shared/lib/db/mongo-client";
import { normalizeAuthEmail } from "@/features/auth/server";
import { auth } from "@/features/auth/server";
import { parseJsonBody } from "@/features/products/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { authError, conflictError, internalError, notFoundError } from "@/shared/errors/app-error";
import type { AuthUserSummary } from "@/features/auth/server";
import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";

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
  updatedAt?: Date | null;
};

async function PATCH_handler(req: NextRequest, _ctx: ApiHandlerContext, params: { id: string }): Promise<Response> {
  try {
    const session = await auth();
    const hasAccess =
      session?.user?.isElevated ||
      session?.user?.permissions?.includes("auth.users.write");
    if (!hasAccess) {
      throw authError("Unauthorized.");
    }
    const parsed = await parseJsonBody(req, updateSchema, {
      logPrefix: "auth.users.PATCH",
    });
    if (!parsed.ok) {
      return parsed.response;
    }

    const { name, email, emailVerified } = parsed.data;
    if (name === undefined && email === undefined && emailVerified === undefined) {
      return NextResponse.json(
        { error: "No updates provided." },
        { status: 400 }
      );
    }

    const { id: userId } = params;
    const provider = "mongodb" as const;

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

    const payload: AuthUserSummary = {
      id: updated._id.toString(),
      email: updated.email ?? null,
      name: updated.name ?? null,
      image: updated.image ?? null,
      emailVerified: updated.emailVerified
        ? updated.emailVerified.toISOString()
        : null,
      provider,
    };
    return NextResponse.json(payload);
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "auth.users.[id].PATCH",
      fallbackMessage: "Failed to update user",
    });
  }
}

export const PATCH = apiHandlerWithParams<{ id: string }>(PATCH_handler, { source: "auth.users.[id].PATCH" });
