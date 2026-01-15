import { getProductRepository } from "@/lib/services/product-repository";
import { productCreateSchema } from "@/lib/validations/product";

export async function createMockProduct(productData: {
  name_en?: string;
  name_pl?: string;
  name_de?: string;
  description_en?: string;
  description_pl?: string;
  description_de?: string;
  price?: string;
  sku?: string;
  stock?: number;
  weight?: number;
  length?: number;
}) {
  const productRepository = await getProductRepository();
  const validated = productCreateSchema.parse({
    name_en: productData.name_en || "Mock Product (EN)",
    name_pl: productData.name_pl || "Mock Product (PL)",
    name_de: productData.name_de || "Mock Product (DE)",
    description_en:
      productData.description_en ||
      "This is a mock product description (EN).",
    description_pl:
      productData.description_pl ||
      "This is a mock product description (PL).",
    description_de:
      productData.description_de ||
      "This is a mock product description (DE).",
    price: productData.price ? parseInt(productData.price, 10) : 100,
    sku: productData.sku || `MOCK-SKU-${Date.now()}-${Math.random()}`,
    stock: productData.stock || 10,
    supplierName: "Mock Supplier",
    supplierLink: "https://mock.supplier.com",
    priceComment: "Mock price comment",
    sizeLength: 10,
    sizeWidth: 10,
    weight: productData.weight || 100,
    length: productData.length || 20,
  });
  const product = await productRepository.createProduct(validated);
  return product;
}
