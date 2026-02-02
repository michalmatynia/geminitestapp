# Advanced Validation System

## Overview

This is a comprehensive, enterprise-grade validation system for Next.js applications with advanced features including caching, batch processing, real-time streaming, external service integration, and dynamic rule management.

## Features

### Core Validation
- **Type-safe schemas** with Zod integration
- **Async validation** with performance metrics
- **Configuration-based rules** with runtime customization
- **Field dependency validation**
- **Conditional validation logic**

### Advanced Features
- **Intelligent caching** with TTL and invalidation
- **Batch validation** with concurrency control
- **Real-time streaming** validation with SSE
- **External service integration** with retry logic
- **Dynamic rule engine** with priority-based execution
- **Performance monitoring** and health checks

## Quick Start

```typescript
import { validateProductCreate, setValidationConfig } from '@/features/products/validations';

// Basic validation
const result = await validateProductCreate({
  sku: 'PROD-001',
  name_en: 'Product Name',
  price: 99.99
});

if (result.success) {
  console.log('Valid product:', result.data);
} else {
  console.error('Validation errors:', result.errors);
}
```

## Configuration

```typescript
import { setValidationConfig } from '@/features/products/validations';

setValidationConfig({
  strictMode: true,
  requiredFields: ['sku', 'name_en', 'price'],
  fieldConstraints: {
    price: { min: 1, max: 10000 },
    sku: { pattern: /^[A-Z]{2,3}-\\d{3,4}$/ }
  },
  businessRules: [{
    name: 'premium_product_rule',
    condition: (data) => data.price > 500,
    validator: (data) => {
      if (!data.description_en) {
        return [{ field: 'description_en', message: 'Premium products need description', code: 'premium_rule' }];
      }
      return [];
    }
  }]
});
```

## Batch Validation

```typescript
import { validateProductsBatch } from '@/features/products/validations';

const products = [
  { sku: 'PROD-001', name_en: 'Product 1', price: 50 },
  { sku: 'PROD-002', name_en: 'Product 2', price: 75 }
];

const result = await validateProductsBatch(products, {
  concurrency: 5,
  stopOnFirstError: false,
  validateDuplicates: true
});

console.log(`${result.successful}/${result.total} products valid`);
```

## Real-time Streaming

```typescript
import { useStreamValidation } from '@/features/products/validations';

function ProductForm() {
  const { stream, startValidation } = useStreamValidation('product-form', {
    debounceMs: 300,
    onProgress: (stream) => console.log(`Progress: ${stream.progress}%`),
    onComplete: (stream) => console.log('Validation complete')
  });

  const handleChange = (data) => {
    startValidation(data, validateProductCreate);
  };

  return (
    <div>
      <div>Status: {stream.status}</div>
      <div>Progress: {stream.progress}%</div>
      {stream.errors.map(error => (
        <div key={error.field}>{error.message}</div>
      ))}
    </div>
  );
}
```

## Pipeline Validation

```typescript
import { createProductValidationPipeline } from '@/features/products/validations';

const pipeline = createProductValidationPipeline()
  .addStep({
    name: 'inventory_check',
    validator: async (data) => {
      // Custom validation logic
      return data.stock > 100 ? [{ field: 'stock', message: 'Exceeds capacity', code: 'inventory_limit' }] : [];
    },
    dependsOn: ['schema_validation']
  });

const result = await pipeline.execute(productData);
```

## External Service Integration

```typescript
import { externalValidationService, VALIDATION_PROVIDERS } from '@/features/products/validations';

// Register custom provider
externalValidationService.registerProvider({
  name: 'custom-validator',
  endpoint: 'https://api.example.com/validate',
  apiKey: 'your-api-key',
  timeout: 5000
});

// Validate with multiple providers
const result = await externalValidationService.validateWithMultipleProviders(
  ['business-rules', 'custom-validator'],
  { data: productData, validationType: 'product_create' },
  'majority' // Strategy: 'all', 'any', or 'majority'
);
```

