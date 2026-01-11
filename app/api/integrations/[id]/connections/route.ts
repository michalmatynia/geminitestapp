import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { encryptSecret } from "@/lib/utils/encryption";

const connectionSchema = z.object({
  name: z.string().trim().min(1),
  username: z.string().trim().min(1),
  password: z.string().trim().min(1),
});

/**
 * GET /api/integrations/[id]/connections
 * Fetches connections for an integration.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const connections = await prisma.integrationConnection.findMany({
      where: { integrationId: id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(
      connections.map((connection) => ({
        id: connection.id,
        integrationId: connection.integrationId,
        name: connection.name,
        username: connection.username,
        createdAt: connection.createdAt,
        updatedAt: connection.updatedAt,
      }))
    );
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to fetch connections" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/integrations/[id]/connections
 * Creates a connection for an integration.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = connectionSchema.parse(body);
    const existing = await prisma.integrationConnection.findFirst({
      where: { integrationId: id },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Only one connection is allowed for this integration." },
        { status: 400 }
      );
    }
    const connection = await prisma.integrationConnection.create({
      data: {
        integrationId: id,
        name: data.name,
        username: data.username,
        password: encryptSecret(data.password),
      },
    });
    return NextResponse.json(connection);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid payload", details: error.flatten() },
        { status: 400 }
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "An unknown error occurred" },
      { status: 400 }
    );
  }
}
