---
owner: 'Platform Team'
last_reviewed: '2026-03-30'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Unsafe Patterns Check

Generated at: 2026-03-30T15:09:26.619Z

## Summary

- Status: PASSED
- Files scanned: 6673
- Errors: 0
- Warnings: 0
- Info: 47

## Trend Counters

| Metric | Count |
| --- | ---: |
| doubleAssertionCount | 0 |
| anyCount | 29 |
| eslintDisableCount | 17 |
| nonNullAssertionCount | 1 |
| tsIgnoreCount | 0 |
| tsExpectErrorCount | 0 |

## Top Disabled ESLint Rules

| Rule | Count |
| --- | ---: |
| @typescript-eslint/no-unsafe-assignment | 3 |
| @typescript-eslint/no-unsafe-member-access | 3 |
| @typescript-eslint/no-unsafe-argument | 3 |
| @typescript-eslint/no-confusing-void-expression | 2 |
| @typescript-eslint/no-unsafe-call | 2 |
| @typescript-eslint/no-explicit-any | 2 |
| @typescript-eslint/no-misused-promises | 1 |
| @typescript-eslint/no-unsafe-return | 1 |

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| eslint-disable | 0 | 0 | 17 |
| explicit-any | 0 | 0 | 29 |
| non-null-assertion | 0 | 0 | 1 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| INFO | non-null-assertion | src/features/filemaker/server/filemaker-mail-service.ts:712 | Non-null assertion operator `!`. Consider using optional chaining or a null check. |
| INFO | explicit-any | src/features/kangur/admin/components/KangurAiTutorContentSettingsPanel.tsx:133 | Explicit `any` type usage. Consider using a specific type or `unknown`. |
| INFO | eslint-disable | src/features/kangur/social/admin/workspace/AdminKangurSocialSettingsModal.tsx:5 | eslint-disable comment disabling: @typescript-eslint/no-misused-promises |
| INFO | eslint-disable | src/features/kangur/social/admin/workspace/AdminKangurSocialSettingsModal.tsx:6 | eslint-disable comment disabling: @typescript-eslint/no-confusing-void-expression |
| INFO | explicit-any | src/features/kangur/ui/components/music/KangurMusicPianoRoll.components.tsx:27 | Explicit `any` type usage. Consider using a specific type or `unknown`. |
| INFO | explicit-any | src/features/kangur/ui/components/music/KangurMusicPianoRoll.components.tsx:35 | Explicit `any` type usage. Consider using a specific type or `unknown`. |
| INFO | eslint-disable | src/features/kangur/ui/components/music/MusicMelodyRepeatGame.tsx:1 | eslint-disable comment disabling: @typescript-eslint/no-unsafe-assignment |
| INFO | eslint-disable | src/features/kangur/ui/components/music/MusicMelodyRepeatGame.tsx:2 | eslint-disable comment disabling: @typescript-eslint/no-unsafe-member-access |
| INFO | eslint-disable | src/features/kangur/ui/components/music/MusicMelodyRepeatGame.tsx:3 | eslint-disable comment disabling: @typescript-eslint/no-unsafe-argument |
| INFO | eslint-disable | src/features/kangur/ui/components/music/MusicMelodyRepeatGame.tsx:4 | eslint-disable comment disabling: @typescript-eslint/no-confusing-void-expression |
| INFO | eslint-disable | src/features/kangur/ui/components/music/MusicPianoRollFreePlayGame.tsx:1 | eslint-disable comment disabling: @typescript-eslint/no-unsafe-assignment |
| INFO | eslint-disable | src/features/kangur/ui/components/music/MusicPianoRollFreePlayGame.tsx:2 | eslint-disable comment disabling: @typescript-eslint/no-unsafe-member-access |
| INFO | eslint-disable | src/features/kangur/ui/components/music/MusicPianoRollFreePlayGame.tsx:3 | eslint-disable comment disabling: @typescript-eslint/no-unsafe-call |
| INFO | eslint-disable | src/features/kangur/ui/components/music/MusicPianoRollFreePlayGame.tsx:4 | eslint-disable comment disabling: @typescript-eslint/no-unsafe-argument |
| INFO | eslint-disable | src/features/kangur/ui/components/music/MusicPianoRollFreePlayGame.tsx:5 | eslint-disable comment disabling: @typescript-eslint/no-explicit-any |
| INFO | explicit-any | src/features/kangur/ui/components/music/MusicPianoRollFreePlayGame.tsx:48 | Explicit `any` type usage. Consider using a specific type or `unknown`. |
| INFO | eslint-disable | src/features/kangur/ui/pages/GamesLibrary.tabs.tsx:1 | eslint-disable comment disabling: @typescript-eslint/no-unsafe-assignment |
| INFO | eslint-disable | src/features/kangur/ui/pages/GamesLibrary.tabs.tsx:2 | eslint-disable comment disabling: @typescript-eslint/no-unsafe-member-access |
| INFO | eslint-disable | src/features/kangur/ui/pages/GamesLibrary.tabs.tsx:3 | eslint-disable comment disabling: @typescript-eslint/no-unsafe-call |
| INFO | eslint-disable | src/features/kangur/ui/pages/GamesLibrary.tabs.tsx:4 | eslint-disable comment disabling: @typescript-eslint/no-unsafe-return |
| INFO | eslint-disable | src/features/kangur/ui/pages/GamesLibrary.tabs.tsx:5 | eslint-disable comment disabling: @typescript-eslint/no-unsafe-argument |
| INFO | eslint-disable | src/features/kangur/ui/pages/GamesLibrary.tabs.tsx:6 | eslint-disable comment disabling: @typescript-eslint/no-explicit-any |
| INFO | explicit-any | src/features/kangur/ui/pages/GamesLibrary.tabs.tsx:38 | Explicit `any` type usage. Consider using a specific type or `unknown`. |
| INFO | explicit-any | src/features/kangur/ui/pages/GamesLibrary.tabs.tsx:40 | Explicit `any` type usage. Consider using a specific type or `unknown`. |
| INFO | explicit-any | src/features/kangur/ui/pages/GamesLibrary.tabs.tsx:41 | Explicit `any` type usage. Consider using a specific type or `unknown`. |
| INFO | explicit-any | src/features/kangur/ui/pages/GamesLibrary.tabs.tsx:42 | Explicit `any` type usage. Consider using a specific type or `unknown`. |
| INFO | explicit-any | src/features/kangur/ui/pages/GamesLibrary.tabs.tsx:45 | Explicit `any` type usage. Consider using a specific type or `unknown`. |
| INFO | explicit-any | src/features/kangur/ui/pages/GamesLibrary.tabs.tsx:48 | Explicit `any` type usage. Consider using a specific type or `unknown`. |
| INFO | explicit-any | src/features/kangur/ui/pages/GamesLibrary.tabs.tsx:49 | Explicit `any` type usage. Consider using a specific type or `unknown`. |
| INFO | explicit-any | src/features/kangur/ui/pages/GamesLibrary.tabs.tsx:50 | Explicit `any` type usage. Consider using a specific type or `unknown`. |
| INFO | explicit-any | src/features/kangur/ui/pages/GamesLibrary.tabs.tsx:51 | Explicit `any` type usage. Consider using a specific type or `unknown`. |
| INFO | explicit-any | src/features/kangur/ui/pages/GamesLibrary.tabs.tsx:52 | Explicit `any` type usage. Consider using a specific type or `unknown`. |
| INFO | explicit-any | src/features/kangur/ui/pages/GamesLibrary.tabs.tsx:133 | Explicit `any` type usage. Consider using a specific type or `unknown`. |
| INFO | explicit-any | src/features/kangur/ui/pages/GamesLibrary.tabs.tsx:134 | Explicit `any` type usage. Consider using a specific type or `unknown`. |
| INFO | explicit-any | src/features/kangur/ui/pages/GamesLibrary.tabs.tsx:135 | Explicit `any` type usage. Consider using a specific type or `unknown`. |
| INFO | explicit-any | src/features/kangur/ui/pages/GamesLibrary.tabs.tsx:140 | Explicit `any` type usage. Consider using a specific type or `unknown`. |
| INFO | explicit-any | src/features/kangur/ui/pages/GamesLibrary.tabs.tsx:202 | Explicit `any` type usage. Consider using a specific type or `unknown`. |
| INFO | explicit-any | src/features/kangur/ui/pages/GamesLibrary.tabs.tsx:203 | Explicit `any` type usage. Consider using a specific type or `unknown`. |
| INFO | explicit-any | src/features/kangur/ui/pages/GamesLibrary.tabs.tsx:204 | Explicit `any` type usage. Consider using a specific type or `unknown`. |
| INFO | explicit-any | src/features/kangur/ui/pages/GamesLibrary.tabs.tsx:205 | Explicit `any` type usage. Consider using a specific type or `unknown`. |
| INFO | explicit-any | src/features/kangur/ui/pages/GamesLibrary.tabs.tsx:206 | Explicit `any` type usage. Consider using a specific type or `unknown`. |
| INFO | explicit-any | src/features/kangur/ui/pages/GamesLibrary.tabs.tsx:207 | Explicit `any` type usage. Consider using a specific type or `unknown`. |
| INFO | explicit-any | src/features/kangur/ui/pages/GamesLibrary.tabs.tsx:208 | Explicit `any` type usage. Consider using a specific type or `unknown`. |
| INFO | explicit-any | src/features/kangur/ui/pages/GamesLibrary.tabs.tsx:209 | Explicit `any` type usage. Consider using a specific type or `unknown`. |
| INFO | explicit-any | src/features/kangur/ui/pages/GamesLibrary.tabs.tsx:211 | Explicit `any` type usage. Consider using a specific type or `unknown`. |
| INFO | explicit-any | src/features/kangur/ui/pages/GamesLibrary.tabs.tsx:249 | Explicit `any` type usage. Consider using a specific type or `unknown`. |
| INFO | explicit-any | src/features/kangur/ui/pages/GamesLibrary.tabs.tsx:250 | Explicit `any` type usage. Consider using a specific type or `unknown`. |

## Notes

- `double-assertion` (error): `as unknown as` bypasses type safety. Use type guards or proper narrowing.
- `ts-ignore-no-reason` / `ts-expect-error-no-reason` (warn): Always explain why a suppression is needed.
- `explicit-any` (info): Track trend over time. Prefer `unknown` or specific types.
- `eslint-disable` (info): Track which rules are most frequently disabled.
- `non-null-assertion` (info): Prefer optional chaining `?.` or explicit null checks.
