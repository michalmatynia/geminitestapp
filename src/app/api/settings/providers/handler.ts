import { type NextRequest, NextResponse } from 'next/server';

import { getAuthDataProvider, requireAuthProvider } from '@/features/auth/server';
import { AUTH_SETTINGS_KEYS } from '@/features/auth/server';
import type {
  AppProviderDiagnostics as ProviderDiagnosticsResponse,
  AppProviderServiceStatus as ProviderServiceStatus,
  AppProviderSource as ProviderSource,
  AppProviderValue as ProviderValue,
} from '@/shared/contracts/system';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { assertSettingsManageAccess } from '@/features/auth/server';
import { getCmsDataProvider } from '@/shared/lib/cms/services/cms-provider';
import {
  APP_DB_PROVIDER_SETTING_KEY,
  getAppDbProvider,
  type AppDbProvider,
} from '@/shared/lib/db/app-db-provider';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { applyActiveMongoSourceEnv } from '@/shared/lib/db/mongo-source';
import { getIntegrationDataProvider } from '@/shared/lib/integrations/services/integration-provider';
import { PRODUCT_DB_PROVIDER_SETTING_KEY } from '@/shared/lib/products/constants';
import { getProductDataProvider } from '@/shared/lib/products/services/product-provider';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


const normalizeProvider = (value?: string | null): AppDbProvider | null => {
  if (!value) return null;
  return value.toLowerCase().trim() === 'mongodb' ? 'mongodb' : null;
};

const readMongoSetting = async (key: string): Promise<string | null> => {
  await applyActiveMongoSourceEnv();
  if (!process.env['MONGODB_URI']) return null;
  try {
    const mongo = await getMongoDb();
    const doc = await mongo
      .collection<{ _id: string; key?: string; value?: string }>('settings')
      .findOne({ $or: [{ _id: key }, { key }] });
    return typeof doc?.value === 'string' ? doc.value : null;
  } catch (error) {
    void ErrorSystem.captureException(error);
    return null;
  }
};

const buildWarnings = (services: ProviderServiceStatus[]): string[] => {
  const warnings: string[] = [];
  services.forEach((status) => {
    if (status.driftFromApp) {
      warnings.push(
        `${status.service} provider drift: configured/effective is ${status.effective.toUpperCase()} while app provider is different.`
      );
    }
    status.notes.forEach((note) => warnings.push(`${status.service}: ${note}`));
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

export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await assertSettingsManageAccess();
  await applyActiveMongoSourceEnv();

  const hasMongoUri = Boolean(process.env['MONGODB_URI']);
  const appDbProviderEnv = process.env['APP_DB_PROVIDER']?.trim() || null;
  const authDbProviderEnv = process.env['AUTH_DB_PROVIDER']?.trim() || null;

  const envAppProvider = normalizeProvider(appDbProviderEnv);
  const appMongoSetting = normalizeProvider(await readMongoSetting(APP_DB_PROVIDER_SETTING_KEY));
  const appConfigured = envAppProvider ?? appMongoSetting;
  const appConfiguredSource: ProviderSource | null = envAppProvider
    ? 'env'
    : appMongoSetting
      ? 'mongo-setting'
      : null;
  const appEffective = await getAppDbProvider();

  const envAuthProvider = normalizeProvider(authDbProviderEnv);
  const authMongoSetting = normalizeProvider(await readMongoSetting(AUTH_SETTINGS_KEYS.provider));
  const authConfigured = envAuthProvider ?? authMongoSetting ?? 'mongodb';
  const authConfiguredSource: ProviderSource = envAuthProvider
    ? 'env'
    : authMongoSetting
      ? 'mongo-setting'
      : 'default';
  const authEffective = requireAuthProvider(await getAuthDataProvider());
  const authIntentionalOverride = isIntentionalServiceOverride(
    appEffective,
    authConfigured,
    authConfiguredSource,
    authEffective
  );

  const productMongoSetting = normalizeProvider(
    await readMongoSetting(PRODUCT_DB_PROVIDER_SETTING_KEY)
  );
  const productConfigured = productMongoSetting ?? 'mongodb';
  const productConfiguredSource: ProviderSource = productMongoSetting
    ? 'mongo-setting'
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
  if (!hasMongoUri) {
    warnings.push('MONGODB_URI is missing.');
  }

  const payload: ProviderDiagnosticsResponse = {
    timestamp: new Date().toISOString(),
    env: {
      hasDatabaseUrl: false,
      hasMongoUri,
      appDbProviderEnv,
    },
    services,
    driftCount: services.filter((status) => status.driftFromApp).length,
    warningCount: warnings.length,
    warnings,
  };

  return NextResponse.json(payload, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
