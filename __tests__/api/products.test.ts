import {
  GET as productsGET,
  POST as productsPOST,
} from "../../app/api/products/route";
import {
  GET as productGET,
  PUT as productPUT,
  DELETE as productDELETE,
} from "../../app/api/products/[id]/route";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

describe("Products API", () => {
  beforeEach(async () => {
    // Clear the database and seed with test data before each test
    await prisma.product.deleteMany({});
    await prisma.product.createMany({
      data: [
        { name: "Laptop", price: 1200 },
        { name: "Mouse", price: 50 },
        { name: "Keyboard", price: 100 },
        { name: "Monitor", price: 400 },
        { name: "Webcam", price: 80 },
      ],
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return all products", async () => {
    const req = { url: "http://localhost:3000/api/products" } as Request;
    const res = await productsGET(req);
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.length).toBeGreaterThan(0);
  });

  it("should return an empty array if no products exist", async () => {
    await prisma.product.deleteMany({}); // Clear all products
    const req = { url: "http://localhost:3000/api/products" } as Request;
    const res = await productsGET(req);
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body).toEqual([]);
  });

  it("should return products filtered by search term", async () => {
    const req = {
      url: "http://localhost:3000/api/products?search=lap",
    } as Request;
    const res = await productsGET(req);
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.length).toEqual(1);
    expect(body[0].name).toEqual("Laptop");
  });

  it("should create a new product", async () => {
    const formData = new FormData();
    formData.append("name", "Desk");
    formData.append("price", "250");
    const req = { formData: async () => formData } as unknown as Request;
    const res = await productsPOST(req);
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.name).toEqual("Desk");
  });

  it("should return 400 if product creation fails due to invalid data", async () => {
    const formData = new FormData();
    formData.append("name", "");
    formData.append("price", "-100");
    const req = { formData: async () => formData } as unknown as Request;
    const res = await productsPOST(req);
    expect(res.status).toEqual(400);
  });

  it("should update a product", async () => {
    const product = await prisma.product.findFirst({
      where: { name: "Mouse" },
    });
    if (!product) throw new Error("Mouse product not found");

    const formData = new FormData();
    formData.append("name", "Gaming Mouse");
    formData.append("price", "75");
    const req = { formData: async () => formData } as unknown as Request;
    const res = await productPUT(req, { params: { id: product.id } });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.name).toEqual("Gaming Mouse");
    expect(body.price).toEqual(75);
  });

  it("should delete a product", async () => {
    const product = await prisma.product.findFirst({
      where: { name: "Webcam" },
    });
    if (!product) throw new Error("Webcam product not found");

    const req = {} as Request;
    const res = await productDELETE(req, { params: { id: product.id } });
    expect(res.status).toEqual(204);
  });
});
