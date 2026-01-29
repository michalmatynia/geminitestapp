import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/features/auth/server";
import { parseJsonBody } from "@/features/products/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { authError, validationError } from "@/shared/errors/app-error";
import { getAuthSecurityProfile, updateAuthSecurityProfile } from "@/features/auth/server";
import { decryptAuthSecret } from "@/features/auth/server";
import { hashRecoveryCode, verifyTotpToken } from "@/features/auth/server";
import { apiHandler } from "@/shared/lib/api/api-handler";

export const runtime = "nodejs";

const payloadSchema = z.object({
  token: z.string().trim().optional(),
  recoveryCode: z.string().trim().optional(),
});

async function POST_handler(req: Request): Promise<Response> {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      throw authError("Unauthorized.");
    }

    const parsed = await parseJsonBody(req, payloadSchema, {
      logPrefix: "auth.mfa.disable.POST",
    });
    if (!parsed.ok) return parsed.response;

    const profile = await getAuthSecurityProfile(userId);
    if (!profile.mfaEnabled) {
      return NextResponse.json({ ok: true, message: "MFA already disabled." });
    }

    const token = parsed.data.token?.trim() ?? "";
    const recovery = parsed.data.recoveryCode?.trim() ?? "";
    if (!token && !recovery) {
      throw validationError("Provide a token or recovery code.");
    }

    let valid = false;
    if (recovery) {
      const hashed = hashRecoveryCode(recovery);
      valid = profile.recoveryCodes.includes(hashed);
    }
    if (!valid && token && profile.mfaSecret) {
      const secret = decryptAuthSecret(profile.mfaSecret);
      valid = verifyTotpToken(secret, token);
    }

    if (!valid) {
      throw validationError("Invalid token or recovery code.");
    }

    await updateAuthSecurityProfile(userId, {
      mfaEnabled: false,
      mfaSecret: null,
      recoveryCodes: [],
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "auth.mfa.disable.POST",
      fallbackMessage: "Failed to disable MFA",
    });
  }
}

export const POST = apiHandler(POST_handler, { source: "auth.mfa.disable.POST" });
