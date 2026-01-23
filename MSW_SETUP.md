# MSW 2.0 Setup Guide

## Overview
Mock Service Worker (MSW) is a library for mocking HTTP requests during development and testing. MSW 2.0 has been installed and configured for your Next.js application.

## Installation

MSW 2.0 has been installed as a dev dependency:
```bash
npm install msw@2.0.0 --save-dev --legacy-peer-deps
```

## File Structure

```
mocks/
├── handlers.ts        # API request handlers
├── browser.ts         # Browser setup
├── server.ts          # Node.js/Vitest setup
└── __tests__/
    └── handlers.test.ts  # Example tests using MSW
```

## Configuration

### 1. Handlers (`mocks/handlers.ts`)
Defines all mock API responses:

```typescript
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/products', () => {
    return HttpResponse.json({ /* mock data */ });
  }),
  // ... more handlers
];
```

**Available HTTP methods:**
- `http.get()`
- `http.post()`
- `http.put()`
- `http.patch()`
- `http.delete()`
- `http.head()`

### 2. Browser Setup (`mocks/browser.ts`)
For development:

```typescript
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);
```

### 3. Server Setup (`mocks/server.ts`)
For Node.js testing:

```typescript
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

### 4. Vitest Integration (`vitest.setup.ts`)
Automatically starts the MSW server:

```typescript
import { beforeAll, afterEach, afterAll } from 'vitest';
import { server } from './mocks/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

## Using MSW in Tests

### Basic Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

describe('API Tests', () => {
  it('should fetch products', async () => {
    const response = await fetch('/api/products');
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.data).toBeDefined();
  });
});
```

### Override Handlers in Tests

```typescript
it('should handle custom response', async () => {
  server.use(
    http.get('/api/products', () => {
      return HttpResponse.json({ custom: 'data' });
    })
  );
  
  const response = await fetch('/api/products');
  // Uses the overridden handler
});
```

### Test Error Scenarios

```typescript
it('should handle errors', async () => {
  server.use(
    http.get('/api/products', () => {
      return HttpResponse.json(
        { error: 'Server error' },
        { status: 500 }
      );
    })
  );
  
  const response = await fetch('/api/products');
  expect(response.status).toBe(500);
});
```

## Mock Data

The default handlers include mock data for:

### Products
- 2 sample products with multilingual names
- CRUD operations (GET, POST, PUT, DELETE)

```json
{
  "id": "1",
  "name_en": "Sample Product 1",
  "name_pl": "Przykładowy Produkt 1",
  "name_de": "Beispielprodukt 1",
  "sku": "SKU-001",
  "price": 29.99
}
```

### Catalogs
- 2 sample catalogs
- GET single and multiple

```json
{
  "id": "1",
  "name": "Main Catalog",
  "description": "Main product catalog"
}
```

### Settings
- 2 sample settings
- GET and POST operations

```json
{
  "key": "SITE_NAME",
  "value": "My Store"
}
```

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- mocks/__tests__/handlers.test.ts

# Run with UI
npm run test:ui

# Run with coverage
npm run test:coverage
```

## Adding New Handlers

1. Open `mocks/handlers.ts`
2. Add a new handler:

```typescript
http.get('/api/new-endpoint', () => {
  return HttpResponse.json({ /* mock data */ });
}),
```

3. Use in tests or development

## Handler Patterns

### Path Parameters
```typescript
http.get('/api/products/:id', ({ params }) => {
  return HttpResponse.json({ id: params.id });
})
```

### Query Parameters
```typescript
http.get('/api/products', ({ request }) => {
  const url = new URL(request.url);
  const page = url.searchParams.get('page');
  return HttpResponse.json({ page });
})
```

### Request Body
```typescript
http.post('/api/products', async ({ request }) => {
  const body = await request.json();
  return HttpResponse.json({ created: body });
})
```

### Custom Headers
```typescript
http.get('/api/products', () => {
  return HttpResponse.json(
    { data: [] },
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Custom-Header': 'value',
      },
    }
  );
})
```

## Advanced Features

### Delayed Responses
```typescript
http.get('/api/products', async () => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  return HttpResponse.json({ data: [] });
})
```

### Conditional Responses
```typescript
http.get('/api/products/:id', ({ params }) => {
  if (params.id === 'error') {
    return HttpResponse.json(
      { error: 'Not found' },
      { status: 404 }
    );
  }
  return HttpResponse.json({ id: params.id });
})
```

### Request Inspection
```typescript
http.post('/api/products', async ({ request }) => {
  const body = await request.json();
  const headers = Object.fromEntries(request.headers);
  
  console.log('Request:', { body, headers });
  return HttpResponse.json({ success: true });
})
```

## Best Practices

1. **Keep handlers organized**
   - Group by feature/endpoint
   - Use descriptive names

2. **Use realistic mock data**
   - Match your actual API responses
   - Include all required fields

3. **Test edge cases**
   - Override handlers for error scenarios
   - Test 404, 500, validation errors

4. **Reset handlers between tests**
   - Vitest automatically does this in `afterEach`
   - Ensures test isolation

5. **Use TypeScript**
   - Type request bodies
   - Type response data

## Troubleshooting

### "No unhandled request" Error
The handler isn't defined. Add it to `mocks/handlers.ts`

### Handler Not Being Used
Check if it's defined before the test runs. Handlers registered with `server.use()` override default handlers.

### Tests Hanging
Make sure the MSW server starts before tests. It's configured in `vitest.setup.ts`

## Example Test Suite

See `mocks/__tests__/handlers.test.ts` for a complete example including:
- GET single resource
- GET multiple resources
- POST (create)
- PUT (update)
- DELETE
- Error handling
- Handler overrides

## Resources

- [MSW Official Documentation](https://mswjs.io/)
- [MSW Examples](https://github.com/mswjs/examples)
- [HTTP Handlers Guide](https://mswjs.io/docs/api/setup-server)

## Next Steps

1. **Review example tests** in `mocks/__tests__/handlers.test.ts`
2. **Add more endpoints** as needed to `mocks/handlers.ts`
3. **Use MSW in your tests** for reliable, isolated testing
4. **Configure handlers** for your specific API endpoints

---

**MSW 2.0 Setup Complete ✅**
