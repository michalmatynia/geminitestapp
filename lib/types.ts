import { Product, ProductImage, ImageFile, ConnectionLog } from "@prisma/client";
import { z } from "zod";
import { productSchema } from "@/lib/validations/product";

// This type represents a product with its associated images and the image files themselves.
export type ProductWithImages = Product & {
  images: (ProductImage & { imageFile: ImageFile })[];
};

// This is the Zod schema for the product form data.
export type ProductFormData = z.infer<typeof productSchema>;

// This type represents the connection log entry from the database.
export type ConnectionLogType = ConnectionLog;