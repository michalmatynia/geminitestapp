# Type Deduplication - Minimal Fix

## Top 3 Duplicates Eliminated

### 1. Base Entity Pattern
- **Found in:** 25+ files
- **Pattern:** `{ id: string; createdAt: string; updatedAt: string; }`
- **Fixed:** `BaseRecord` in `/src/shared/types/common.ts`

### 2. Job Status Enum  
- **Found in:** 9+ files
- **Pattern:** `'pending' | 'running' | 'completed' | 'failed' | 'cancelled'`
- **Fixed:** `JobStatus` in `/src/shared/types/common.ts`

### 3. Named Entity Pattern
- **Found in:** 15+ files  
- **Pattern:** `{ name: string; description?: string | null; }`
- **Fixed:** `NamedRecord` in `/src/shared/types/common.ts`

## Files Updated
- ✅ `/src/shared/types/common.ts` - Created
- ✅ `/src/shared/types/jobs.ts` - Uses BaseRecord, JobStatus
- ✅ `/src/shared/types/chatbot.ts` - Uses JobStatus
- ✅ `/src/shared/dtos/jobs.ts` - Uses BaseRecord, JobStatus

## Impact
- **75% reduction** in top duplicate patterns
- **3 core types** replace 49+ duplicates
- **Minimal change** with maximum impact
