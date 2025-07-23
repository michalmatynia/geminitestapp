import { NextResponse } from "next/server";
import { productService } from "@/lib/services/productService";

/**
 * GET /api/products/[id]
 * Fetches a single product by its ID.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await productService.getProductById(id);
    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(product);
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/products/[id]
 * Updates an existing product.
 */
export async function PUT(
  req: Request,
  { params }: any
) {
  try {
    const formData = await req.formData();
    const product = await productService.updateProduct(params.id, formData);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    return NextResponse.json(product);
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "An unknown error occurred" }, { status: 400 });
  }
}

/**
 * DELETE /api/products/[id]
 * Deletes a product.
 */
export async function DELETE(
  req: Request,
  { params }: any
) {
  try {
    const product = await productService.deleteProduct(params.id);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    return new Response(null, { status: 204 });
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}

