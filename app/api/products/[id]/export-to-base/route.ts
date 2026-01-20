import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getProductRepository } from "@/lib/services/product-repository";
import { getIntegrationRepository } from "@/lib/services/integration-repository";
import { getProductListingRepository } from "@/lib/services/product-listing-repository";
import { listImportTemplates } from "@/lib/services/import-template-repository";
import { exportProductToBase } from "@/lib/services/exports/base-exporter";

const exportSchema = z.object({
  connectionId: z.string().min(1),
  inventoryId: z.string().min(1),
  templateId: z.string().optional(),
});

/**
 * POST /api/products/[id]/export-to-base
 * Exports a product to Base.com using optional template
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params;
    const body = await req.json();
    const data = exportSchema.parse(body);

    // Get product
    const productRepo = await getProductRepository();
    const product = await productRepo.getProductById(productId);
    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Get connection to retrieve API token
    const integrationRepo = await getIntegrationRepository();
    const connection = await integrationRepo.getConnectionById(
      data.connectionId
    );
    if (!connection) {
      return NextResponse.json(
        { error: "Connection not found" },
        { status: 404 }
      );
    }

    // Get Base.com token from connection
    const token = connection.baseApiToken;
    if (!token) {
      return NextResponse.json(
        { error: "Base.com API token not found in connection" },
        { status: 400 }
      );
    }

    // Get template mappings if templateId provided
    let mappings: { sourceKey: string; targetField: string }[] = [];
    if (data.templateId) {
      const templates = await listImportTemplates();
      const template = templates.find((t) => t.id === data.templateId);
      if (template) {
        mappings = template.mappings;
      }
    }

    // Export to Base.com
    const result = await exportProductToBase(
      token,
      data.inventoryId,
      product,
      mappings
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to export product" },
        { status: 500 }
      );
    }

    // Create listing record
    const listingRepo = await getProductListingRepository();

    // Find Base.com integration
    const integrations = await integrationRepo.listIntegrations();
    const baseIntegration = integrations.find((i) => i.slug === "base-com");

    if (baseIntegration) {
      // Check if listing already exists
      const exists = await listingRepo.listingExists(productId, data.connectionId);

      if (!exists) {
        await listingRepo.createListing({
          productId,
          integrationId: baseIntegration.id,
          connectionId: data.connectionId,
          externalListingId: result.productId || null,
        });
      } else {
        // Update existing listing with external ID
        const listings = await listingRepo.getListingsByProductId(productId);
        const existingListing = listings.find(
          (l) => l.connectionId === data.connectionId
        );
        if (existingListing && result.productId) {
          await listingRepo.updateListingExternalId(
            existingListing.id,
            result.productId
          );
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Product successfully exported to Base.com",
      externalProductId: result.productId,
    });
  } catch (error) {
    console.error("Failed to export product to Base.com:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.flatten() },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to export product to Base.com" },
      { status: 500 }
    );
  }
}
