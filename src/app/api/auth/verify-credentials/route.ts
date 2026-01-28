import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { parseJsonBody } from "@/features/products/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { findAuthUserByEmail } from "@/features/auth/server";
import { getAuthSecurityProfile } from "@/features/auth/server";
import {
  checkLoginAllowed,
  extractClientIp,
  recordLoginFailure,
} from "@/features/auth/server";
import { getAuthUserPageSettings } from "@/features/auth/server";
import { createLoginChallenge } from "@/features/auth/server";
import { apiHandler } from "@/shared/lib/api/api-handler";

export const runtime = "nodejs";

const payloadSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

async function POST_handler(req: Request) {
  try {
    const parsed = await parseJsonBody(req, payloadSchema, {
      logPrefix: "auth.verify.POST",
    });
    if (!parsed.ok) return parsed.response;

    const email = parsed.data.email;
    const password = parsed.data.password;
    const ip = extractClientIp(req);

    const allowed = await checkLoginAllowed({ email, ip });
    if (!allowed.allowed) {
      return NextResponse.json(
        {
          ok: false,
          code: allowed.reason,
          message: "Too many attempts. Please try again later.",
          lockedUntil: allowed.lockedUntil?.toISOString() ?? null,
        },
        { status: 429 }
      );
    }

    const user = await findAuthUserByEmail(email);
    if (!user || !user.passwordHash) {
      await recordLoginFailure({ email, ip, request: req });
      return NextResponse.json({
        ok: false,
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password.",
      });
    }

    const security = await getAuthSecurityProfile(user.id);
    const settings = await getAuthUserPageSettings();

    if (security.bannedAt) {
      await recordLoginFailure({ email, ip, request: req });
      return NextResponse.json({
        ok: false,
        code: "ACCOUNT_BANNED",
        message: "This account is banned.",
      });
    }
    if (security.disabledAt) {
      await recordLoginFailure({ email, ip, request: req });
      return NextResponse.json({
        ok: false,
        code: "ACCOUNT_DISABLED",
        message: "This account is disabled.",
      });
    }
    if (settings.requireEmailVerification && !user.emailVerified) {
      await recordLoginFailure({ email, ip, request: req });
      return NextResponse.json({
        ok: false,
        code: "EMAIL_UNVERIFIED",
        message: "Email verification is required.",
      });
    }
    if (security.allowedIps.length > 0 && ip) {
      const allowedSet = new Set(security.allowedIps);
      if (!allowedSet.has(ip)) {
        await recordLoginFailure({ email, ip, request: req });
        return NextResponse.json({
          ok: false,
          code: "IP_NOT_ALLOWED",
          message: "This IP is not allowed for the account.",
        });
      }
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      await recordLoginFailure({ email, ip, request: req });
      return NextResponse.json({
        ok: false,
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password.",
      });
    }

    const challenge = await createLoginChallenge({
      userId: user.id,
      email: user.email,
      ip,
      mfaRequired: Boolean(security.mfaEnabled),
    });

    return NextResponse.json({
      ok: true,
      mfaRequired: Boolean(security.mfaEnabled),
      challengeId: challenge.id,
      expiresAt: challenge.expiresAt.toISOString(),
    });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "auth.verify-credentials.POST",
      fallbackMessage: "Failed to verify credentials",
    });
  }
}

export const POST = apiHandler(POST_handler, { source: "auth.verify-credentials.POST" });
