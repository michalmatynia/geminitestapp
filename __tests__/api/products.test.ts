import { GET as productsGET, POST as productsPOST } from '../../app/api/products/route';
import { GET as productGET, PUT as productPUT, DELETE as productDELETE } from '../../app/api/products/[id]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Products API', () => {
  beforeEach(async () => {
    // Clear the database and seed with test data before each test
    await prisma.product.deleteMany({});
    await prisma.product.createMany({
      data: [
        { name: 'Laptop', price: 1200 },
        { name: 'Mouse', price: 50 },
        { name: 'Keyboard', price: 100 },
        { name: 'Monitor', price: 400 },
        { name: 'Webcam', price: 80 },
      ],
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should return all products', async () => {
    const req = { url: 'http://localhost:3000/api/products' } as Request;
    const res = await productsGET(req);
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.length).toBeGreaterThan(0);
  });

  it('should return products filtered by search term', async () => {
    const req = { url: 'http://localhost:3000/api/products?search=lap' } as Request;
    const res = await productsGET(req);
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.length).toEqual(1);
    expect(body[0].name).toEqual('Laptop');
  });

  it('should create a new product', async () => {
    const newProduct = { name: 'Desk', price: 250 };
    const req = { json: async () => newProduct } as Request;
    const res = await productsPOST(req);
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.name).toEqual('Desk');
  });

  it('should update a product', async () => {
    const product = await prisma.product.findFirst({ where: { name: 'Mouse' } });
    if (!product) throw new Error('Mouse product not found');

    const updatedProduct = { name: 'Gaming Mouse', price: 75 };
    const req = { json: async () => updatedProduct } as Request;
    const res = await productPUT(req, { params: { id: product.id } });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.name).toEqual('Gaming Mouse');
    expect(body.price).toEqual(75);
  });

  it('should delete a product', async () => {
    const product = await prisma.product.findFirst({ where: { name: 'Webcam' } });
    if (!product) throw new Error('Webcam product not found');

    const req = {} as Request;
    const res = await productDELETE(req, { params: { id: product.id } });
    expect(res.status).toEqual(204);
  });
});