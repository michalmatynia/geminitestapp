---
owner: 'Platform Team'
last_reviewed: '2026-04-11'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Storage And Files Health Report

Generated at: 2026-04-11T17:22:24.772Z

## Summary

- Status: PASSED
- Source files scanned: 7244
- Code upload roots: 10
- Runtime upload roots: 9
- Dynamic public-path read risks: 0
- Errors: 0
- Warnings: 0
- Info: 0

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |

## Issues

No storage or file-health issues detected.

## Upload Root Inventory

| Kind | Root |
| --- | --- |
| code | agentcreator |
| code | assets3d |
| code | case-resolver |
| code | chatbot |
| code | cms |
| code | delete |
| code | kangur |
| code | notes |
| code | products |
| code | studio |
| runtime | agentcreator |
| runtime | assets3d |
| runtime | case-resolver |
| runtime | chatbot |
| runtime | cms |
| runtime | kangur |
| runtime | notes |
| runtime | products |
| runtime | studio |

## Notes

- This check focuses on dynamic /public path resolution safety and drift in local upload roots.
- Strict mode fails on storage path-safety errors. Add --fail-on-warnings to also gate missing local uploads roots or unknown runtime upload roots.
