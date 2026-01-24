import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAuthSecurityProfile, updateAuthSecurityProfile } from "@/lib/services/auth-security-profile";
import { buildOtpAuthUrl, generateTotpSecret } from "@/lib/services/totp";
import { encryptAuthSecret } from "@/lib/utils/auth-encryption";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { conflictError, authError } from "@/lib/errors/app-error";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    const email = session?.user?.email ?? "user";
    if (!userId) {
      throw authError("Unauthorized.");
    }

    const profile = await getAuthSecurityProfile(userId);
    if (profile.mfaEnabled) {
      throw conflictError("MFA is already enabled.");
    }

    const secret = generateTotpSecret();
    const encrypted = encryptAuthSecret(secret);
    await updateAuthSecurityProfile(userId, {
      mfaSecret: encrypted,
      mfaEnabled: false,
      recoveryCodes: [],
    });

    let issuer = "App";
    if (process.env.NEXT_PUBLIC_APP_URL) {
      try {
        issuer = new URL(process.env.NEXT_PUBLIC_APP_URL).hostname || issuer;
      } catch {
        issuer = "App";
      }
    }
    const label = `${issuer}:${email}`;
    const otpauthUrl = buildOtpAuthUrl({ secret, issuer, label });

    return NextResponse.json({
      ok: true,
      secret,
      otpauthUrl,
    });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "auth.mfa.setup.POST",
      fallbackMessage: "Failed to start MFA setup",
    });
  }
}
