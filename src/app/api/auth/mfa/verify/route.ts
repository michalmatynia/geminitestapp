import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/features/auth/auth";
import { parseJsonBody } from "@/features/products/api/parse-json";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { conflictError, authError, validationError } from "@/shared/errors/app-error";
import { getAuthSecurityProfile, updateAuthSecurityProfile } from "@/features/auth/services/auth-security-profile";
import { decryptAuthSecret } from "@/features/auth/utils/auth-encryption";
import { generateRecoveryCodes, hashRecoveryCode, verifyTotpToken } from "@/features/auth/services/totp";
import { apiHandler } from "@/shared/lib/api/api-handler";

export const runtime = "nodejs";

const payloadSchema = z.object({
  token: z.string().trim().min(4),
});

async function POST_handler(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      throw authError("Unauthorized.");
    }

    const parsed = await parseJsonBody(req, payloadSchema, {
      logPrefix: "auth.mfa.verify.POST",
    });
    if (!parsed.ok) return parsed.response;

    const profile = await getAuthSecurityProfile(userId);
    if (!profile.mfaSecret) {
      throw conflictError("MFA setup has not been started.");
    }
    if (profile.mfaEnabled) {
      throw conflictError("MFA is already enabled.");
    }

    const secret = decryptAuthSecret(profile.mfaSecret);
    const ok = verifyTotpToken(secret, parsed.data.token);
    if (!ok) {
      throw validationError("Invalid MFA token.");
    }

    const recoveryCodes = generateRecoveryCodes(8);
    const hashedCodes = recoveryCodes.map(hashRecoveryCode);
    await updateAuthSecurityProfile(userId, {
      mfaEnabled: true,
      recoveryCodes: hashedCodes,
    });

    return NextResponse.json({
      ok: true,
      recoveryCodes,
    });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "auth.mfa.verify.POST",
      fallbackMessage: "Failed to verify MFA",
    });
  }
}

export const POST = apiHandler(POST_handler, { source: "auth.mfa.verify.POST" });
