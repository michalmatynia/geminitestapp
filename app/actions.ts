"use server";

import { PrismaClient, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { exec } from "child_process";
import util from "util";

const execAsync = util.promisify(exec);

const prisma = new PrismaClient();

export async function getProductsAction(filters: {
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  startDate?: string;
  endDate?: string;
}) {
  const { search, minPrice, maxPrice, startDate, endDate } = filters;
  const where: Prisma.ProductWhereInput = {
    name: {
      contains: search,
    },
  };

  if (minPrice) {
    where.price = { ...where.price as Prisma.IntFilter, gte: minPrice };
  }
  if (maxPrice) {
    where.price = { ...where.price as Prisma.IntFilter, lte: maxPrice };
  }
  if (startDate) {
    where.createdAt = { ...where.createdAt as Prisma.DateTimeFilter, gte: new Date(startDate) };
  }
  if (endDate) {
    where.createdAt = { ...where.createdAt as Prisma.DateTimeFilter, lte: new Date(endDate) };
  }

  try {
    const products = await prisma.product.findMany({
      where,
      include: {
        images: {
          include: {
            imageFile: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return products;
  } catch (error) {
    console.error("Error fetching products:", error);
    throw new Error("Failed to fetch products");
  }
}

export async function deleteProduct(id: string) {
  console.log(`SERVER ACTION: Deleting product with id: ${id}`);
  try {
    await prisma.product.delete({
      where: { id },
    });
    console.log(`SERVER ACTION: Product ${id} deleted successfully.`);
    revalidatePath("/admin");
  } catch (error) {
    console.error("Failed to delete product:", error);
    throw new Error("Failed to delete product.");
  }
}

export async function seedDatabase() {
  try {
    console.log("Seeding database...");
    const { stdout, stderr } = await execAsync("npm run seed");
    console.log(stdout);
    if (stderr) {
      console.error(`Seed stderr: ${stderr}`);
      throw new Error(`Failed to seed database: ${stderr}`);
    }
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("Failed to seed database:", error);
    throw new Error("Failed to seed database.");
  }
}