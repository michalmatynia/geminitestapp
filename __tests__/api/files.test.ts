
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

describe.skip("File Manager API", () => {
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
      data: { name: "Test Product", price: 100 },
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
    const req = { url: "http://localhost:3000/api/files" } as Request;
    const res = await allFilesGET(req);
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.length).toBeGreaterThan(0);
    expect(body[0].filename).toEqual("test-image.png");
    expect(body[0].products[0].product.name).toEqual("Test Product");
  });

  it("should return image files filtered by filename", async () => {
    const req = { url: "http://localhost:3000/api/files?filename=test" } as Request;
    const res = await allFilesGET(req);
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.length).toEqual(1);
    expect(body[0].filename).toEqual("test-image.png");
  });

  it("should return image files filtered by product name", async () => {
    const req = { url: "http://localhost:3000/api/files?productName=Test Product" } as Request;
    const res = await allFilesGET(req);
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.length).toEqual(1);
    expect(body[0].filename).toEqual("test-image.png");
  });

  it("should delete an image file", async () => {
    const req = {} as Request;
    const res = await filesDELETE(req, { params: { id: testImageFileId } });
    expect(res.status).toEqual(204);

    const checkReq = { url: "http://localhost:3000/api/files" } as Request;
    const checkRes = await allFilesGET(checkReq);
    const checkBody = await checkRes.json();
    expect(checkBody.length).toEqual(0);
  });

  it("should return 404 if image file not found for deletion", async () => {
    const req = {} as Request;
    const res = await filesDELETE(req, { params: { id: "nonexistent-id" } });
    expect(res.status).toEqual(404);
  });
});
