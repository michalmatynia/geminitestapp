import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { parseJsonBody } from "@/features/products/api/parse-json";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { conflictError, authError, validationError } from "@/lib/errors/app-error";
import { getAuthSecurityProfile, updateAuthSecurityProfile } from "@/lib/services/auth-security-profile";
import { decryptAuthSecret } from "@/shared/lib/utils/auth-encryption";
import { generateRecoveryCodes, hashRecoveryCode, verifyTotpToken } from "@/lib/services/totp";
import { apiHandler } from "@/lib/api/api-handler";

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
