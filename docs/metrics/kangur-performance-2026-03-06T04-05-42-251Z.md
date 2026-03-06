# Kangur Performance Baseline

Generated at: 2026-03-06T04:05:42.251Z

## Execution Summary

- Unit test suite status: PASS
- Unit test suite duration: 6.3s
- E2E suite status: FAIL
- E2E suite duration: 2.2s

## Bundle Risk Snapshot

| File | Lines | Bytes |
| --- | ---: | ---: |
| `src/features/kangur/ui/pages/Game.tsx` | 670 | 26336 |
| `src/features/kangur/ui/services/kangur-questions-data.js` | 329 | 21289 |
| `src/features/kangur/ui/pages/LearnerProfile.tsx` | 444 | 19057 |
| `src/features/kangur/ui/pages/Lessons.tsx` | 392 | 15121 |
| `src/features/kangur/ui/components/KangurGame.tsx` | 310 | 10394 |
| `src/features/kangur/ui/components/KangurIllustrations.jsx` | 14 | 853 |

- Total bytes (tracked files): 93050
- Total lines (tracked files): 2159

## Commands

- Unit: `npx vitest run __tests__/features/kangur/learner-profile.page.test.tsx __tests__/features/kangur/lessons-focus-routing.test.tsx __tests__/features/kangur/kangur-feature-app.shell.test.tsx __tests__/features/kangur/kangur-admin-menu-toggle.test.tsx src/features/kangur/ui/services/profile.test.ts src/features/kangur/settings.test.ts`
- E2E: `npx playwright test e2e/features/kangur/kangur-profile.spec.ts e2e/features/kangur/kangur-game-quickstart.spec.ts --workers=1`

## Notes

- This baseline tracks execution time and static file size hotspots for the Kangur feature.
- Use it after each optimization session to validate improvements and prevent regressions.
