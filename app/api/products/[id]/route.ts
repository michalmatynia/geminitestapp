import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { productService } from "@/lib/services/productService";
import { z } from "zod";

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
    if (!id) {
      const errorId = randomUUID();
      console.error("[products][GET] Missing product id", { errorId });
      return NextResponse.json(
        { error: "Product id is required", errorId },
        { status: 400 }
      );
    }

    const product = await productService.getProductById(id);
    if (!product) {
      const errorId = randomUUID();
      console.warn("[products][GET] Product not found", { errorId, productId: id });
      return NextResponse.json(
        { error: "Product not found", errorId },
        { status: 404 }
      );
    }

    return NextResponse.json(product);
  } catch (error) {
    const errorId = randomUUID();
    console.error("[products][GET] Failed to fetch product", {
      errorId,
      error,
    });
    return NextResponse.json(
      { error: "Failed to fetch product", errorId },
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
  { params }: { params: Promise<{ id: string }> }
) {
  let productId = "";
  try {
    const { id } = await params;
    productId = id;
    if (!id) {
      const errorId = randomUUID();
      console.error("[products][PUT] Missing product id", { errorId });
      return NextResponse.json(
        { error: "Product id is required", errorId },
        { status: 400 }
      );
    }
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch (error) {
      const errorId = randomUUID();
      console.error("[products][PUT] Failed to parse form data", {
        errorId,
        error,
        productId: id,
      });
      return NextResponse.json(
        { error: "Invalid form data payload", errorId },
        { status: 400 }
      );
    }
    const product = await productService.updateProduct(id, formData);
    if (!product) {
      const errorId = randomUUID();
      console.warn("[products][PUT] Product not found", { errorId, productId: id });
      return NextResponse.json(
        { error: "Product not found", errorId },
        { status: 404 }
      );
    }
    return NextResponse.json(product);
  } catch (error: unknown) {
    const errorId = randomUUID();
    if (error instanceof Error) {
      console.error("[products][PUT] Failed to update product", {
        errorId,
        productId,
        message: error.message,
      });
      return NextResponse.json(
        { error: error.message, errorId },
        { status: 400 }
      );
    }
    console.error("[products][PUT] Unknown error", { errorId, error });
    return NextResponse.json(
      { error: "An unknown error occurred", errorId },
      { status: 400 }
    );
  }
}

const patchProductSchema = z.object({
  price: z.number().min(0).optional(),
  stock: z.number().int().min(0).optional(),
});

/**
 * PATCH /api/products/[id]
 * Partially updates a product (for quick field edits like price/stock).
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let productId = "";
  try {
    const { id } = await params;
    productId = id;
    if (!id) {
      const errorId = randomUUID();
      console.error("[products][PATCH] Missing product id", { errorId });
      return NextResponse.json(
        { error: "Product id is required", errorId },
        { status: 400 }
      );
    }

    const body = await req.json();
    const data = patchProductSchema.parse(body);

    // Use productService to update specific fields
    const updateData = new FormData();
    if (data.price !== undefined) {
      updateData.append("price", String(data.price));
    }
    if (data.stock !== undefined) {
      updateData.append("stock", String(data.stock));
    }

    const product = await productService.updateProduct(id, updateData);
    if (!product) {
      const errorId = randomUUID();
      console.warn("[products][PATCH] Product not found", { errorId, productId: id });
      return NextResponse.json(
        { error: "Product not found", errorId },
        { status: 404 }
      );
    }

    return NextResponse.json(product);
  } catch (error: unknown) {
    const errorId = randomUUID();
    if (error instanceof z.ZodError) {
      console.error("[products][PATCH] Validation error", {
        errorId,
        productId,
        errors: error.issues,
      });
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues, errorId },
        { status: 400 }
      );
    }
    if (error instanceof Error) {
      console.error("[products][PATCH] Failed to update product", {
        errorId,
        productId,
        message: error.message,
      });
      return NextResponse.json(
        { error: error.message, errorId },
        { status: 400 }
      );
    }
    console.error("[products][PATCH] Unknown error", { errorId, error });
    return NextResponse.json(
      { error: "An unknown error occurred", errorId },
      { status: 400 }
    );
  }
}

/**
 * DELETE /api/products/[id]
 * Deletes a product.
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let productId = "";
  try {
    const { id } = await params;
    productId = id;
    if (!id) {
      const errorId = randomUUID();
      console.error("[products][DELETE] Missing product id", { errorId });
      return NextResponse.json(
        { error: "Product id is required", errorId },
        { status: 400 }
      );
    }
    const product = await productService.deleteProduct(id);
    if (!product) {
      const errorId = randomUUID();
      console.warn("[products][DELETE] Product not found", { errorId, productId: id });
      return NextResponse.json(
        { error: "Product not found", errorId },
        { status: 404 }
      );
    }
    return new Response(null, { status: 204 });
  } catch (error) {
    const errorId = randomUUID();
    console.error("[products][DELETE] Failed to delete product", {
      errorId,
      error,
      productId,
    });
    return NextResponse.json(
      { error: "Failed to delete product", errorId },
      { status: 500 }
    );
  }
}
