import {
  getIntegrationRepository,
  getProductListingRepository,
} from '@/features/integrations/server';
import type { AiPathRunRepository } from '@/shared/contracts/ai-paths';
import { getPathRunRepository } from '@/shared/lib/ai-paths/services/path-run-repository';
import { readOptionalServerAuthSession } from '@/shared/lib/auth/optional-server-auth';
import { getProductRepository } from '@/shared/lib/products/services/product-repository';

import { BASE_EXPORT_RUN_PATH_ID, BASE_EXPORT_RUN_PATH_NAME } from './constants';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


export async function loadExportResources(productId: string, connectionId: string) {
  const [productRepo, integrationRepo, primaryListingRepo] = await Promise.all([
    getProductRepository(),
    getIntegrationRepository(),
    getProductListingRepository(),
  ]);

  const [product, connection, integrations, session] = await Promise.all([
    productRepo.getProductById(productId),
    integrationRepo.getConnectionById(connectionId),
    integrationRepo.listIntegrations(),
    readOptionalServerAuthSession(),
  ]);

  return {
    product,
    connection,
    integrations,
    session,
    productRepo,
    integrationRepo,
    primaryListingRepo,
  };
}

export async function createExportRun(args: {
  userId: string | null;
  productId: string;
  connectionId: string;
  inventoryId: string;
  imagesOnly: boolean;
  templateId: string | null;
  runMeta: Record<string, unknown>;
}) {
  const runRepository = await getPathRunRepository();
  const runMetaSourceInfoRaw = args.runMeta['sourceInfo'];
  const runMetaSourceInfo =
    runMetaSourceInfoRaw && typeof runMetaSourceInfoRaw === 'object'
      ? (runMetaSourceInfoRaw as Record<string, unknown>)
      : {};

  const run = await runRepository.createRun({
    userId: args.userId,
    pathId: BASE_EXPORT_RUN_PATH_ID,
    pathName: BASE_EXPORT_RUN_PATH_NAME,
    triggerEvent: 'export_to_base',
    triggerNodeId: `product:${args.productId}`,
    entityId: args.productId,
    entityType: 'product',
    meta: {
      ...args.runMeta,
      sourceInfo: {
        ...runMetaSourceInfo,
        productId: args.productId,
        connectionId: args.connectionId,
        inventoryId: args.inventoryId,
        imagesOnly: args.imagesOnly,
      },
      templateId: args.templateId,
      imagesOnly: args.imagesOnly,
    },
    maxAttempts: 1,
    retryCount: 0,
  });

  return { run, runRepository };
}

export async function updateRunStarted(
  runRepository: AiPathRunRepository,
  runId: string,
  metadata: Record<string, unknown>
) {
  try {
    await runRepository.updateRun(runId, {
      status: 'running',
      startedAt: new Date().toISOString(),
    });
    await runRepository.createRunEvent({
      runId,
      level: 'info',
      message: 'Export to Base.com started.',
      metadata,
    });
  } catch (error) {
    void ErrorSystem.captureException(error);
  
    // Resilient
  }
}
