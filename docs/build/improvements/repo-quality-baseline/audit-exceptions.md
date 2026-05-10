# repo-quality-baseline Audit Exception Log

## False Positive Secret Detections

The following files are flagged by the `canonical:check:sitewide` audit for "potential hardcoded secret/credential" but have been reviewed and confirmed to contain only configuration constants, setting key definitions, or business logic factories.

| File | Reason for Exception |
| --- | --- |
| `src/shared/lib/settings/secret-setting-keys.ts` | Defines setting key constants for configuration service keys. No actual secrets stored. |
| `src/features/filemaker/settings/campaign-content-group-factories.helpers.ts` | Contains factory helpers for creating content variant objects for FileMaker integration. |
| `src/features/filemaker/settings/campaign-factories.ts` | Contains factory definitions for campaign content configuration. |

*Note: These files were manually reviewed on 2026-05-06 and verified to be safe.*
