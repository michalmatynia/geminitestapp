import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/features/auth/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { authError, badRequestError, validationError } from "@/shared/errors/app-error";
import { getAuthSecurityProfile, updateAuthSecurityProfile } from "@/features/auth/server";
import { decryptAuthSecret } from "@/features/auth/server";
import { hashRecoveryCode, verifyTotpToken } from "@/features/auth/server";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { logAuthEvent } from "@/features/auth/utils/auth-request-logger";

export const runtime = "nodejs";

const payloadSchema = z.object({
  token: z.string().trim().optional(),
  recoveryCode: z.string().trim().optional(),
});

async function POST_handler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      throw authError("Unauthorized.");
    }

    const data = ctx.body as z.infer<typeof payloadSchema> | undefined;
    if (!data) {
      throw badRequestError("Invalid payload");
    }
    await logAuthEvent({
      req,
      action: "auth.mfa.disable",
      stage: "start",
      userId,
      body: {
        hasToken: Boolean(data?.token?.trim()),
        hasRecoveryCode: Boolean(data?.recoveryCode?.trim()),
      },
    });

    const profile = await getAuthSecurityProfile(userId);
    if (!profile.mfaEnabled) {
      return NextResponse.json({ ok: true, message: "MFA already disabled." });
    }

    const token = data?.token?.trim() ?? "";
    const recovery = data?.recoveryCode?.trim() ?? "";
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

    await logAuthEvent({
      req,
      action: "auth.mfa.disable",
      stage: "success",
      userId,
      status: 200,
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

export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
 {
   source: "auth.mfa.disable.POST",
   parseJsonBody: true,
   bodySchema: payloadSchema,
   rateLimitKey: "auth",
   maxBodyBytes: 10_000,
   allowedMethods: ["POST"],
   requireCsrf: false,
 });
