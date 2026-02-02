/**
 * Comprehensive example of the enhanced validation system
 * This file demonstrates all features of the validation system
 */

import {
  validateProductCreate,
} from "@/features/products/validations";

// Basic validation usage
export async function basicValidationExample(): Promise<unknown> {
  const productData = {
    sku: "EXAMPLE-001",
    name_en: "Example Product",
    price: 99.99,
    stock: 10,
  };

  const result = await validateProductCreate(productData);
  
  if (result.success) {
    console.log("Product is valid:", result.data);
    return result.data;
  } else {
    console.error("Validation errors:", result.errors);
    throw new Error("Invalid product data");
  }
}

const examples = {
  basicValidationExample,
};

// Export for use in other parts of the application
export default examples;
