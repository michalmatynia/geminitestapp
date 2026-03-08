# Kangur Performance Baseline

Generated at: 2026-03-08T14:30:04.343Z

## Execution Summary

- Unit test suite status: PASS
- Unit test suite duration: 6.7s
- E2E suite status: FAIL
- E2E suite duration: 1.2m

## Bundle Risk Snapshot

| File | Lines | Bytes |
| --- | ---: | ---: |
| `src/features/kangur/ui/pages/Lessons.tsx` | 790 | 32185 |
| `src/features/kangur/ui/services/kangur-questions-data.js` | 329 | 21289 |
| `src/features/kangur/ui/components/KangurGame.tsx` | 373 | 11848 |
| `src/features/kangur/ui/pages/Game.tsx` | 250 | 9356 |
| `src/features/kangur/ui/pages/LearnerProfile.tsx` | 70 | 3509 |
| `src/features/kangur/ui/components/KangurIllustrations.ts` | 14 | 853 |

- Total bytes (tracked files): 79040
- Total lines (tracked files): 1826

## Commands

- Unit: `npx vitest run __tests__/features/kangur/learner-profile.page.test.tsx __tests__/features/kangur/lessons-focus-routing.test.tsx __tests__/features/kangur/kangur-feature-app.shell.test.tsx __tests__/features/kangur/kangur-admin-menu-toggle.test.tsx src/features/kangur/ui/services/profile.test.ts src/features/kangur/settings.test.ts`
- E2E: `/Users/michalmatynia/.nvm/versions/node/v22.22.0/bin/npx playwright test e2e/features/kangur/kangur-profile.spec.ts e2e/features/kangur/kangur-game-quickstart.spec.ts --workers=1`

## Notes

- This baseline tracks execution time and static file size hotspots for the Kangur feature.
- Use it after each optimization session to validate improvements and prevent regressions.
