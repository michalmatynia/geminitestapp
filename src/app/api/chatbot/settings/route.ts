import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/shared/lib/db/prisma";
import type { Prisma } from "@prisma/client";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { parseJsonBody } from "@/features/products/server";
import { badRequestError, internalError } from "@/shared/errors/app-error";
import { apiHandler } from "@/shared/lib/api/api-handler";

const DEBUG_CHATBOT = process.env.DEBUG_CHATBOT === "true";
const DEFAULT_SETTINGS_KEY = "default";

const settingsSchema = z.object({
  key: z.string().trim().optional(),
  settings: z.record(z.string(), z["unknown"]()).optional(),
});

async function GET_handler(req: Request) {
  const requestStart = Date.now();
  try {
    if (!("chatbotSettings" in prisma)) {
      return createErrorResponse(
        internalError(
          "Chatbot settings not initialized. Run prisma generate/db push."
        ),
        { request: req, source: "chatbot.settings.GET" }
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
    return NextResponse.json({ settings });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "chatbot.settings.GET",
      fallbackMessage: "Failed to load chatbot settings.",
    });
  }
}

async function POST_handler(req: Request) {
  const requestStart = Date.now();
  try {
    if (!("chatbotSettings" in prisma)) {
      return createErrorResponse(
        internalError(
          "Chatbot settings not initialized. Run prisma generate/db push."
        ),
        { request: req, source: "chatbot.settings.POST" }
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
      return createErrorResponse(
        badRequestError("Settings payload is required."),
        { request: req, source: "chatbot.settings.POST" }
      );
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
    return NextResponse.json({ settings: saved });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "chatbot.settings.POST",
      fallbackMessage: "Failed to save chatbot settings.",
    });
  }
}

export const GET = apiHandler(GET_handler, { source: "chatbot.settings.GET" });
export const POST = apiHandler(POST_handler, { source: "chatbot.settings.POST" });
