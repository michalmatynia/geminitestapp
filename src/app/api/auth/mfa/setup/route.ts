import { NextResponse } from "next/server";
import { auth } from "@/features/auth/server";
import { getAuthSecurityProfile, updateAuthSecurityProfile } from "@/features/auth/server";
import { buildOtpAuthUrl, generateTotpSecret } from "@/features/auth/server";
import { encryptAuthSecret } from "@/features/auth/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { conflictError, authError } from "@/shared/errors/app-error";
import { apiHandler } from "@/shared/lib/api/api-handler";

export const runtime = "nodejs";

async function POST_handler(req: Request) {
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

export const POST = apiHandler(POST_handler, { source: "auth.mfa.setup.POST" });
