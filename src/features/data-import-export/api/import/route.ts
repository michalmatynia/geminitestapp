import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";

import { getProductRepository, productCreateSchema } from "@/features/products/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { badRequestError } from "@/shared/errors/app-error";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";

interface CsvRow {
  [key: string]: string;
}

async function POST_handler(req: NextRequest): Promise<Response> {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      throw badRequestError("No file uploaded");
    }

    const text = await file.text();

    const parsed = Papa.parse<CsvRow>(text, { header: true });
    const productRepository = await getProductRepository();

    for (const row of parsed.data) {
      const productData = {
        sku: row["SKU"],

        name_pl: (row["Name PL"] ?? "").toString().trim(),
        name_en: (row["Name EN"] ?? "").toString().trim(),
        name_de: (row["Name DE"] ?? "").toString().trim(),
        price: row["Cena sprzedaży Retail Online (in EUR)"]
          ? parseInt(row["Cena sprzedaży Retail Online (in EUR)"])
          : 0,
        description_en: `${row["EN"]}`,
        description_de: `${row["DE"]}`,
        description_pl: `${row["PL"]}`,
      };

      // Filter out entries with null or empty sku
      if (productData.sku) {
        const validated = productCreateSchema.parse(productData);
        await productRepository.createProduct(validated);
      }
    }

    return NextResponse.json({ message: "CSV imported successfully" });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "import.POST",
      fallbackMessage: "Error importing CSV",
    });
  }
}

export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
 { source: "import.POST" });
