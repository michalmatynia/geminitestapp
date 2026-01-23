import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getMongoDb } from "@/lib/db/mongo-client";
import { normalizeAuthEmail } from "@/lib/services/auth-user-repository";
import { parseJsonBody } from "@/lib/api/parse-json";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { internalError } from "@/lib/errors/app-error";

export const runtime = "nodejs";

const payloadSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

type MongoUserDoc = {
  _id: unknown;
  email?: string | null;
  passwordHash?: string | null;
};

export async function POST(req: Request) {
  try {
    const parsed = await parseJsonBody(req, payloadSchema, {
      logPrefix: "auth.mock-signin.POST",
    });
    if (!parsed.ok) {
      return parsed.response;
    }

    if (!process.env.MONGODB_URI) {
      throw internalError("MongoDB is not configured.");
    }

    const email = normalizeAuthEmail(parsed.data.email);
    const db = await getMongoDb();
    const user = await db
      .collection<MongoUserDoc>("users")
      .findOne({ email }, { projection: { passwordHash: 1 } });

    if (!user?.passwordHash) {
      return NextResponse.json({
        ok: false,
        message: "User not found or password is not set.",
      });
    }

    const isValid = await bcrypt.compare(parsed.data.password, user.passwordHash);
    return NextResponse.json({
      ok: isValid,
      message: isValid ? "Credentials are valid." : "Invalid credentials.",
    });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "auth.mock-signin.POST",
      fallbackMessage: "Failed to verify credentials",
    });
  }
}
