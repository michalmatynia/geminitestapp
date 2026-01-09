import { createMocks } from "node-mocks-http";
import { GET } from "@/app/api/files/route";
import { DELETE } from "@/app/api/files/[id]/route";
import { createMockProduct } from "@/lib/utils/productUtils";
import prisma from "@/lib/prisma";
import fs from "fs/promises";
import path from "path";

describe("Files API", () => {
  let product1: any;
  let product2: any;
  let imageFile1: any;
  let imageFile2: any;

  beforeAll(async () => {
    await prisma.productImage.deleteMany({});
    await prisma.imageFile.deleteMany({});
    await prisma.product.deleteMany({});

    product1 = await createMockProduct({ name: "Product A" });
    product2 = await createMockProduct({ name: "Product B" });

    const imagePath1 = path.join(process.cwd(), "public", "test-image1.jpg");
    const imagePath2 = path.join(process.cwd(), "public", "test-image2.jpg");
    await fs.writeFile(imagePath1, "test1");
    await fs.writeFile(imagePath2, "test2");

    imageFile1 = await prisma.imageFile.create({
      data: {
        filename: "test-image1.jpg",
        filepath: "/test-image1.jpg",
        mimetype: "image/jpeg",
        size: 123,
      },
    });

    imageFile2 = await prisma.imageFile.create({
      data: {
        filename: "another-image.png",
        filepath: "/another-image.png",
        mimetype: "image/png",
        size: 456,
      },
    });

    await prisma.productImage.create({
      data: {
        productId: product1.id,
        imageFileId: imageFile1.id,
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    const imagePath1 = path.join(process.cwd(), "public", "test-image1.jpg");
    const imagePath2 = path.join(process.cwd(), "public", "test-image2.jpg");
    await fs.unlink(imagePath1);
    await fs.unlink(imagePath2);
  });

  describe("GET /api/files", () => {
    it("should return all files", async () => {
      const res = await GET(new Request("http://localhost/api/files"));
      const files = await res.json();
      expect(res.status).toBe(200);
      expect(files.length).toBe(2);
    });

    it("should filter files by filename", async () => {
      const res = await GET(
        new Request("http://localhost/api/files?filename=test-image")
      );
      const files = await res.json();
      expect(res.status).toBe(200);
      expect(files.length).toBe(1);
      expect(files[0].filename).toBe("test-image1.jpg");
    });

    it("should filter files by product ID", async () => {
      const res = await GET(
        new Request(`http://localhost/api/files?productId=${product1.id}`)
      );
      const files = await res.json();
      expect(res.status).toBe(200);
      expect(files.length).toBe(1);
      expect(files[0].filename).toBe("test-image1.jpg");
    });

    it("should filter files by product name", async () => {
      const res = await GET(
        new Request("http://localhost/api/files?productName=Product A")
      );
      const files = await res.json();
      expect(res.status).toBe(200);
      expect(files.length).toBe(1);
      expect(files[0].filename).toBe("test-image1.jpg");
    });
  });

  describe("DELETE /api/files/[id]", () => {
    it("should delete a file", async () => {
      const res = await DELETE(new Request("http://localhost"), {
        params: { id: imageFile2.id },
      });
      expect(res.status).toBe(204);

      const deletedFile = await prisma.imageFile.findUnique({
        where: { id: imageFile2.id },
      });
      expect(deletedFile).toBeNull();
    });

    it("should return 404 for non-existent file", async () => {
      const res = await DELETE(new Request("http://localhost"), {
        params: { id: "non-existent-id" },
      });
      expect(res.status).toBe(404);
    });
  });
});
