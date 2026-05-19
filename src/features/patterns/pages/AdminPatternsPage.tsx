import { type JSX } from 'react';

import { AdminPatternsPageView } from '@/features/patterns/components/AdminPatternsPageView';
import {
  listPatternProducts,
} from '@/features/patterns/server/patterns-repository';
import {
  resolvePatternsMongoConnectionInfo,
} from '@/features/patterns/server/patterns-mongo-client';
import type { PatternProduct } from '@/features/patterns/types';

const redactMongoUri = (uri: string): string => uri.replace(/\/\/([^:@/]+):([^@/]+)@/, '//***:***@');

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Unable to load patterns.';

export async function AdminPatternsPage(): Promise<JSX.Element> {
  const connection = resolvePatternsMongoConnectionInfo();
  let initialPatterns: PatternProduct[] = [];
  let initialError: string | null = null;

  try {
    initialPatterns = await listPatternProducts();
  } catch (error) {
    initialError = errorMessage(error);
  }

  return (
    <AdminPatternsPageView
      initialPatterns={initialPatterns}
      initialError={initialError}
      databaseName={connection.dbName}
      databaseUri={redactMongoUri(connection.uri)}
    />
  );
}
