export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/shared/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { parseJsonBody } from "@/features/products/server";
import { badRequestError, internalError } from "@/shared/errors/app-error";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import type { ChatbotSettingsRecord } from "@/shared/types/settings";

const DEBUG_CHATBOT = process.env.DEBUG_CHATBOT === "true";
const DEFAULT_SETTINGS_KEY = "default";

const settingsSchema = z.object({
  key: z.string().trim().optional(),
  settings: z.record(z.string(), z.any()).optional(),
});

async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const requestStart = Date.now();
  if (!("chatbotSettings" in prisma)) {
    throw internalError(
      "Chatbot settings not initialized. Run prisma generate/db push."
    );
  }
  const url = new URL(req.url);
  const key = url.searchParams.get("key")?.trim() || DEFAULT_SETTINGS_KEY;
  const settings = await prisma.chatbotSettings.findUnique({
    where: { key },
  });
  if (DEBUG_CHATBOT) {
    console.info("[chatbot][settings][GET] Loaded", {
      key,
      found: Boolean(settings),
      durationMs: Date.now() - requestStart,
    });
  }
  return NextResponse.json({ settings: settings as ChatbotSettingsRecord | null });
}

async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const requestStart = Date.now();
  if (!("chatbotSettings" in prisma)) {
    throw internalError(
      "Chatbot settings not initialized. Run prisma generate/db push."
    );
  }
  const parsed = await parseJsonBody(req, settingsSchema, {
    logPrefix: "chatbot.settings.POST",
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const key = parsed.data.key?.trim() || DEFAULT_SETTINGS_KEY;
  if (!parsed.data.settings || typeof parsed.data.settings !== "object") {
    throw badRequestError("Settings payload is required.");
  }
  const saved = await prisma.chatbotSettings.upsert({
    where: { key },
    update: { settings: parsed.data.settings as Prisma.InputJsonValue },
    create: { key, settings: parsed.data.settings as Prisma.InputJsonValue },
  });
  if (DEBUG_CHATBOT) {
    console.info("[chatbot][settings][POST] Saved", {
      key,
      durationMs: Date.now() - requestStart,
    });
  }
  return NextResponse.json({ settings: saved as unknown as ChatbotSettingsRecord });
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
 { source: "chatbot.settings.GET" });
export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
 { source: "chatbot.settings.POST" });
