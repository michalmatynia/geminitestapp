import { checkBaseSkuExists } from '@/features/integrations/server';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { conflictError } from '@/shared/errors/app-error';

export async function verifySkuUniqueness(args: {
  allowDuplicateSku: boolean;
  listingExternalId: string | null;
  sku: string | null;
  token: string;
  inventoryId: string;
}) {
  const { allowDuplicateSku, listingExternalId, sku, token, inventoryId } = args;
  
  if (!allowDuplicateSku && !listingExternalId && sku) {
    await ErrorSystem.logInfo('[export-to-base] Checking if SKU exists in Base.com', {
      sku,
      inventoryId,
    });

    const skuCheck = await checkBaseSkuExists(token, inventoryId, sku);
    if (skuCheck.exists) {
      await ErrorSystem.logWarning('[export-to-base] SKU already exists in Base.com', {
        sku,
        existingProductId: skuCheck.productId,
      });
      throw conflictError(
        `SKU "${sku}" already exists in Base.com inventory. Use "Allow duplicate SKUs" option to export anyway.`,
        {
          skuExists: true,
          existingProductId: skuCheck.productId,
          sku,
        }
      );
    }
  }
}
