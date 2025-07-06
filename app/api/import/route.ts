
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';
import Papa from 'papaparse';

const prisma = new PrismaClient();

interface CsvRow {
  [key: string]: string;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const text = await file.text();

    const parsed = Papa.parse<CsvRow>(text, { header: true });

    for (const row of parsed.data) {
      const productData: Prisma.ProductCreateInput = {
        sku: row['SKU'],
        name: row['My name'],
        price: row['Cena sprzedaży Retail Online (in EUR)'] ? parseInt(row['Cena sprzedaży Retail Online (in EUR)']) : 0,
        description: `${row['EN']}\n\n${row['PL']}`,
      };

      // Filter out entries with null or empty sku
      if (productData.sku) {
        await prisma.product.create({
          data: productData,
        });
      }
    }

    return NextResponse.json({ message: 'CSV imported successfully' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Error importing CSV' }, { status: 500 });
  }
}
