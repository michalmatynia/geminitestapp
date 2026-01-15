import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";

import { getProductRepository } from "@/lib/services/product-repository";
import { productCreateSchema } from "@/lib/validations/product";

interface CsvRow {
  [key: string]: string;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
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
    console.error(error);
    return NextResponse.json({ error: "Error importing CSV" }, { status: 500 });
  }
}
