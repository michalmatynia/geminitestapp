
import supertest from "supertest";
import { app } from "../../app/api/[[...route]]/route";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const request = supertest(app.fetch as any);

jest.mock('fs/promises', () => ({
  unlink: jest.fn(),
}));

describe("File Manager API", () => {
  let testImageFileId: string;
  let testProductId: string;

  beforeEach(async () => {
    const { unlink } = await import('fs/promises');
    // Mock the unlink function to prevent actual file deletion during tests
    (unlink as jest.Mock).mockClear();
    (unlink as jest.Mock).mockResolvedValue(undefined);

    await prisma.productImage.deleteMany({});
    await prisma.imageFile.deleteMany({});
    await prisma.product.deleteMany({});

    const product = await prisma.product.create({
      data: { name: "Test Product", price: 100, sku: "TP100" },
    });
    testProductId = product.id;

    const imageFile = await prisma.imageFile.create({
      data: {
        filename: "test-image.png",
        filepath: "/uploads/test-image.png",
        mimetype: "image/png",
        size: 1024,
      },
    });
    testImageFileId = imageFile.id;

    await prisma.productImage.create({
      data: {
        productId: testProductId,
        imageFileId: testImageFileId,
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return all image files", async () => {
    const res = await request.get("/api/files");
    expect(res.status).toEqual(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].filename).toEqual("test-image.png");
    expect(res.body[0].products[0].product.name).toEqual("Test Product");
  });

  it("should return image files filtered by filename", async () => {
    const res = await request.get("/api/files?filename=test");
    expect(res.status).toEqual(200);
    expect(res.body.length).toEqual(1);
    expect(res.body[0].filename).toEqual("test-image.png");
  });

  it("should return image files filtered by product name", async () => {
    const res = await request.get("/api/files?productName=Test Product");
    expect(res.status).toEqual(200);
    expect(res.body.length).toEqual(1);
    expect(res.body[0].filename).toEqual("test-image.png");
  });

  it("should delete an image file", async () => {
    const res = await request.delete(`/api/files/${testImageFileId}`);
    expect(res.status).toEqual(204);

    const checkRes = await request.get("/api/files");
    expect(checkRes.body.length).toEqual(0);
  });

  it("should return 404 if image file not found for deletion", async () => {
    const res = await request.delete("/api/files/nonexistent-id");
    expect(res.status).toEqual(404);
  });
});
