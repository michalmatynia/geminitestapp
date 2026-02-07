import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { updateAuthSecurityProfile, getAuthSecurityProfile } from "@/features/auth/server";
import { internalError, authError, badRequestError } from "@/shared/errors/app-error";
import { auth } from "@/features/auth/server";
import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { logAuthEvent } from "@/features/auth/utils/auth-request-logger";

export const runtime = "nodejs";

const updateSchema = z.object({
  disabled: z.boolean().optional(),
  banned: z.boolean().optional(),
  allowedIps: z.array(z.string().trim()).optional(),
  disableMfa: z.boolean().optional(),
});

async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext, params: { id: string }): Promise<Response> {
  const session = await auth();
  const hasAccess =
    session?.user?.isElevated ||
    session?.user?.permissions?.includes("auth.users.write");
  if (!hasAccess) {
    throw authError("Unauthorized.");
  }
  const id = params.id;
  if (!id) {
    throw internalError("Missing user id.");
  }
  const profile = await getAuthSecurityProfile(id);
  return NextResponse.json({
    userId: profile.userId,
    mfaEnabled: profile.mfaEnabled,
    allowedIps: profile.allowedIps,
    disabledAt: profile.disabledAt ? profile.disabledAt.toISOString() : null,
    bannedAt: profile.bannedAt ? profile.bannedAt.toISOString() : null,
  });
}

async function PATCH_handler(req: NextRequest, ctx: ApiHandlerContext, params: { id: string }): Promise<Response> {
  const session = await auth();
  const hasAccess =
    session?.user?.isElevated ||
    session?.user?.permissions?.includes("auth.users.write");
  if (!hasAccess) {
    throw authError("Unauthorized.");
  }
  const { id } = params;
  if (!id) {
    throw internalError("Missing user id.");
  }
  const data = ctx.body as z.infer<typeof updateSchema> | undefined;
  if (!data) {
    throw badRequestError("Invalid payload");
  }
  await logAuthEvent({
    req,
    action: "auth.users.security.update",
    stage: "start",
    userId: session?.user?.id ?? null,
    body: { targetUserId: id },
  });

  const updates = data;
  const now = new Date();
  const allowedIps = updates.allowedIps
    ? updates.allowedIps.map((ip: string) => ip.trim()).filter(Boolean)
    : undefined;

  const profile = await updateAuthSecurityProfile(id, {
    ...(typeof updates.disabled === "boolean"
      ? { disabledAt: updates.disabled ? now : null }
      : {}),
    ...(typeof updates.banned === "boolean"
      ? { bannedAt: updates.banned ? now : null }
      : {}),
    ...(allowedIps ? { allowedIps } : {}),
    ...(updates.disableMfa
      ? { mfaEnabled: false, mfaSecret: null, recoveryCodes: [] }
      : {}),
  });

  await logAuthEvent({
    req,
    action: "auth.users.security.update",
    stage: "success",
    userId: session?.user?.id ?? null,
    body: { targetUserId: id },
    status: 200,
  });
  return NextResponse.json({
    userId: profile.userId,
    mfaEnabled: profile.mfaEnabled,
    allowedIps: profile.allowedIps,
    disabledAt: profile.disabledAt ? profile.disabledAt.toISOString() : null,
    bannedAt: profile.bannedAt ? profile.bannedAt.toISOString() : null,
  });
}

export const GET = apiHandlerWithParams<{ id: string }>(GET_handler, {
  source: "auth.users.[id].security.GET",
  requireCsrf: false,
});
export const PATCH = apiHandlerWithParams<{ id: string }>(PATCH_handler, {
  source: "auth.users.[id].security.PATCH",
  parseJsonBody: true,
  bodySchema: updateSchema,
  rateLimitKey: "write",
  maxBodyBytes: 20_000,
  allowedMethods: ["PATCH"],
  requireCsrf: false,
});
