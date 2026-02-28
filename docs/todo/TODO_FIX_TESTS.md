# Test Fixes TODO List

## Issue Analysis Summary

### 1. Products API Tests (`__tests__/api/products/products.test.ts`)

- **Problem**: Missing Prisma mock, causing "The column `(not available)` does not exist" errors
- **Root cause**: Tests use real prisma client without proper mocking
- **Fix needed**: Add proper Prisma mock similar to other test files

### 2. TOTP Tests (`__tests__/features/auth/totp.test.ts`)

- **Problem**: 4 failing tests related to TOTP generation and verification
- **Root cause**: Mocking issues with crypto.randomBytes and HMAC producing unpredictable results
- **Fix needed**: Update mocks to be more deterministic

### 3. Page Builder Tests (`__tests__/features/cms/hooks/usePageBuilderContext.test.tsx`)

- **Problem**: 2 failing tests
  - "should handle Grid columns (special case)" - expected 1 to be 2
  - "should handle reordering sections within zones" - expected 'RichText' to be 'Grid'
- **Fix needed**: Investigate and fix the assertions

### 4. AiPathRunRepository Test (`__tests__/features/ai-paths/services/path-run-repository.test.ts`)

- **Problem**: "should list runs with filters" - expected +0 to be 1
- **Fix needed**: Check filter logic

---

## Fix Plan

### Step 1: Fix Products API Tests

- Add Prisma mock at the top of the test file
- Mock all necessary Prisma models (product, productImage, imageFile, etc.)
- Mock the api-handler module
- Mock the product-repository to return predictable data

### Step 2: Fix TOTP Tests

- Update the crypto mock to return deterministic values
- Adjust the TOTP verification tests to work with mocked values

### Step 3: Fix Page Builder Tests

- Debug the Grid columns test
- Debug the reordering test

### Step 4: Fix AiPathRunRepository Test

- Check the filter logic in the test

---

## Progress

- [x] Step 1: Fix Products API Tests
- [x] Step 2: Fix TOTP Tests
- [x] Step 3: Fix Page Builder Tests
- [x] Step 4: Fix AiPathRunRepository Test
- [x] Run tests to verify all fixes
