---
owner: 'Platform Team'
last_reviewed: '2026-04-07'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Kangur Performance Baseline

Generated at: 2026-03-26T13:07:24.310Z

## Execution Summary

- Unit test suite status: FAIL
- Unit test suite duration: 25.4s
- E2E suite: skipped

## Bundle Risk Snapshot

| File | Lines | Bytes |
| --- | ---: | ---: |
| `src/features/kangur/ui/pages/Game.tsx` | 638 | 26166 |
| `src/features/kangur/ui/components/KangurGame.tsx` | 607 | 21670 |
| `src/features/kangur/ui/services/kangur-questions-data.js` | 329 | 21289 |
| `src/features/kangur/ui/pages/LearnerProfile.tsx` | 305 | 11941 |
| `src/features/kangur/ui/pages/Lessons.tsx` | 147 | 4627 |
| `src/features/kangur/ui/components/KangurIllustrations.ts` | 14 | 853 |

- Total bytes (tracked files): 86546
- Total lines (tracked files): 2040

## Commands

- Unit: `npx vitest run __tests__/features/kangur/learner-profile.page.test.tsx __tests__/features/kangur/lessons-focus-routing.test.tsx __tests__/features/kangur/kangur-feature-app.shell.test.tsx __tests__/features/kangur/kangur-admin-menu-toggle.test.tsx src/features/kangur/ui/services/profile.test.ts src/features/kangur/settings.test.ts`

## Notes

- This baseline tracks execution time and static file size hotspots for the Kangur feature.
- Use it after each optimization session to validate improvements and prevent regressions.
