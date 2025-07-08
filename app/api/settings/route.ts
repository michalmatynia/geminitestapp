import { PrismaClient, Setting } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET() {
  console.log("Received GET request to /api/settings");
  try {
    const settings = await prisma.setting.findMany();
    console.log("Settings fetched successfully:", settings);
    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  console.log("Received POST request to /api/settings");
  try {
    const { key, value } = (await req.json()) as Setting;
    console.log("Upserting setting:", { key, value });
    const setting = await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
    console.log("Setting saved successfully:", setting);
    return NextResponse.json(setting);
  } catch (error) {
    console.error("Error saving setting:", error);
    return NextResponse.json(
      { error: "Failed to save setting" },
      { status: 500 }
    );
  }
}
