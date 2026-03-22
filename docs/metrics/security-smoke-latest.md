---
owner: 'Platform Team'
last_reviewed: '2026-03-22'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Security Smoke Report

Generated at: 2026-03-22T08:21:24.324Z

## Summary

- Suites: 5
- Passed: 5
- Failed: 0

## Suite Status

| Suite | Status | Duration | Exit | Tests |
| --- | --- | ---: | ---: | --- |
| Auth Security Policy | PASS | 6.5s | 0 | `__tests__/features/auth/utils/auth-security.test.ts` |
| Auth Encryption | PASS | 6.8s | 0 | `__tests__/features/auth/utils/auth-encryption.test.ts` |
| Auth Verify Credentials API | PASS | 9.5s | 0 | `__tests__/features/auth/api/verify-credentials.test.ts` |
| AI Paths Access Rate Limit | PASS | 8.5s | 0 | `src/features/ai/ai-paths/server/__tests__/access.rate-limit.test.ts` |
| Observability Log Redaction | PASS | 5.1s | 0 | `__tests__/shared/lib/observability/log-redaction.test.ts` |

## Notes

- This smoke gate covers auth hardening, API credential checks, rate limiting, and log redaction.
- Run `npm run test:security-smoke` locally before security-sensitive changes.
