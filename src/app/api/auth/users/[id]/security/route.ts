import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/features/products/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { updateAuthSecurityProfile, getAuthSecurityProfile } from "@/features/auth/server";
import { internalError, authError } from "@/shared/errors/app-error";
import { auth } from "@/features/auth/server";
import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";

export const runtime = "nodejs";

const updateSchema = z.object({
  disabled: z.boolean().optional(),
  banned: z.boolean().optional(),
  allowedIps: z.array(z.string().trim()).optional(),
  disableMfa: z.boolean().optional(),
});

async function GET_handler(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const hasAccess =
      session?.user?.isElevated ||
      session?.user?.permissions?.includes("auth.users.write");
    if (!hasAccess) {
      throw authError("Unauthorized.");
    }
    const { id } = await context.params;
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
  } catch (error) {
    return createErrorResponse(error, {
      source: "auth.users.[id].security.GET",
      fallbackMessage: "Failed to load security profile",
    });
  }
}

async function PATCH_handler(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const hasAccess =
      session?.user?.isElevated ||
      session?.user?.permissions?.includes("auth.users.write");
    if (!hasAccess) {
      throw authError("Unauthorized.");
    }
    const { id } = await context.params;
    if (!id) {
      throw internalError("Missing user id.");
    }
    const parsed = await parseJsonBody(req, updateSchema, {
      logPrefix: "auth.user.security.PATCH",
    });
    if (!parsed.ok) return parsed.response;

    const updates = parsed.data;
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

    return NextResponse.json({
      userId: profile.userId,
      mfaEnabled: profile.mfaEnabled,
      allowedIps: profile.allowedIps,
      disabledAt: profile.disabledAt ? profile.disabledAt.toISOString() : null,
      bannedAt: profile.bannedAt ? profile.bannedAt.toISOString() : null,
    });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "auth.users.[id].security.PATCH",
      fallbackMessage: "Failed to update security profile",
    });
  }
}

export const GET = apiHandlerWithParams<{ id: string }>(async (req, _ctx, params) => GET_handler(req, { params: Promise.resolve(params) }), { source: "auth.users.[id].security.GET" });
export const PATCH = apiHandlerWithParams<{ id: string }>(async (req, _ctx, params) => PATCH_handler(req, { params: Promise.resolve(params) }), { source: "auth.users.[id].security.PATCH" });
