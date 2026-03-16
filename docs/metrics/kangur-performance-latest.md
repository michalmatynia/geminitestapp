---
owner: 'Platform Team'
last_reviewed: '2026-03-16'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Kangur Performance Baseline

Generated at: 2026-03-16T17:56:40.799Z

## Execution Summary

- Unit test suite status: FAIL
- Unit test suite duration: 21.5s
- E2E suite: skipped

## Bundle Risk Snapshot

| File | Lines | Bytes |
| --- | ---: | ---: |
| `src/features/kangur/ui/pages/Lessons.tsx` | 1239 | 49966 |
| `src/features/kangur/ui/pages/Game.tsx` | 967 | 36204 |
| `src/features/kangur/ui/services/kangur-questions-data.js` | 329 | 21289 |
| `src/features/kangur/ui/pages/LearnerProfile.tsx` | 423 | 14808 |
| `src/features/kangur/ui/components/KangurGame.tsx` | 428 | 13515 |
| `src/features/kangur/ui/components/KangurIllustrations.ts` | 14 | 853 |

- Total bytes (tracked files): 136635
- Total lines (tracked files): 3400

## Commands

- Unit: `npx vitest run __tests__/features/kangur/learner-profile.page.test.tsx __tests__/features/kangur/lessons-focus-routing.test.tsx __tests__/features/kangur/kangur-feature-app.shell.test.tsx __tests__/features/kangur/kangur-admin-menu-toggle.test.tsx src/features/kangur/ui/services/profile.test.ts src/features/kangur/settings.test.ts`

## Notes

- This baseline tracks execution time and static file size hotspots for the Kangur feature.
- Use it after each optimization session to validate improvements and prevent regressions.
