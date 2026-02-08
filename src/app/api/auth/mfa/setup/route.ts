import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/features/auth/server";
import { getAuthSecurityProfile, updateAuthSecurityProfile } from "@/features/auth/server";
import { buildOtpAuthUrl, generateTotpSecret } from "@/features/auth/server";
import { encryptAuthSecret } from "@/features/auth/server";
import { conflictError, authError } from "@/shared/errors/app-error";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { logAuthEvent } from "@/features/auth/utils/auth-request-logger";

export const runtime = "nodejs";

async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const session = await auth();
  const userId = session?.user?.id;
  const email = session?.user?.email ?? "user";
  if (!userId) {
    throw authError("Unauthorized.");
  }
  await logAuthEvent({
    req,
    action: "auth.mfa.setup",
    stage: "start",
    userId,
  });

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
  if (process.env["NEXT_PUBLIC_APP_URL"]) {
    try {
      issuer = new URL(process.env["NEXT_PUBLIC_APP_URL"]).hostname || issuer;
    } catch {
      issuer = "App";
    }
  }
  const label = `${issuer}:${email}`;
  const otpauthUrl = buildOtpAuthUrl({ secret, issuer, label });

  await logAuthEvent({
    req,
    action: "auth.mfa.setup",
    stage: "success",
    userId,
    status: 200,
  });
  return NextResponse.json({
    ok: true,
    secret,
    otpauthUrl,
  });
}

export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
 { source: "auth.mfa.setup.POST", requireCsrf: false });
