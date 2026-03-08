# Environment Contract Report

Generated at: 2026-03-08T14:45:50.514Z

## Summary

- Status: FAILED
- Errors: 1
- Warnings: 0
- Info: 0

## Environment Snapshot

- NODE_ENV: development
- DATABASE_URL configured: false
- MONGODB_URI configured: false
- APP_DB_PROVIDER: unset
- REDIS_URL configured: false
- AUTH_SECRET configured: false
- NEXTAUTH_SECRET configured: false
- FASTCOMET env configured: false

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| database-provider-missing | 1 | 0 | 0 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| ERROR | database-provider-missing | - | No database provider is configured. Set DATABASE_URL or MONGODB_URI. |

## Notes

- This report validates runtime env combinations that are easy to misconfigure in this mixed Prisma/Mongo/Redis setup.
- Strict mode fails on error findings. Add --fail-on-warnings to promote warnings into a gate.
