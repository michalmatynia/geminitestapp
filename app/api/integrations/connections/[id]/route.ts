import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { encryptSecret } from "@/lib/utils/encryption";

const connectionSchema = z.object({
  name: z.string().trim().min(1),
  username: z.string().trim().min(1),
  password: z.string().trim().optional(),
});

/**
 * PUT /api/integrations/connections/[id]
 * Updates an integration connection.
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = connectionSchema.parse(body);
    const connection = await prisma.integrationConnection.update({
      where: { id },
      data: {
        name: data.name,
        username: data.username,
        ...(data.password
          ? { password: encryptSecret(data.password) }
          : {}),
      },
    });
    return NextResponse.json({
      id: connection.id,
      integrationId: connection.integrationId,
      name: connection.name,
      username: connection.username,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
    });
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

/**
 * DELETE /api/integrations/connections/[id]
 * Deletes an integration connection.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.integrationConnection.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to delete connection" },
      { status: 500 }
    );
  }
}
