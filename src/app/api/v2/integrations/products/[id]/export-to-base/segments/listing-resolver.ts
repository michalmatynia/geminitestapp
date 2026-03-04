import {
  findProductListingByIdAcrossProviders,
  findProductListingByProductAndConnectionAcrossProviders,
} from '@/features/integrations/server';
import type { ProductListing, ProductListingRepository } from '@/shared/contracts/integrations';
import { badRequestError } from '@/shared/errors/app-error';

export async function resolveListingForExport(args: {
  productId: string;
  connectionId: string;
  inventoryId: string;
  imagesOnly: boolean;
  externalListingId: string | null;
  listingIdFromData: string | null;
  baseIntegrationId: string | null;
  primaryListingRepo: ProductListingRepository;
}) {
  const {
    productId,
    connectionId,
    inventoryId,
    imagesOnly,
    externalListingId,
    listingIdFromData,
    baseIntegrationId,
    primaryListingRepo,
  } = args;

  let listingRepo = primaryListingRepo;
  let listingId: string | null = null;
  let listingExternalId: string | null = externalListingId;
  let listingInventoryId: string | null = null;

  if (imagesOnly) {
    let existingListing: ProductListing | null = null;
    if (listingIdFromData) {
      const resolvedById = await findProductListingByIdAcrossProviders(listingIdFromData);
      if (resolvedById?.listing.productId === productId) {
        existingListing = resolvedById.listing;
        listingRepo = resolvedById.repository;
      }
    }
    if (!existingListing) {
      const resolvedByConnection = await findProductListingByProductAndConnectionAcrossProviders(
        productId,
        connectionId
      );
      if (resolvedByConnection) {
        existingListing = resolvedByConnection.listing;
        listingRepo = resolvedByConnection.repository;
      }
    }

    if (existingListing) {
      listingId = existingListing.id;
      listingExternalId = existingListing.externalListingId ?? listingExternalId;
      listingInventoryId = existingListing.inventoryId ?? null;
      await listingRepo.updateListingStatus(existingListing.id, 'pending');
      if (listingExternalId && existingListing.externalListingId !== listingExternalId) {
        await listingRepo.updateListingExternalId(existingListing.id, listingExternalId);
      }
    }
    if (!listingExternalId) {
      throw badRequestError(
        'Images-only export requires an existing Base.com listing. Export the product first.'
      );
    }
  } else {
    const resolvedByConnection = await findProductListingByProductAndConnectionAcrossProviders(
      productId,
      connectionId
    );

    if (!resolvedByConnection) {
      if (!baseIntegrationId) {
        throw badRequestError('Base integration is not configured for this export.');
      }
      const newListing = await primaryListingRepo.createListing({
        productId,
        integrationId: baseIntegrationId,
        connectionId,
        externalListingId: null,
        inventoryId,
        marketplaceData: {
          source: 'base-export',
          marketplace: 'base',
        },
      });
      listingRepo = primaryListingRepo;
      listingId = newListing.id;
    } else {
      const existingListing = resolvedByConnection.listing;
      listingRepo = resolvedByConnection.repository;
      listingId = existingListing.id;
      listingExternalId = existingListing.externalListingId ?? listingExternalId;
      await listingRepo.updateListingStatus(existingListing.id, 'pending');
      if (existingListing.inventoryId !== inventoryId) {
        await listingRepo.updateListingInventoryId(existingListing.id, inventoryId);
      }
    }
  }

  return {
    listingRepo,
    listingId,
    listingExternalId,
    listingInventoryId,
  };
}
