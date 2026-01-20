import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getProductRepository } from "@/lib/services/product-repository";
import { getIntegrationRepository } from "@/lib/services/integration-repository";
import { getProductListingRepository } from "@/lib/services/product-listing-repository";
import { listImportTemplates } from "@/lib/services/import-template-repository";
import { exportProductToBase } from "@/lib/services/exports/base-exporter";
import { checkBaseSkuExists } from "@/lib/services/imports/base-client";

const exportSchema = z.object({
  connectionId: z.string().min(1),
  inventoryId: z.string().min(1),
  templateId: z.string().optional(),
  allowDuplicateSku: z.boolean().optional(), // Allow exporting even if SKU exists in Base.com
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

    console.log("[export-to-base] Starting export", {
      productId,
      connectionId: data.connectionId,
      inventoryId: data.inventoryId,
      templateId: data.templateId || "none",
    });

    // Get product
    const productRepo = await getProductRepository();
    const product = await productRepo.getProductById(productId);
    if (!product) {
      console.error("[export-to-base] Product not found", { productId });
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    console.log("[export-to-base] Product loaded", {
      productId,
      sku: product.sku,
      name: product.name_en || product.name_pl || "unnamed",
    });

    // Get connection to retrieve API token
    const integrationRepo = await getIntegrationRepository();
    const connection = await integrationRepo.getConnectionById(
      data.connectionId
    );
    if (!connection) {
      console.error("[export-to-base] Connection not found", {
        connectionId: data.connectionId,
      });
      return NextResponse.json(
        { error: "Connection not found" },
        { status: 404 }
      );
    }

    console.log("[export-to-base] Connection loaded", {
      connectionId: data.connectionId,
      connectionName: connection.name,
      hasToken: Boolean(connection.baseApiToken),
    });

    // Get Base.com token from connection
    const token = connection.baseApiToken;
    if (!token) {
      console.error("[export-to-base] No API token configured", {
        connectionId: data.connectionId,
        connectionName: connection.name,
      });
      return NextResponse.json(
        { error: "Base.com API token not found in connection. Please configure the API token in the connection settings." },
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

    // Check for duplicate SKU in Base.com if not allowed
    const allowDuplicateSku = data.allowDuplicateSku ?? false;
    if (!allowDuplicateSku && product.sku) {
      console.log("[export-to-base] Checking if SKU exists in Base.com", {
        sku: product.sku,
        inventoryId: data.inventoryId,
      });

      const skuCheck = await checkBaseSkuExists(token, data.inventoryId, product.sku);
      if (skuCheck.exists) {
        console.warn("[export-to-base] SKU already exists in Base.com", {
          sku: product.sku,
          existingProductId: skuCheck.productId,
        });
        return NextResponse.json(
          {
            error: `SKU "${product.sku}" already exists in Base.com inventory. Use "Allow duplicate SKUs" option to export anyway.`,
            skuExists: true,
            existingProductId: skuCheck.productId,
          },
          { status: 409 }
        );
      }
    }

    // Export to Base.com
    console.log("[export-to-base] Calling Base.com API", {
      productId,
      inventoryId: data.inventoryId,
      mappingsCount: mappings.length,
    });

    const result = await exportProductToBase(
      token,
      data.inventoryId,
      product,
      mappings
    );

    if (!result.success) {
      console.error("[export-to-base] Export failed", {
        productId,
        error: result.error,
      });
      return NextResponse.json(
        { error: result.error || "Failed to export product" },
        { status: 500 }
      );
    }

    console.log("[export-to-base] Export successful", {
      productId,
      externalProductId: result.productId,
    });

    // Create listing record
    const listingRepo = await getProductListingRepository();

    // Find Base.com integration
    const integrations = await integrationRepo.listIntegrations();
    const baseIntegration = integrations.find((i) => i.slug === "base-com");

    if (baseIntegration) {
      // Check if listing already exists
      const exists = await listingRepo.listingExists(productId, data.connectionId);

      if (!exists) {
        const newListing = await listingRepo.createListing({
          productId,
          integrationId: baseIntegration.id,
          connectionId: data.connectionId,
          externalListingId: result.productId || null,
        });
        // Update status to active since export was successful
        await listingRepo.updateListingStatus(newListing.id, "active");
      } else {
        // Update existing listing with external ID and status
        const listings = await listingRepo.getListingsByProductId(productId);
        const existingListing = listings.find(
          (l) => l.connectionId === data.connectionId
        );
        if (existingListing) {
          if (result.productId) {
            await listingRepo.updateListingExternalId(
              existingListing.id,
              result.productId
            );
          }
          // Update status to active since export was successful
          await listingRepo.updateListingStatus(existingListing.id, "active");
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
