import { Product, ProductImage, ImageFile } from "@prisma/client";
import { z } from "zod";
import { productCreateSchema } from "@/lib/validations/product";

// This type represents a product with its associated images and the image files themselves.
export type ProductWithImages = Product & {
  images: (ProductImage & { imageFile: ImageFile })[];
};

// This is the Zod schema for the product form data.
export type ProductFormData = z.infer<typeof productCreateSchema>;
