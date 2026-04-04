import { badRequestError } from '@/shared/errors/app-error';
import { parseObjectJsonBody } from '@/shared/lib/api/parse-json';

type ProductsValidationBatchResult = {
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
  results: Array<{ index: number; result: unknown }>;
};

export const resolveProductsValidationPayload = async (
  req: Request
): Promise<{ ok: true; products: unknown[] } | { ok: false; response: Response }> => {
  const parsed = await parseObjectJsonBody(req, {
    logPrefix: 'products.validation',
  });
  if (!parsed.ok) {
    return { ok: false, response: parsed.response };
  }

  const products = (parsed.data as { products?: unknown }).products;
  if (!Array.isArray(products)) {
    throw badRequestError('Products must be an array');
  }

  return { ok: true, products };
};

export const buildProductsValidationResponse = (
  result: ProductsValidationBatchResult
): {
  summary: { total: number; successful: number; failed: number };
  results: Array<{ index: number; result: unknown }>;
  globalErrors: [];
} => ({
  summary: {
    total: result.summary.total,
    successful: result.summary.successful,
    failed: result.summary.failed,
  },
  results: result.results,
  globalErrors: [],
});

export const buildProductsValidationHealthResponse = (): {
  status: 'ok';
  validation: { engine: 'zod-schema' };
} => ({
  status: 'ok',
  validation: { engine: 'zod-schema' },
});
