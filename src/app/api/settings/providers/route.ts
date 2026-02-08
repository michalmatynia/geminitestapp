export const runtime = 'nodejs';

import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import { getAuthDataProvider, requireAuthProvider } from '@/features/auth/services/auth-provider';
import { AUTH_SETTINGS_KEYS } from '@/features/auth/utils/auth-management';
import { getCmsDataProvider } from '@/features/cms/services/cms-provider';
import { getIntegrationDataProvider } from '@/features/integrations/services/integration-provider';
import { PRODUCT_DB_PROVIDER_SETTING_KEY } from '@/features/products/constants';
import { getProductDataProvider } from '@/features/products/services/product-provider';
import { apiHandler } from '@/shared/lib/api/api-handler';
import {
  APP_DB_PROVIDER_SETTING_KEY,
  getAppDbProvider,
  type AppDbProvider,
} from '@/shared/lib/db/app-db-provider';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';
import type { ApiHandlerContext } from '@/shared/types/api';
import type {
  AppProviderValueDto as ProviderValue,
  AppProviderSourceDto as ProviderSource,
  AppProviderServiceDto as ProviderService,
  AppProviderServiceStatusDto as ProviderServiceStatus,
  AppProviderDiagnosticsDto as ProviderDiagnosticsResponse,
} from '@/shared/dtos/system';

const normalizeAppProvider = (value?: string | null): AppDbProvider | null => {
  if (!value) return null;
  return value.toLowerCase().trim() === 'mongodb' ? 'mongodb' : 'prisma';
};

const normalizeProductProvider = (value?: string | null): ProviderValue | null => {
  if (!value) return null;
  return value.toLowerCase().trim() === 'mongodb' ? 'mongodb' : 'prisma';
};

const normalizeAuthProvider = (value?: string | null): ProviderValue | null => {
  if (!value) return null;
  return value.toLowerCase().trim() === 'prisma' ? 'prisma' : 'mongodb';
};

const isPrismaMissingTableError = (
  error: unknown
): error is Prisma.PrismaClientKnownRequestError =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  (error.code === 'P2021' || error.code === 'P2022');

const readPrismaSetting = async (key: string): Promise<string | null> => {
  if (!process.env['DATABASE_URL'] || !('setting' in prisma)) return null;
  try {
    const setting = await prisma.setting.findUnique({
      where: { key },
      select: { value: true },
    });
    return typeof setting?.value === 'string' ? setting.value : null;
  } catch (error) {
    if (isPrismaMissingTableError(error)) return null;
    return null;
  }
};

const readMongoSetting = async (key: string): Promise<string | null> => {
  if (!process.env['MONGODB_URI']) return null;
  try {
    const mongo = await getMongoDb();
    const doc = await mongo
      .collection<{ _id: string; key?: string; value?: string }>('settings')
      .findOne({ $or: [{ _id: key }, { key }] });
    return typeof doc?.value === 'string' ? doc.value : null;
  } catch {
    return null;
  }
};

const buildWarnings = (services: ProviderServiceStatus[]): string[] => {
  const warnings: string[] = [];
  services.forEach((status: ProviderServiceStatus) => {
    if (status.driftFromApp) {
      warnings.push(
        `${status.service} provider drift: configured/effective is ${status.effective.toUpperCase()} while app provider is different.`
      );
    }
    status.notes.forEach((note: string) => warnings.push(`${status.service}: ${note}`));
  });
  return warnings;
};

const isIntentionalServiceOverride = (
  appEffective: ProviderValue,
  configured: ProviderValue | null,
  configuredSource: ProviderSource | null,
  effective: ProviderValue
): boolean => {
  if (!configured || !configuredSource) return false;
  if (configuredSource === 'default' || configuredSource === 'derived') return false;
  return configured === effective && effective !== appEffective;
};

