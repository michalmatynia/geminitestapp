import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const logs = await prisma.connectionLog.findMany({
    orderBy: {
      connectedAt: "desc",
    },
    take: 20, // Limit to the last 20 connections for performance
  });
  return NextResponse.json(logs);
}
