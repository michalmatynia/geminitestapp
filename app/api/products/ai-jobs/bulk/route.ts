import { NextRequest, NextResponse } from "next/server";
import { enqueueProductAiJob } from "@/lib/services/productAiService";
import { startProductAiJobQueue } from "@/lib/services/productAiQueue";
import { getProductRepository } from "@/lib/services/product-repository";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, config } = body;

    if (!type) {
      return NextResponse.json({ error: "Job type is required" }, { status: 400 });
    }

    // Get all product IDs using repository
    const productRepository = await getProductRepository();
    const { items: products } = await productRepository.getProducts({
      limit: 10000, // Large limit to get all products
      offset: 0,
    });

    if (products.length === 0) {
      return NextResponse.json({ message: "No products found to process", count: 0 });
    }

    // Create jobs in bulk (using a transaction or loop)
    // For now, simple loop using the service
    const jobs = await Promise.all(
      products.map((p) =>
        enqueueProductAiJob(p.id, type, {
          ...config,
          // We don't include full product data here, 
          // the worker will fetch it to ensure it's fresh
        })
      )
    );

    startProductAiJobQueue();

    return NextResponse.json({ 
      success: true, 
      count: jobs.length,
      message: `Queued ${jobs.length} jobs of type ${type}` 
    });
  } catch (error) {
    console.error("[api/products/ai-jobs/bulk] POST error:", error);
    return NextResponse.json({ error: "Failed to queue bulk jobs" }, { status: 500 });
  }
}