async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const hasDatabaseUrl = Boolean(process.env['DATABASE_URL']);
  const hasMongoUri = Boolean(process.env['MONGODB_URI']);
  const appDbProviderEnv = process.env['APP_DB_PROVIDER']?.trim() || null;

  const appPrismaSetting = normalizeAppProvider(await readPrismaSetting(APP_DB_PROVIDER_SETTING_KEY));
  const appMongoSetting = normalizeAppProvider(await readMongoSetting(APP_DB_PROVIDER_SETTING_KEY));
  const envAppProvider = normalizeAppProvider(appDbProviderEnv);
  const appConfigured = envAppProvider ?? appPrismaSetting ?? appMongoSetting;
  const appConfiguredSource: ProviderSource | null = envAppProvider
    ? 'env'
    : appPrismaSetting
      ? 'prisma-setting'
      : appMongoSetting
        ? 'mongo-setting'
        : null;
  const appEffective = await getAppDbProvider();

  const authMongoSetting = normalizeAuthProvider(await readMongoSetting(AUTH_SETTINGS_KEYS.provider));
  const authPrismaSetting = normalizeAuthProvider(await readPrismaSetting(AUTH_SETTINGS_KEYS.provider));
  const authConfigured = authMongoSetting ?? authPrismaSetting ?? (hasMongoUri ? 'mongodb' : 'prisma');
  const authConfiguredSource: ProviderSource = authMongoSetting
    ? 'mongo-setting'
    : authPrismaSetting
      ? 'prisma-setting'
      : 'default';
  const authResolved = await getAuthDataProvider();
  const authEffective = requireAuthProvider(authResolved);
  const authIntentionalOverride = isIntentionalServiceOverride(
    appEffective,
    authConfigured,
    authConfiguredSource,
    authEffective
  );

  const productMongoSetting = normalizeProductProvider(
    await readMongoSetting(PRODUCT_DB_PROVIDER_SETTING_KEY)
  );
  const productPrismaSetting = normalizeProductProvider(
    await readPrismaSetting(PRODUCT_DB_PROVIDER_SETTING_KEY)
  );
  const productConfigured =
    appEffective === 'prisma'
      ? (productPrismaSetting ?? 'prisma')
      : (productMongoSetting ?? productPrismaSetting ?? 'mongodb');
  const productConfiguredSource: ProviderSource =
    appEffective === 'prisma'
      ? (productPrismaSetting ? 'prisma-setting' : 'derived')
      : productMongoSetting
        ? 'mongo-setting'
        : productPrismaSetting
          ? 'prisma-setting'
          : 'derived';
  const productEffective = await getProductDataProvider();
  const productIntentionalOverride = isIntentionalServiceOverride(
    appEffective,
    productConfigured,
    productConfiguredSource,
    productEffective
  );

  const integrationsEffective = await getIntegrationDataProvider();
  const cmsEffective = await getCmsDataProvider();

  const services: ProviderServiceStatus[] = [
    {
      service: 'app',
      configured: appConfigured,
      configuredSource: appConfiguredSource,
      effective: appEffective,
      driftFromApp: false,
      notes:
        appConfigured && appConfigured !== appEffective
          ? ['configured app provider differs from effective due connection fallback.']
          : [],
    },
    {
      service: 'auth',
      configured: authConfigured,
      configuredSource: authConfiguredSource,
      effective: authEffective,
      driftFromApp: authEffective !== appEffective && !authIntentionalOverride,
      notes:
        authConfigured !== authEffective
          ? ['configured auth provider differs from effective due connection fallback.']
          : [],
    },
    {
      service: 'product',
      configured: productConfigured,
      configuredSource: productConfiguredSource,
      effective: productEffective,
      driftFromApp: productEffective !== appEffective && !productIntentionalOverride,
      notes:
        productConfigured !== productEffective
          ? ['configured product provider differs from effective due connection fallback.']
          : [],
    },
    {
      service: 'integrations',
      configured: appEffective,
      configuredSource: 'derived',
      effective: integrationsEffective,
      driftFromApp: integrationsEffective !== appEffective,
      notes: [],
    },
    {
      service: 'cms',
      configured: appEffective,
      configuredSource: 'derived',
      effective: cmsEffective,
      driftFromApp: cmsEffective !== appEffective,
      notes: [],
    },
  ];

  const warnings = buildWarnings(services);
  if (!hasDatabaseUrl) {
    warnings.push('DATABASE_URL is missing.');
  }
  if (!hasMongoUri) {
    warnings.push('MONGODB_URI is missing.');
  }

  const payload: ProviderDiagnosticsResponse = {
    timestamp: new Date().toISOString(),
    env: {
      hasDatabaseUrl,
      hasMongoUri,
      appDbProviderEnv,
    },
    services,
    driftCount: services.filter((status: ProviderServiceStatus) => status.driftFromApp).length,
    warningCount: warnings.length,
    warnings,
  };

  return NextResponse.json(payload, {
    headers: { 'Cache-Control': 'no-store' },
  });
}

export const GET = apiHandler(GET_handler, {
  source: 'settings.providers.GET',
});
