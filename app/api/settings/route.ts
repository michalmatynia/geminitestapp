import { Setting } from "@prisma/client";
import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";

const shouldLog = () => process.env.DEBUG_SETTINGS === "true";

export async function GET() {
  if (shouldLog()) {
    console.log("[settings] GET /api/settings");
  }
  try {
    const settings = await prisma.setting.findMany();
    if (shouldLog()) {
      console.log("[settings] fetched", {
        count: settings.length,
        keys: settings.map((setting) => setting.key),
      });
    }
    return NextResponse.json(settings);
  } catch (error) {
    console.error("[settings] failed to fetch", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  if (shouldLog()) {
    console.log("[settings] POST /api/settings");
  }
  try {
    const { key, value } = (await req.json()) as Setting;
    if (shouldLog()) {
      console.log("[settings] upserting", { key, valuePreview: value?.slice?.(0, 40) });
    }
    const setting = await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
    if (shouldLog()) {
      console.log("[settings] saved", { key: setting.key });
    }
    return NextResponse.json(setting);
  } catch (error) {
    console.error("[settings] failed to save", error);
    return NextResponse.json(
      { error: "Failed to save setting" },
      { status: 500 }
    );
  }
}
