import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NextResponse } from 'next/server';

export async function handleProductImageUpload(image: File | null): Promise<string | undefined> {
  if (image) {
    const buffer = Buffer.from(await image.arrayBuffer());
    const filename = `${Date.now()}-${image.name}`;
    const uploadPath = join(process.cwd(), 'public/uploads/products', filename);
    await writeFile(uploadPath, buffer);
    return `/uploads/products/${filename}`;
  }
  return undefined;
}

export function validateProductInput(name: string, price: number): NextResponse | null {
  if (!name || name.trim() === '') {
    return NextResponse.json({ error: "Product name cannot be empty" }, { status: 400 });
  }

  if (isNaN(price) || price <= 0) {
    return NextResponse.json({ error: "Product price must be a positive number" }, { status: 400 });
  }
  return null;
}
