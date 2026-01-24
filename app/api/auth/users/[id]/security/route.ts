import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/lib/api/parse-json";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { updateAuthSecurityProfile, getAuthSecurityProfile } from "@/lib/services/auth-security-profile";
import { internalError, authError } from "@/lib/errors/app-error";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";

const updateSchema = z.object({
  disabled: z.boolean().optional(),
  banned: z.boolean().optional(),
  allowedIps: z.array(z.string().trim()).optional(),
  disableMfa: z.boolean().optional(),
});

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
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
      source: "auth.user.security.GET",
      fallbackMessage: "Failed to load security profile",
    });
  }
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
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
      ? updates.allowedIps.map((ip) => ip.trim()).filter(Boolean)
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
      source: "auth.user.security.PATCH",
      fallbackMessage: "Failed to update security profile",
    });
  }
}
