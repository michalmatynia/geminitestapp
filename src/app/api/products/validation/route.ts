import { NextRequest, NextResponse } from "next/server";
import {
  validateProductsBatch,
  validationStreamer,
  createValidationSSE,
  externalValidationService,
  validationRuleEngine,
  validationCache,
  getValidationHealth,
  type BatchValidationOptions,
  type StreamValidationOptions,
} from "@/features/products/validations";

// POST /api/products/validation - Batch validation
export async function POST(req: NextRequest) {
  try {
    const { products, options }: {
      products: unknown[];
      options?: BatchValidationOptions;
    } = await req.json();

    if (!Array.isArray(products)) {
      return NextResponse.json(
        { error: "Products must be an array" },
        { status: 400 }
      );
    }

    const result = await validateProductsBatch(products, options);
    
    return NextResponse.json({
      summary: {
        total: result.total,
        successful: result.successful,
        failed: result.failed,
      },
      results: result.results,
      globalErrors: result.globalErrors,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Batch validation failed" },
      { status: 500 }
    );
  }
}

// GET /api/products/validation - Health check
export async function GET() {
  const health = getValidationHealth();
  const cacheStats = validationCache.getStats();
  
  return NextResponse.json({
    validation: health,
    cache: cacheStats,
    external: {
      providers: externalValidationService.getProviders(),
    },
    rules: {
      total: validationRuleEngine.getAllRules().length,
      active: validationRuleEngine.getAllRules().filter(r => r.active).length,
    },
  });
}