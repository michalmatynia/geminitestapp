export const DATABASE_ENGINE_POLICY_KEY = 'database_engine_policy_v1';
export const DATABASE_ENGINE_SERVICE_ROUTE_MAP_KEY = 'database_engine_service_route_map_v1';
export const DATABASE_ENGINE_COLLECTION_ROUTE_MAP_KEY = 'database_engine_collection_route_map_v1';

export type DatabaseEngineProvider = 'prisma' | 'mongodb' | 'redis';
export type DatabaseEnginePrimaryProvider = 'prisma' | 'mongodb';

export type DatabaseEngineServiceRoute =
  | 'app'
  | 'auth'
  | 'product'
  | 'integrations'
  | 'cms';

export type DatabaseEnginePolicy = {
  requireExplicitServiceRouting: boolean;
  requireExplicitCollectionRouting: boolean;
  allowAutomaticFallback: boolean;
  allowAutomaticBackfill: boolean;
  allowAutomaticMigrations: boolean;
  strictProviderAvailability: boolean;
};

export const DEFAULT_DATABASE_ENGINE_POLICY: DatabaseEnginePolicy = {
  requireExplicitServiceRouting: false,
  requireExplicitCollectionRouting: false,
  allowAutomaticFallback: true,
  allowAutomaticBackfill: true,
  allowAutomaticMigrations: true,
  strictProviderAvailability: false,
};

