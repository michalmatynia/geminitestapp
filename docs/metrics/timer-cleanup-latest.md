# Timer Cleanup Check

Generated at: 2026-03-08T04:48:37.260Z

## Summary

- Status: WARN
- Files scanned: 1938
- Errors: 0
- Warnings: 18

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| settimeout-no-cleanup | 0 | 14 | 0 |
| addeventlistener-no-removal | 0 | 4 | 0 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| WARN | addeventlistener-no-removal | src/features/ai/ai-paths/components/ai-paths-settings/runtime/server-execution/useServerRunStream.ts:54 | addEventListener() without matching removeEventListener() in the same file. Ensure cleanup on unmount. |
| WARN | addeventlistener-no-removal | src/features/ai/ai-paths/components/ai-paths-settings/useAiPathsRunHistory.ts:216 | addEventListener() without matching removeEventListener() in the same file. Ensure cleanup on unmount. |
| WARN | settimeout-no-cleanup | src/features/ai/ai-paths/components/ai-paths-settings/useAiPathsRuntime.ts:323 | setTimeout() in a component with useEffect but no clearTimeout(). Consider cleaning up timers on unmount. |
| WARN | settimeout-no-cleanup | src/features/ai/ai-paths/hooks/useDatabaseNodeConfigState.ts:266 | setTimeout() in a component with useEffect but no clearTimeout(). Consider cleaning up timers on unmount. |
| WARN | addeventlistener-no-removal | src/features/ai/ai-paths/hooks/useDeadLetterRuns.ts:222 | addEventListener() without matching removeEventListener() in the same file. Ensure cleanup on unmount. |
| WARN | settimeout-no-cleanup | src/features/ai/image-studio/components/SequencingPanel.tsx:66 | setTimeout() in a component with useEffect but no clearTimeout(). Consider cleaning up timers on unmount. |
| WARN | settimeout-no-cleanup | src/features/ai/image-studio/context/GenerationContext.tsx:93 | setTimeout() in a component with useEffect but no clearTimeout(). Consider cleaning up timers on unmount. |
| WARN | settimeout-no-cleanup | src/features/case-resolver/hooks/useAdminCaseResolverEditorUiState.ts:31 | setTimeout() in a component with useEffect but no clearTimeout(). Consider cleaning up timers on unmount. |
| WARN | settimeout-no-cleanup | src/features/case-resolver/hooks/useCaseResolverState.prompt-exploder-actions.ts:633 | setTimeout() in a component with useEffect but no clearTimeout(). Consider cleaning up timers on unmount. |
| WARN | settimeout-no-cleanup | src/features/case-resolver/hooks/useCaseResolverState.ts:538 | setTimeout() in a component with useEffect but no clearTimeout(). Consider cleaning up timers on unmount. |
| WARN | settimeout-no-cleanup | src/features/cms/components/frontend/sections/FrontendCarousel.tsx:97 | setTimeout() in a component with useEffect but no clearTimeout(). Consider cleaning up timers on unmount. |
| WARN | settimeout-no-cleanup | src/features/foldertree/v2/shell/useMasterFolderTreeShell.ts:117 | setTimeout() in a component with useEffect but no clearTimeout(). Consider cleaning up timers on unmount. |
| WARN | settimeout-no-cleanup | src/features/notesapp/components/detail/NoteDetailPreview.tsx:141 | setTimeout() in a component with useEffect but no clearTimeout(). Consider cleaning up timers on unmount. |
| WARN | settimeout-no-cleanup | src/features/notesapp/context/NoteFormContext.tsx:587 | setTimeout() in a component with useEffect but no clearTimeout(). Consider cleaning up timers on unmount. |
| WARN | settimeout-no-cleanup | src/shared/hooks/query/useQueryErrorHandling.ts:253 | setTimeout() in a component with useEffect but no clearTimeout(). Consider cleaning up timers on unmount. |
| WARN | settimeout-no-cleanup | src/shared/hooks/query/useQueryMiddleware.ts:206 | setTimeout() in a component with useEffect but no clearTimeout(). Consider cleaning up timers on unmount. |
| WARN | settimeout-no-cleanup | src/shared/ui/QueryDevPanel.tsx:29 | setTimeout() in a component with useEffect but no clearTimeout(). Consider cleaning up timers on unmount. |
| WARN | addeventlistener-no-removal | src/shared/utils/observability/user-action-tracker.ts:71 | addEventListener() without matching removeEventListener() in the same file. Ensure cleanup on unmount. |

## Notes

- `setinterval-no-cleanup` (error): setInterval without clearInterval causes memory leaks.
- `settimeout-no-cleanup` (warn): setTimeout in useEffect without clearTimeout may fire after unmount.
- `addeventlistener-no-removal` (warn): Event listeners without removeEventListener cause memory leaks.
