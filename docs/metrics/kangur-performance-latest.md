# Kangur Performance Baseline

Generated at: 2026-03-06T04:55:23.705Z

## Execution Summary

- Unit test suite status: PASS
- Unit test suite duration: 6.8s
- E2E suite status: INFRA_FAIL
- E2E suite duration: 22.6s

## Bundle Risk Snapshot

| File | Lines | Bytes |
| --- | ---: | ---: |
| `src/features/kangur/ui/pages/Game.tsx` | 669 | 26187 |
| `src/features/kangur/ui/services/kangur-questions-data.js` | 329 | 21283 |
| `src/features/kangur/ui/pages/LearnerProfile.tsx` | 493 | 19587 |
| `src/features/kangur/ui/pages/Lessons.tsx` | 389 | 15122 |
| `src/features/kangur/ui/components/KangurGame.tsx` | 313 | 10439 |
| `src/features/kangur/ui/components/KangurIllustrations.jsx` | 14 | 853 |

- Total bytes (tracked files): 93471
- Total lines (tracked files): 2207

## Commands

- Unit: `npx vitest run __tests__/features/kangur/learner-profile.page.test.tsx __tests__/features/kangur/lessons-focus-routing.test.tsx __tests__/features/kangur/kangur-feature-app.shell.test.tsx __tests__/features/kangur/kangur-admin-menu-toggle.test.tsx src/features/kangur/ui/services/profile.test.ts src/features/kangur/settings.test.ts`
- E2E: `npx playwright test e2e/features/kangur/kangur-profile.spec.ts e2e/features/kangur/kangur-game-quickstart.spec.ts --workers=1`

## Notes

- This baseline tracks execution time and static file size hotspots for the Kangur feature.
- Use it after each optimization session to validate improvements and prevent regressions.
