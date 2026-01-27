import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getMongoDb } from "@/shared/lib/db/mongo-client";
import { normalizeAuthEmail } from "@/features/auth/services/auth-user-repository";
import { auth } from "@/features/auth/auth";
import {
  checkLoginAllowed,
  extractClientIp,
  recordLoginFailure,
  recordLoginSuccess,
} from "@/features/auth/services/auth-security";
import { getAuthSecurityProfile } from "@/features/auth/services/auth-security-profile";
import { getAuthUserPageSettings } from "@/features/auth/services/auth-settings";
import { parseJsonBody } from "@/features/products/api/parse-json";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { internalError } from "@/shared/errors/app-error";
import { apiHandler } from "@/shared/lib/api/api-handler";

export const runtime = "nodejs";

const payloadSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

type MongoUserDoc = {
  email?: string | null;
  passwordHash?: string | null;
  emailVerified?: Date | null;
};

async function POST_handler(req: Request) {
  try {
    const session = await auth();
    const hasAccess =
      session?.user?.isElevated ||
      session?.user?.permissions?.includes("auth.users.write");
    if (!hasAccess) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized." },
        { status: 401 }
      );
    }
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
    const ip = extractClientIp(req);
    const allowed = await checkLoginAllowed({ email, ip });
    if (!allowed.allowed) {
      return NextResponse.json(
        {
          ok: false,
          message: "Too many attempts. Please try again later.",
        },
        { status: 429 }
      );
    }
    const db = await getMongoDb();
    const user = await db
      .collection<MongoUserDoc>("users")
      .findOne({ email }, { projection: { passwordHash: 1, emailVerified: 1 } });

    if (!user?.passwordHash) {
      await recordLoginFailure({ email, ip, request: req });
      return NextResponse.json({
        ok: false,
        message: "User not found or password is not set.",
      });
    }

    const security = await getAuthSecurityProfile(user._id.toString());
    const settings = await getAuthUserPageSettings();

    if (security.bannedAt) {
      await recordLoginFailure({ email, ip, request: req });
      return NextResponse.json({ ok: false, message: "Account is banned." });
    }
    if (security.disabledAt) {
      await recordLoginFailure({ email, ip, request: req });
      return NextResponse.json({ ok: false, message: "Account is disabled." });
    }
    if (settings.requireEmailVerification) {
      if (!user.emailVerified) {
        await recordLoginFailure({ email, ip, request: req });
        return NextResponse.json({ ok: false, message: "Email verification required." });
      }
    }
    if (security.allowedIps.length > 0 && ip) {
      const allowedSet = new Set(security.allowedIps);
      if (!allowedSet.has(ip)) {
        await recordLoginFailure({ email, ip, request: req });
        return NextResponse.json({ ok: false, message: "IP not allowed." });
      }
    }
    if (security.mfaEnabled) {
      return NextResponse.json({ ok: false, message: "MFA is enabled. Use MFA login." });
    }

    const isValid = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!isValid) {
      await recordLoginFailure({ email, ip, request: req });
    } else {
      await recordLoginSuccess({ email, ip, request: req });
    }
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

export const POST = apiHandler(POST_handler, { source: "auth.mock-signin.POST" });
