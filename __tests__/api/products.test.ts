import {
  GET as productsGET,
  POST as productsPOST,
} from "../../app/api/products/route";
import {
  GET as productGET,
  PUT as productPUT,
  DELETE as productDELETE,
} from "../../app/api/products/[id]/route";
import { DELETE as productImageDELETE } from "../../app/api/products/[id]/images/[imageFileId]/route";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

describe("Products API", () => {
  beforeEach(async () => {
    // Clear the database and seed with test data before each test
    await prisma.productImage.deleteMany({});
    await prisma.imageFile.deleteMany({});
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

  it("should create a new product with an image", async () => {
    const mockFile = new File(
      [
        Buffer.from(
          "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
          "base64"
        ),
      ],
      "test-image.png",
      { type: "image/png" }
    );
    Object.defineProperty(mockFile, "size", { value: 1024 });

    const formData = new FormData();
    formData.append("name", "Chair");
    formData.append("price", "150");
    formData.append("image", mockFile);

    const req = { formData: async () => formData } as unknown as Request;
    const res = await productsPOST(req);
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.name).toEqual("Chair");

    const product = await prisma.product.findUnique({
      where: { id: body.id },
      include: {
        images: {
          include: {
            imageFile: true,
          },
        },
      },
    });

    expect(product?.images).toHaveLength(1);
    expect(product?.images[0].imageFile.filename).toEqual("test-image.png");
    expect(product?.images[0].imageFile.mimetype).toEqual("image/png");
    expect(product?.images[0].imageFile.size).toEqual(1024);
    expect(product?.images[0].imageFile.width).toBeDefined();
    expect(product?.images[0].imageFile.height).toBeDefined();
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

  it("should update a product with a new image", async () => {
    const product = await prisma.product.findFirst({
      where: { name: "Keyboard" },
    });
    if (!product) throw new Error("Keyboard product not found");

    const mockFile = new File(
      [
        Buffer.from(
          "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
          "base64"
        ),
      ],
      "updated-image.png",
      { type: "image/png" }
    );
    Object.defineProperty(mockFile, "size", { value: 2048 });

    const formData = new FormData();
    formData.append("name", "Mechanical Keyboard");
    formData.append("price", "120");
    formData.append("image", mockFile);

    const req = { formData: async () => formData } as unknown as Request;
    const res = await productPUT(req, { params: { id: product.id } });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.name).toEqual("Mechanical Keyboard");

    const updatedProduct = await prisma.product.findUnique({
      where: { id: product.id },
      include: {
        images: {
          include: {
            imageFile: true,
          },
        },
      },
    });

    expect(updatedProduct?.images).toHaveLength(1);
    expect(updatedProduct?.images[0].imageFile.filename).toEqual(
      "updated-image.png"
    );
    expect(updatedProduct?.images[0].imageFile.mimetype).toEqual("image/png");
    expect(updatedProduct?.images[0].imageFile.size).toEqual(2048);
    expect(updatedProduct?.images[0].imageFile.width).toBeDefined();
    expect(updatedProduct?.images[0].imageFile.height).toBeDefined();
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

  it("should disconnect an image from a product", async () => {
    // Create a product with an image first
    const mockFile = new File(
      [
        Buffer.from(
          "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
          "base64"
        ),
      ],
      "disconnect-image.png",
      { type: "image/png" }
    );
    Object.defineProperty(mockFile, "size", { value: 512 });

    const formData = new FormData();
    formData.append("name", "Product with Image");
    formData.append("price", "99");
    formData.append("image", mockFile);

    const createReq = { formData: async () => formData } as unknown as Request;
    const createRes = await productsPOST(createReq);
    const createdProduct = await createRes.json();

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
    const disconnectReq = {} as Request;
    const disconnectRes = await productImageDELETE(disconnectReq, {
      params: {
        productId: createdProduct.id,
        imageFileId: imageFileIdToDisconnect,
      },
    });

    expect(disconnectRes.status).toEqual(204);

    // Verify the ProductImage entry is deleted
    const updatedProduct = await prisma.product.findUnique({
      where: { id: createdProduct.id },
      include: {
        images: true,
      },
    });
    expect(updatedProduct?.images).toHaveLength(0);

    // Verify the ImageFile entry still exists
    const imageFileExists = await prisma.imageFile.findUnique({
      where: { id: imageFileIdToDisconnect },
    });
    expect(imageFileExists).not.toBeNull();

    // Verify the Product entry still exists
    const productExists = await prisma.product.findUnique({
      where: { id: createdProduct.id },
    });
    expect(productExists).not.toBeNull();
  });

  it("should delete a product and its associated ProductImage records", async () => {
    // Create a product with an image
    const mockFile = new File(
      [
        Buffer.from(
          "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
          "base64"
        ),
      ],
      "test-image-for-delete.png",
      { type: "image/png" }
    );
    Object.defineProperty(mockFile, "size", { value: 1024 });

    const formData = new FormData();
    formData.append("name", "Product to Delete");
    formData.append("price", "50");
    formData.append("image", mockFile);

    const createReq = { formData: async () => formData } as unknown as Request;
    const createRes = await productsPOST(createReq);
    const createdProduct = await createRes.json();

    const productWithImage = await prisma.product.findUnique({
      where: { id: createdProduct.id },
      include: { images: true },
    });
    expect(productWithImage?.images).toHaveLength(1);

    // Delete the product
    const deleteReq = {} as Request;
    const deleteRes = await productDELETE(deleteReq, {
      params: { id: createdProduct.id },
    });
    expect(deleteRes.status).toEqual(204);

    // Verify the product is deleted
    const deletedProduct = await prisma.product.findUnique({
      where: { id: createdProduct.id },
    });
    expect(deletedProduct).toBeNull();

    // Verify the ProductImage record is also deleted
    const productImage = await prisma.productImage.findFirst({
      where: { productId: createdProduct.id },
    });
    expect(productImage).toBeNull();
  });
});

