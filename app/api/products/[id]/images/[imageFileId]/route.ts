import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function DELETE(
  req: Request,
  { params }: { params: { id: string; imageFileId: string } }
) {
  const { id: productId, imageFileId } = params;

  try {
    await prisma.productImage.delete({
      where: {
        productId_imageFileId: {
          productId: productId,
          imageFileId: imageFileId,
        },
      },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    console.error("Error disconnecting image from product:", error);
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code: string }).code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Product-image link not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Failed to disconnect image" },
      { status: 500 }
    );
  }
}
