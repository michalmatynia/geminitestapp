import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";

const DEBUG_CHATBOT = process.env.DEBUG_CHATBOT === "true";
const DEFAULT_SETTINGS_KEY = "default";

export async function GET(req: Request) {
  const requestStart = Date.now();
  try {
    if (!("chatbotSettings" in prisma)) {
      return NextResponse.json(
        { error: "Chatbot settings not initialized. Run prisma generate/db push." },
        { status: 500 }
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
    const errorId = randomUUID();
    console.error("[chatbot][settings][GET] Failed to load settings", {
      errorId,
      error,
    });
    return NextResponse.json(
      { error: "Failed to load chatbot settings.", errorId },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const requestStart = Date.now();
  try {
    if (!("chatbotSettings" in prisma)) {
      return NextResponse.json(
        { error: "Chatbot settings not initialized. Run prisma generate/db push." },
        { status: 500 }
      );
    }
    const body = (await req.json()) as { key?: string; settings?: unknown };
    const key = body.key?.trim() || DEFAULT_SETTINGS_KEY;
    if (!body.settings || typeof body.settings !== "object") {
      return NextResponse.json(
        { error: "Settings payload is required." },
        { status: 400 }
      );
    }
    const saved = await prisma.chatbotSettings.upsert({
      where: { key },
      update: { settings: body.settings },
      create: { key, settings: body.settings },
    });
    if (DEBUG_CHATBOT) {
      console.info("[chatbot][settings][POST] Saved", {
        key,
        durationMs: Date.now() - requestStart,
      });
    }
    return NextResponse.json({ settings: saved });
  } catch (error) {
    const errorId = randomUUID();
    console.error("[chatbot][settings][POST] Failed to save settings", {
      errorId,
      error,
    });
    return NextResponse.json(
      { error: "Failed to save chatbot settings.", errorId },
      { status: 500 }
    );
  }
}
