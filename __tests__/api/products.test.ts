import supertest from "supertest";
import { app } from "../../app/api/[[...route]]/route";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const request = supertest(app);

describe.skip("Products API", () => {
  beforeEach(async () => {
    // Clear the database and seed with test data before each test
    await prisma.productImage.deleteMany({});
    await prisma.imageFile.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.product.createMany({
      data: [
        { name: "Laptop", price: 1200, sku: "LP1200" },
        { name: "Mouse", price: 50, sku: "MS50" },
        { name: "Keyboard", price: 100, sku: "KB100" },
        { name: "Monitor", price: 400, sku: "MN400" },
        { name: "Webcam", price: 80, sku: "WC80" },
      ],
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return all products", async () => {
    const res = await request.get("/api/products");
    expect(res.status).toEqual(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it("should return an empty array if no products exist", async () => {
    await prisma.product.deleteMany({}); // Clear all products
    const res = await request.get("/api/products");
    expect(res.status).toEqual(200);
    expect(res.body).toEqual([]);
  });

  it("should return products filtered by search term", async () => {
    const res = await request.get("/api/products?search=lap");
    expect(res.status).toEqual(200);
    expect(res.body.length).toEqual(1);
    expect(res.body[0].name).toEqual("Laptop");
  });

  it("should create a new product", async () => {
    const res = await request
      .post("/api/products")
      .field("name", "Desk")
      .field("price", "250")
      .field("sku", "DSK250");
    expect(res.status).toEqual(200);
    expect(res.body.name).toEqual("Desk");
  });

  it("should create a new product with an image", async () => {
    const res = await request
      .post("/api/products")
      .field("name", "Chair")
      .field("price", "150")
      .field("sku", "CHR150")
      .attach("image", Buffer.from(""), "test-image.png");
    expect(res.status).toEqual(200);
    expect(res.body.name).toEqual("Chair");
  });

  it("should return 400 if product creation fails due to invalid data", async () => {
    const res = await request
      .post("/api/products")
      .field("name", "")
      .field("price", "-100");
    expect(res.status).toEqual(400);
  });

  it("should update a product", async () => {
    const product = await prisma.product.findFirst({
      where: { name: "Mouse" },
    });
    if (!product) throw new Error("Mouse product not found");

    const res = await request
      .put(`/api/products/${product.id}`)
      .field("name", "Gaming Mouse")
      .field("price", "75")
      .field("sku", "GMS75");
    expect(res.status).toEqual(200);
    expect(res.body.name).toEqual("Gaming Mouse");
    expect(res.body.price).toEqual(75);
  });

  it("should update a product with a new image", async () => {
    const product = await prisma.product.findFirst({
      where: { name: "Keyboard" },
    });
    if (!product) throw new Error("Keyboard product not found");

    const res = await request
      .put(`/api/products/${product.id}`)
      .field("name", "Mechanical Keyboard")
      .field("price", "120")
      .field("sku", "MK120")
      .attach("image", Buffer.from(""), "updated-image.png");
    expect(res.status).toEqual(200);
    expect(res.body.name).toEqual("Mechanical Keyboard");
  });

  it("should delete a product", async () => {
    const product = await prisma.product.findFirst({
      where: { name: "Webcam" },
    });
    if (!product) throw new Error("Webcam product not found");

    const res = await request.delete(`/api/products/${product.id}`);
    expect(res.status).toEqual(204);
  });

  it("should disconnect an image from a product", async () => {
    // Create a product with an image first
    const createRes = await request
      .post("/api/products")
      .field("name", "Product with Image")
      .field("price", "99")
      .field("sku", "PWI99")
      .attach("image", Buffer.from(""), "disconnect-image.png");
    const createdProduct = createRes.body;

    const productWithImage = await prisma.product.findUnique({
      where: { id: createdProduct.id },
      include: {
        images: {
          include: {
            imageFile: true,
          },
        },
      },
    });

    expect(productWithImage?.images).toHaveLength(1);
    const imageFileIdToDisconnect = productWithImage?.images[0].imageFile.id;

    // Disconnect the image
    const disconnectRes = await request.delete(
      `/api/products/${createdProduct.id}/images/${imageFileIdToDisconnect}`
    );

    expect(disconnectRes.status).toEqual(204);
  });

  it("should delete a product and its associated ProductImage records", async () => {
    // Create a product with an image
    const createRes = await request
      .post("/api/products")
      .field("name", "Product to Delete")
      .field("price", "50")
      .field("sku", "PTD50")
      .attach("image", Buffer.from(""), "test-image-for-delete.png");
    const createdProduct = createRes.body;

    // Delete the product
    const deleteRes = await request.delete(
      `/api/products/${createdProduct.id}`
    );
    expect(deleteRes.status).toEqual(204);
  });
});
