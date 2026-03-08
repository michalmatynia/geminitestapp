# Context Health Check

Generated at: 2026-03-08T14:34:31.994Z

## Summary

- Status: WARN
- Context files scanned: 237
- Errors: 0
- Warnings: 7
- Info: 0

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| context-oversized | 0 | 7 | 0 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| WARN | context-oversized | src/features/ai/ai-paths/components/JobQueueContext.tsx | Context file is 1069 lines (threshold: 500). Consider extracting logic into hooks or splitting the context. |
| WARN | context-oversized | src/features/ai/image-studio/context/GenerationContext.tsx | Context file is 857 lines (threshold: 500). Consider extracting logic into hooks or splitting the context. |
| WARN | context-oversized | src/features/ai/image-studio/context/VersionGraphContext.tsx | Context file is 865 lines (threshold: 500). Consider extracting logic into hooks or splitting the context. |
| WARN | context-oversized | src/features/case-resolver/context/AdminCaseResolverCasesContext.tsx | Context file is 865 lines (threshold: 500). Consider extracting logic into hooks or splitting the context. |
| WARN | context-oversized | src/features/case-resolver/context/CaseResolverFolderTreeContext.tsx | Context file is 851 lines (threshold: 500). Consider extracting logic into hooks or splitting the context. |
| WARN | context-oversized | src/features/data-import-export/context/ImportExportContext.tsx | Context file is 885 lines (threshold: 500). Consider extracting logic into hooks or splitting the context. |
| WARN | context-oversized | src/shared/lib/ai-brain/context/BrainContext.tsx | Context file is 957 lines (threshold: 500). Consider extracting logic into hooks or splitting the context. |

## Notes

- `context-generic-error` (warn): Use structured AppError classes for better observability.
- `context-monolith` (warn): Contexts with >15 fields should be split.
- `context-oversized` (warn): Context files over 500 LOC need refactoring.
- `context-missing-split` (info): Consider useXxxState/useXxxActions pattern for re-render optimization.
