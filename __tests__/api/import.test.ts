
import { POST } from '@/app/api/import/route';
import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { Readable } from 'stream';

const prisma = new PrismaClient();

describe('POST /api/import', () => {
  beforeEach(async () => {
    await prisma.product.deleteMany();
  });

  it('should return an error if no file is uploaded', async () => {
    const formData = new FormData();
    const req = new NextRequest('http://localhost/api/import', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('No file uploaded');
  });

  it('should successfully import a product from a CSV file', async () => {
    const csvData = `SKU,My name,Supplier Name,Link do Sprzeda��y,Komentarz do ceny,Stock,Cena zakupu bez przesylki (USD),Cena zakupu (z przesyłka) USD,Z dnia,Cena sprzedaży Retail Online (in EUR),Size in mm length,Size in mm width,Carton Comment,Carton Size,MOQ,Weight in kg,Material,Sea Shipping,Train Shipping,Air Shipping,DDP Shipping,Sparks Of sindri.com,StarGater.net,Olx,Name EN,Name PL,PL,EN,GPT Prompt,Vinted,DE,ASIN,Alternative Name,Alternative Description PL,Alternative Description EN
KNIVPIE001,God Of War,"Yiwu Rongji Jewelry Co., Ltd.",https://www.alibaba.com/product-detail/Game-Accessory-God-of-War-Kratos_1600704255878.html?spm=a2756.order-detail-ta-bn-b.0.0.3e9f2fc2yNMpVK,,10,5,6,2023-10-26,25,200,20,"Comment","Large",100,0.5,Metal,"Yes","No","Yes","Yes","sparks.com","stargater.net","olx.pl","God of War Knife","Nóż God of War","Opis PL","Opis EN","Prompt","vinted.pl","de.pl","ASIN123","Alt Name","Alt Opis PL","Alt Opis EN"`;

    const blob = new Blob([csvData], { type: 'text/csv' });
    const formData = new FormData();
    formData.append('file', blob, 'products.csv');

    const req = new NextRequest('http://localhost/api/import', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toBe('CSV imported successfully');

    const product = await prisma.product.findUnique({
      where: { sku: 'KNIVPIE001' },
    });

    expect(product).not.toBeNull();
    expect(product?.name).toBe('God Of War');
  });
});
