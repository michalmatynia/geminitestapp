import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";

const DEBUG_CHATBOT = process.env.DEBUG_CHATBOT === "true";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    if (!("chatbotJob" in prisma)) {
      return NextResponse.json(
        { error: "Chatbot jobs not initialized. Run prisma generate/db push." },
        { status: 500 }
      );
    }
    const { jobId } = await params;
    const job = await prisma.chatbotJob.findUnique({ where: { id: jobId } });
    if (!job) {
      return NextResponse.json({ error: "Job not found." }, { status: 404 });
    }
    return NextResponse.json({ job });
  } catch (error) {
    const errorId = randomUUID();
    console.error("[chatbot][jobs][GET] Failed to load job", { errorId, error });
    return NextResponse.json(
      { error: "Failed to load job.", errorId },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    if (!("chatbotJob" in prisma)) {
      return NextResponse.json(
        { error: "Chatbot jobs not initialized. Run prisma generate/db push." },
        { status: 500 }
      );
    }
    const { jobId } = await params;
    const body = (await req.json()) as { action?: string };
    if (body.action !== "cancel") {
      return NextResponse.json(
        { error: "Unsupported action." },
        { status: 400 }
      );
    }
    const job = await prisma.chatbotJob.findUnique({ where: { id: jobId } });
    if (!job) {
      return NextResponse.json({ error: "Job not found." }, { status: 404 });
    }
    if (["completed", "failed", "canceled"].includes(job.status)) {
      return NextResponse.json({ status: job.status });
    }
    const updated = await prisma.chatbotJob.update({
      where: { id: jobId },
      data: { status: "canceled", finishedAt: new Date() },
    });
    if (DEBUG_CHATBOT) {
      console.info("[chatbot][jobs][POST] Canceled", { jobId });
    }
    return NextResponse.json({ status: updated.status });
  } catch (error) {
    const errorId = randomUUID();
    console.error("[chatbot][jobs][POST] Failed to cancel job", {
      errorId,
      error,
    });
    return NextResponse.json(
      { error: "Failed to cancel job.", errorId },
      { status: 500 }
    );
  }
}
