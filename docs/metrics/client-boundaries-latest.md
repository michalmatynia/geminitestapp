---
owner: 'Platform Team'
last_reviewed: '2026-05-07'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Client Boundary Check

Generated at: 2026-05-07T14:39:02.346Z

## Summary

- Status: PASSED
- Files scanned: 9537
- Server-reachable files: 1213
- Errors: 0
- Missing client boundaries: 0
- Review candidates for removing `use client`: 84

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |

## Issues

No missing client boundaries detected.

## Notes

- Server-by-default is preferred, but client boundaries must stay in files that call client-only hooks or browser APIs.
- Review candidates are informational only; remove `use client` only after route-level verification.
