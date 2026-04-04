import type { CatalogUpdateInput } from '@/shared/contracts/products/catalogs';
import { updateCatalogSchema } from '@/shared/contracts/products/catalogs';
import { badRequestError } from '@/shared/errors/app-error';
import { parseObjectJsonBody } from '@/shared/lib/api/parse-json';

type ProductsEntityCollectionType = 'catalogs';
type ProductsEntityReadType = 'drafts';
type ProductsEntityUpdateType = 'catalogs';
type ProductsEntityDeleteType = 'catalogs' | 'drafts';

const invalidProductsEntityTypeError = (method: 'GET' | 'POST' | 'PUT' | 'DELETE', type: string) =>
  badRequestError(`Invalid products entity type for ${method}: ${type}`);

export const resolveProductsEntityCollectionType = (
  type: string,
  method: 'GET' | 'POST'
): ProductsEntityCollectionType => {
  if (type === 'catalogs') {
    return type;
  }
  throw invalidProductsEntityTypeError(method, type);
};

export const resolveProductsEntityReadType = (type: string): ProductsEntityReadType => {
  if (type === 'drafts') {
    return type;
  }
  throw invalidProductsEntityTypeError('GET', type);
};

export const resolveProductsEntityUpdateType = (type: string): ProductsEntityUpdateType => {
  if (type === 'catalogs') {
    return type;
  }
  throw invalidProductsEntityTypeError('PUT', type);
};

export const resolveProductsEntityDeleteType = (type: string): ProductsEntityDeleteType => {
  if (type === 'catalogs' || type === 'drafts') {
    return type;
  }
  throw invalidProductsEntityTypeError('DELETE', type);
};

export const resolveProductsEntityUpdatePayload = async (
  req: Request,
  payload: unknown
): Promise<{ ok: true; payload: unknown } | { ok: false; response: Response }> => {
  if (payload !== undefined) {
    return { ok: true, payload };
  }

  const parsed = await parseObjectJsonBody(req, {
    logPrefix: 'products.entities.[type].[id].PUT',
  });
  if (!parsed.ok) {
    return { ok: false, response: parsed.response };
  }
  return { ok: true, payload: parsed.data };
};

export const parseProductsEntityCatalogUpdatePayload = (
  payload: unknown
): CatalogUpdateInput => {
  const validated = updateCatalogSchema.safeParse(payload);
  if (!validated.success) {
    throw badRequestError('Invalid catalog payload.', {
      errors: validated.error.flatten(),
    });
  }
  return validated.data;
};
