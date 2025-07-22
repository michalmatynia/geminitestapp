import { NextResponse } from "next/server";
import { unlinkImageFromProduct } from "@/lib/services/productService";

export async function DELETE(
  req: Request,
  { params }: { params: { id: string; imageFileId: string } }
) {
  try {
    await unlinkImageFromProduct(params.id, params.imageFileId);
    return new Response(null, { status: 204 });
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to disconnect image" },
      { status: 500 }
    );
  }
}
