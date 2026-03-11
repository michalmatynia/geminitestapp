export const prismaIntegrationTestFiles = [];

export const mongoIntegrationTestFiles = [
  '__tests__/features/cms/services/mongo-cms-repository.test.ts',
  '__tests__/features/notesapp/services/mongo-note-repository.test.ts',
  '__tests__/features/products/services/mongo-parameter-repository.test.ts',
  '__tests__/features/products/services/mongo-product-repository.test.ts',
  '__tests__/features/products/services/mongo-product-canonical-shape-guard.test.ts',
  '__tests__/features/ai/ai-paths/runtime/handlers/integration-database-mongo-update-plan-helpers.test.ts',
  'src/shared/lib/ai-paths/core/runtime/handlers/__tests__/integration-database-mongo-delete-action.test.ts',
  'src/shared/lib/ai-paths/core/runtime/handlers/__tests__/integration-database-mongo-update-action.test.ts',
  'src/shared/lib/ai-paths/core/runtime/handlers/__tests__/integration-database-mongo-update-plan.test.ts',
  'src/shared/lib/products/services/product-repository/__tests__/mongo-product-repository-mappers.test.ts',
];

export const dbSpecificUnitTestFiles = [
  '__tests__/features/database/utils/mongo.test.ts',
  '__tests__/features/drafter/services/draft-repository-mongo.test.ts',
  '__tests__/features/integrations/services/category-mapping-repository-mongo.test.ts',
  '__tests__/features/products/services/prisma-category-repository.test.ts',
  'src/features/kangur/services/kangur-score-repository/mongo-kangur-score-repository.test.ts',
  'src/features/kangur/services/kangur-score-repository/prisma-kangur-score-repository.test.ts',
  'src/shared/lib/ai-paths/core/runtime/handlers/__tests__/integration-database-mongo-update-plan.legacy.test.ts',
  'src/shared/lib/db/mongo-write-retry.test.ts',
  'src/shared/lib/products/services/product-repository/mongo-product-repository.helpers.test.ts',
  'src/shared/lib/products/services/product-repository/prisma-product-repository.helpers.test.ts',
];

export const isDbSpecificPrismaTestFile = (filePath) =>
  /(?:^|\/)[^/]*prisma[^/]*\.test\.(?:ts|tsx)$/.test(filePath);

export const isDbSpecificMongoTestFile = (filePath) =>
  /(?:^|\/)[^/]*mongo[^/]*\.test\.(?:ts|tsx)$/.test(filePath);
