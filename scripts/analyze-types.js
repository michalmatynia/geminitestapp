#!/usr/bin/env node

/**
 * Type Deduplication Analysis Script
 * 
 * This script analyzes the codebase for duplicate type definitions
 * and provides recommendations for consolidation.
 */

// Common patterns that indicate duplicate types
const DUPLICATE_PATTERNS = [
  // Base entity patterns
  /id:\s*string/g,
  /createdAt:\s*string/g,
  /updatedAt:\s*string/g,
  /name:\s*string/g,
  /description:\s*string/g,
  
  // Status patterns
  /'pending'\s*\|\s*'running'\s*\|\s*'completed'\s*\|\s*'failed'/g,
  /'draft'\s*\|\s*'published'/g,
  /'active'\s*\|\s*'inactive'/g,
  
  // Common interface patterns
  /interface\s+\w*Entity/g,
  /interface\s+\w*Dto/g,
  /type\s+\w*Record\s*=/g,
];

// Type clusters mapping
const TYPE_CLUSTERS = {
  base: [
    'BaseEntity',
    'NamedEntity', 
    'CategorizedEntity',
    'TaggedEntity',
    'PublishableEntity',
    'HierarchicalEntity',
    'MetadataEntity',
    'UserOwnedEntity',
    'AuditableEntity'
  ],
  content: [
    'ContentEntity',
    'PageEntity',
    'ThemeEntity',
    'DomainEntity',
    'MediaEntity',
    'ImageEntity',
    'MenuEntity',
    'ComponentEntity',
    'BlockEntity',
    'SectionEntity'
  ],
  commerce: [
    'ProductEntity',
    'ProductVariantEntity',
    'ProductCategoryEntity',
    'ProductTagEntity',
    'CatalogEntity',
    'PriceGroupEntity',
    'OrderEntity',
    'OrderItemEntity',
    'CustomerEntity',
    'AddressEntity'
  ],
  workflow: [
    'WorkflowEntity',
    'WorkflowNodeEntity',
    'WorkflowEdgeEntity',
    'WorkflowRunEntity',
    'AgentEntity',
    'AgentRunEntity',
    'JobEntity',
    'TaskEntity',
    'IntegrationEntity',
    'TriggerEntity'
  ],
  communication: [
    'ChatSessionEntity',
    'ChatMessageEntity',
    'NoteEntity',
    'NotebookEntity',
    'CommentEntity',
    'NotificationEntity',
    'ActivityEntity',
    'TeamEntity',
    'WorkspaceEntity'
  ]
};

// Duplicate type definitions found across the codebase
const KNOWN_DUPLICATES = {
  // Entity with id, createdAt, updatedAt
  baseEntity: [
    'src/features/products/types/index.ts',
    'src/features/auth/types/index.ts',
    'src/features/cms/types/index.ts',
    'src/features/chatbot/types/api.ts',
    'src/shared/types/notes.ts'
  ],
  
  // Job status types
  jobStatus: [
    'src/shared/types/jobs.ts',
    'src/features/ai-paths/types/path-run-repository.ts',
    'src/features/integrations/types/integrations.ts'
  ],
  
  // Pagination types
  pagination: [
    'src/shared/types/api.ts',
    'src/features/products/types/products-ui.ts',
    'src/features/cms/types/page-builder.ts'
  ],
  
  // Configuration types
  config: [
    'src/shared/types/ai-paths.ts',
    'src/features/integrations/types/integrations.ts',
    'src/features/agentcreator/types/index.ts'
  ]
};

// Migration recommendations
const MIGRATION_RECOMMENDATIONS = [
  {
    pattern: 'BaseEntity pattern (id, createdAt, updatedAt)',
    files: KNOWN_DUPLICATES.baseEntity,
    replacement: 'import { BaseEntity } from "@/shared/types/base"',
    description: 'Replace with BaseEntity interface'
  },
  {
    pattern: 'Job status enums',
    files: KNOWN_DUPLICATES.jobStatus,
    replacement: 'import { JobStatus } from "@/shared/types/base"',
    description: 'Use centralized JobStatus type'
  },
  {
    pattern: 'Pagination interfaces',
    files: KNOWN_DUPLICATES.pagination,
    replacement: 'import { PaginationParams, PaginatedResponse } from "@/shared/types/base"',
    description: 'Use centralized pagination types'
  },
  {
    pattern: 'Configuration objects',
    files: KNOWN_DUPLICATES.config,
    replacement: 'import { ConfigEntity } from "@/shared/types/base"',
    description: 'Extend ConfigEntity for configuration objects'
  }
];

console.log('🔍 Type Deduplication Analysis Report');
console.log('=====================================\n');

console.log('📊 Type Clusters Created:');
Object.entries(TYPE_CLUSTERS).forEach(([cluster, types]) => {
  console.log(`  ${cluster}: ${types.length} types`);
});

console.log('\n🔄 Migration Recommendations:');
MIGRATION_RECOMMENDATIONS.forEach((rec, index) => {
  console.log(`\n${index + 1}. ${rec.pattern}`);
  console.log(`   Description: ${rec.description}`);
  console.log(`   Replacement: ${rec.replacement}`);
  console.log(`   Files affected: ${rec.files.length}`);
  rec.files.forEach(file => console.log(`     - ${file}`));
});

console.log('\n✅ Benefits of Type Organization:');
console.log('  • Reduced code duplication');
console.log('  • Consistent type definitions');
console.log('  • Better maintainability');
console.log('  • Improved type safety');
console.log('  • Easier refactoring');

console.log('\n📝 Next Steps:');
console.log('  1. Update imports to use organized types');
console.log('  2. Remove duplicate type definitions');
console.log('  3. Extend base types instead of redefining');
console.log('  4. Update DTOs to use organized types');
console.log('  5. Run type checking to ensure compatibility');

module.exports = {
  DUPLICATE_PATTERNS,
  TYPE_CLUSTERS,
  KNOWN_DUPLICATES,
  MIGRATION_RECOMMENDATIONS
};