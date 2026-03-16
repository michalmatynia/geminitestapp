---
owner: 'Platform Team'
last_reviewed: '2026-03-16'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Environment Contract Report

Generated at: 2026-03-16T18:13:42.065Z

## Summary

- Status: PASSED
- Errors: 0
- Warnings: 0
- Info: 0

## Environment Snapshot

- NODE_ENV: development
- DATABASE_URL configured: undefined
- MONGODB_URI configured: true
- APP_DB_PROVIDER: mongodb
- REDIS_URL configured: true
- AUTH_SECRET configured: true
- NEXTAUTH_SECRET configured: false
- FASTCOMET env configured: false

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |

## Issues

No environment contract issues detected.

## Notes

- This report validates runtime env combinations in the MongoDB/Redis runtime setup.
- Strict mode fails on error findings. Add --fail-on-warnings to promote warnings into a gate.
