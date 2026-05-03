---
owner: 'Platform Team'
last_reviewed: '2026-04-07'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Security Smoke Report

Generated at: 2026-03-26T12:42:52.693Z

## Summary

- Suites: 5
- Passed: 5
- Failed: 0

## Suite Status

| Suite | Status | Duration | Exit | Tests |
| --- | --- | ---: | ---: | --- |
| Auth Security Policy | PASS | 1.4s | 0 | `__tests__/features/auth/utils/auth-security.test.ts` |
| Auth Encryption | PASS | 1.7s | 0 | `__tests__/features/auth/utils/auth-encryption.test.ts` |
| Auth Verify Credentials API | PASS | 1.9s | 0 | `__tests__/features/auth/api/verify-credentials.test.ts` |
| AI Paths Access Rate Limit | PASS | 1.8s | 0 | `src/features/ai/ai-paths/server/__tests__/access.rate-limit.test.ts` |
| Observability Log Redaction | PASS | 1.6s | 0 | `__tests__/shared/lib/observability/log-redaction.test.ts` |

## Notes

- This smoke gate covers auth hardening, API credential checks, rate limiting, and log redaction.
- Run `npm run test:security-smoke` locally before security-sensitive changes.