## Dynamic Rule Management

```typescript
import { validationRuleEngine } from '@/features/products/validations';

// Add custom rule
validationRuleEngine.addRule({
  id: 'custom-rule',
  name: 'Custom Validation Rule',
  priority: 85,
  active: true,
  conditions: [
    { field: 'category', operator: 'eq', value: 'electronics' }
  ],
  conditionLogic: 'and',
  actions: [
    {
      type: 'error',
      field: 'warranty',
      message: 'Electronics must have warranty information',
      code: 'missing_warranty'
    }
  ]
});

// Execute rules
const context = { data: productData };
const ruleResults = validationRuleEngine.executeRules(context);
```

## API Integration

```typescript
// API Route with validation middleware
import { validateProductCreateMiddleware } from '@/features/products/validations';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  
  const validation = await validateProductCreateMiddleware(formData);
  if (!validation.success) {
    return validation.response;
  }

  // Process validated data
  const product = await createProduct(validation.data);
  return NextResponse.json(product);
}
```

## React Integration

```typescript
import { ValidationProvider, useProductCreateValidation } from '@/features/products/validations';

function App() {
  return (
    <ValidationProvider>
      <ProductForm />
    </ValidationProvider>
  );
}

function ProductForm() {
  const { validationState, validate, validateField } = useProductCreateValidation();
  
  const handleSubmit = async (formData) => {
    const result = await validate(formData);
    if (result.isValid) {
      // Submit form
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields with real-time validation */}
    </form>
  );
}
```

## Monitoring & Health

```typescript
import { getValidationHealth, validationMetrics } from '@/features/products/validations';

// Check system health
const health = getValidationHealth();
console.log('Status:', health.status); // 'healthy', 'degraded', or 'unhealthy'
console.log('Issues:', health.issues);

// Get performance metrics
const stats = validationMetrics.getStats();
console.log('Success rate:', stats.successRate);
console.log('Average duration:', stats.averageDuration);
```

## Performance Optimization

### Caching
```typescript
import { withCache, validationCache } from '@/features/products/validations';

// Automatic caching
const cachedValidator = withCache(
  validateProductCreate,
  (data) => `product:${data.sku}`,
  300000 // 5 minutes TTL
);

// Manual cache management
validationCache.invalidate('product:*'); // Clear product cache
```

### Metrics
```typescript
import { withMetrics } from '@/features/products/validations';

const monitoredValidator = withMetrics(
  myCustomValidator,
  'custom_validation'
);
```

## API Endpoints

- `POST /api/products/validation` - Batch validation
- `GET /api/products/validation` - Health check
- `GET /api/products/validation/stream/:id` - SSE stream
- `PUT /api/products/validation/stream/:id` - Start stream validation
- `DELETE /api/products/validation/stream/:id` - Cancel stream

## Best Practices

1. **Use appropriate validation level**: Basic for simple forms, pipeline for complex workflows
2. **Configure caching**: Enable for frequently validated data
3. **Monitor performance**: Use metrics to identify bottlenecks
4. **Handle errors gracefully**: Provide clear user feedback
5. **Use streaming for large forms**: Better UX with real-time feedback
6. **Batch validate imports**: More efficient for bulk operations
7. **Configure rules dynamically**: Adapt validation to business needs

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Schemas       │    │   Validators     │    │   Middleware    │
│   (Zod-based)   │────│   (Core Logic)   │────│   (API Layer)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Configuration │    │   Rule Engine    │    │   Streaming     │
│   (Runtime)     │────│   (Dynamic)      │────│   (Real-time)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Caching       │    │   Batch          │    │   External      │
│   (Performance) │────│   (Bulk Ops)     │────│   (Services)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Metrics & Monitoring                        │
└─────────────────────────────────────────────────────────────────┘
```

This validation system provides enterprise-grade capabilities while maintaining simplicity for basic use cases.