import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { parseJsonBody } from "@/lib/api/parse-json";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { authError, validationError } from "@/lib/errors/app-error";
import { getAuthSecurityProfile, updateAuthSecurityProfile } from "@/lib/services/auth-security-profile";
import { decryptAuthSecret } from "@/lib/utils/auth-encryption";
import { hashRecoveryCode, verifyTotpToken } from "@/lib/services/totp";

export const runtime = "nodejs";

const payloadSchema = z.object({
  token: z.string().trim().optional(),
  recoveryCode: z.string().trim().optional(),
});

export async function POST(req: Request) {
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
