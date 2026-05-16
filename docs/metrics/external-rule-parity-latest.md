---
owner: 'Platform Team'
last_reviewed: '2026-04-07'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# External Rule Parity

Generated at: 2026-04-04T10:17:21.627Z

## Summary

- Status: FAILED
- Normalized rules: 31
- External rule names: 101
- Unique external rule names: 99
- Duplicate external rule names: 2
- Implemented rules: 18
- Wired implemented rules: 18
- Waived rules: 5
- ESLint-native parity rules: 8
- Covered ESLint-native parity rules: 8
- Pending ESLint-native parity rules: 0
- Errors: 399
- Warnings: 21
- Info: 0

## Manifest Status Counts

| Status | Count |
| --- | ---: |
| implemented | 18 |
| eslint | 8 |
| scanner | 0 |
| waived | 5 |

## Analyzer Coverage

| Scanner | Files | Upstream Issues | Translated Issues |
| --- | ---: | ---: | ---: |
| quality/external-rule-parity | 7115 | 418 | 418 |
| quality/security-static | 6813 | 4 | 2 |

## ESLint Parity Coverage

| Normalized Rule | Source Rule | Local Status | Local Rule | Rationale |
| --- | --- | --- | --- | --- |
| medium-cyclomatic-complexity | complexity | configured | complexity | - |
| medium-file-length-limit | max-lines | configured | max-lines | - |
| medium-nloc-limit | max-lines-per-function | configured | max-lines-per-function | - |
| medium-parameter-count-limit | max-params | configured | max-params | - |
| no-await-in-loops | no-await-in-loop | configured | no-await-in-loop | - |
| no-sync-methods | no-sync | configured-via-alias | no-restricted-syntax | Covered heuristically by the .fooSync() no-restricted-syntax selector instead of eslint-plugin-n's dedicated no-sync rule. |
| no-top-level-await | no-top-level-await | configured-via-alias | no-restricted-syntax | Enforced with a top-level AwaitExpression selector instead of a dedicated rule id. |
| trailing-comma-ban | comma-dangle | configured | comma-dangle | - |

## Waived Rules

| Normalized Rule | Severity | External Rule Names | Rationale |
| --- | --- | --- | --- |
| for-of-ban | info | Disallow for-of Loops<br/>Disallow for-of Loops | This overlaps with a style preference from another ecosystem and is not appropriate as a repo-wide policy here. |
| legacy-react-flow-module-rules | info | Disallow ES2015 Modules<br/>Disallow Missing React When Using JSX<br/>Require Parameter Type Annotations in Flowtype | These are obsolete for a modern TypeScript + React + ESM codebase. |
| legacy-syntax-bans | info | Detect Missing Template String Indicator in JavaScript<br/>Disallow Arrow Function Expressions<br/>Disallow Async Function Declarations<br/>Disallow Block-Scoped Variables<br/>Disallow Default Parameters<br/>Disallow Destructuring<br/>Disallow Hashbang Comments<br/>Disallow Logical Assignment Operators<br/>Disallow Nullish Coalescing Operators<br/>Disallow Optional Chaining<br/>Disallow Property Shorthands<br/>Disallow Reserved Words as Property Names<br/>Disallow Rest/Spread Properties<br/>Disallow Spread Elements<br/>Disallow Template Literals<br/>Disallow async-await syntax<br/>Disallow import.meta Meta Property<br/>Enforce Correct Usage of Hashbang | These bans conflict with the current TypeScript/Next.js style and would create large amounts of low-signal noise. |
| modern-builtin-and-helper-bans | info | Avoid Using JSON.stringify for Object Keys<br/>Avoid Using String.replaceAll<br/>Disallow Array.from Method<br/>Disallow Array.isArray Method<br/>Disallow Array.prototype.filter Method<br/>Disallow Array.prototype.find Method<br/>Disallow Array.prototype.includes<br/>Disallow Array.prototype.map Usage<br/>Disallow JSON Class Usage<br/>Disallow Map Class<br/>Disallow Number.isFinite Method<br/>Disallow Number.parseInt Usage<br/>Disallow Numeric Separators<br/>Disallow Object.entries Method<br/>Disallow Object.keys Method<br/>Disallow Promise Class Usage<br/>Disallow the Set class<br/>Enforce Usage of Valid ECMAScript Intrinsic APIs<br/>Forbid Using Named Export as Property of Default Export<br/>Prefer JSON parse buffer<br/>Prefer Set#has() over Array#includes()<br/>Prefer for…of Over Array forEach<br/>Require Explicit Promise Constructor Usage | These are broad legacy or stylistic bans that do not align with the current codebase. |
| node-and-nullability-bans | info | Disallow process.exit() usage<br/>Forbid Importing Node.js Builtin Modules<br/>Forbid the use of null and undefined | These are incompatible with the repo runtime model and existing script infrastructure. |

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| weak-randomness | 190 | 0 | 0 |
| ssrf-user-controlled-urls | 91 | 0 | 0 |
| regex-safety-and-dynamic-input | 54 | 0 | 0 |
| hardcoded-passwords | 19 | 0 | 0 |
| filesystem-path-taint | 14 | 0 | 0 |
| nosql-findone-injection | 13 | 0 | 0 |
| open-redirects | 8 | 0 | 0 |
| html-and-innerhtml-xss-sinks | 5 | 0 | 0 |
| browser-global-ssr-access | 2 | 0 | 0 |
| unsafe-dynamic-object-access | 2 | 0 | 0 |
| timing-attack-comparisons | 1 | 0 | 0 |
| no-atomic-updates | 0 | 14 | 0 |
| duplicate-headings | 0 | 3 | 0 |
| dangerouslysetinnerhtml-review | 0 | 2 | 0 |
| github-actions-full-sha | 0 | 2 | 0 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| ERROR | regex-safety-and-dynamic-input | scripts/ai-paths/canonical-manifest-paths-utils.mjs:17:28 | RegExp constructor uses a non-literal or non-escaped pattern source. Review dynamic regex input for safety and runaway-pattern risk. |
| ERROR | filesystem-path-taint | scripts/db/audit-products-missing-parameters.ts:88:19 | File-system path is non-literal or built from non-obviously safe input. Review for path traversal and user-controlled path usage. |
| ERROR | ssrf-user-controlled-urls | scripts/db/configure-kangur-ai-tutor-drawing-analysis.ts:114:32 | Network request uses a non-literal or non-obviously safe URL. Validate and normalize user-controlled URLs before requesting them. |
| ERROR | filesystem-path-taint | scripts/db/restore-product-descriptions-parameters.ts:453:21 | File-system path is non-literal or built from non-obviously safe input. Review for path traversal and user-controlled path usage. |
| ERROR | hardcoded-passwords | scripts/db/seed-admin.ts:11:11 | Sensitive identifier is initialized with a string literal. Move credentials into environment or reviewed secret storage. |
| ERROR | filesystem-path-taint | scripts/mobile/check-kangur-mobile-native-deps.ts:30:27 | File-system path is non-literal or built from non-obviously safe input. Review for path traversal and user-controlled path usage. |
| ERROR | filesystem-path-taint | scripts/mobile/init-kangur-mobile-env.ts:77:16 | File-system path is non-literal or built from non-obviously safe input. Review for path traversal and user-controlled path usage. |
| ERROR | ssrf-user-controlled-urls | scripts/mobile/run-kangur-mobile-export-smoke-local.ts:146:28 | Network request uses a non-literal or non-obviously safe URL. Validate and normalize user-controlled URLs before requesting them. |
| ERROR | regex-safety-and-dynamic-input | scripts/observability/check-observability.mjs:397:42 | RegExp constructor uses a non-literal or non-escaped pattern source. Review dynamic regex input for safety and runaway-pattern risk. |
| ERROR | regex-safety-and-dynamic-input | scripts/observability/check-observability.mjs:400:18 | RegExp constructor uses a non-literal or non-escaped pattern source. Review dynamic regex input for safety and runaway-pattern risk. |
| ERROR | regex-safety-and-dynamic-input | scripts/quality/lib/check-unsafe-patterns.mjs:158:32 | RegExp constructor uses a non-literal or non-escaped pattern source. Review dynamic regex input for safety and runaway-pattern risk. |
| ERROR | filesystem-path-taint | scripts/testing/run-segmented-typecheck.mjs:296:19 | File-system path is non-literal or built from non-obviously safe input. Review for path traversal and user-controlled path usage. |
| ERROR | nosql-findone-injection | src/app/api/ai-paths/db-action/handler.ts:251:9 | findOne() query is not an inline object literal. Review helper-built or user-influenced filters for NoSQL injection risk. |
| ERROR | nosql-findone-injection | src/app/api/ai-paths/db-action/handler.ts:262:44 | findOne() query is not an inline object literal. Review helper-built or user-influenced filters for NoSQL injection risk. |
| ERROR | weak-randomness | src/app/api/ai-paths/trigger-buttons/handler.helpers.ts:86:23 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | ssrf-user-controlled-urls | src/app/api/assets3d/[id]/file/handler.ts:25:34 | Network request uses a non-literal or non-obviously safe URL. Validate and normalize user-controlled URLs before requesting them. |
| ERROR | filesystem-path-taint | src/app/api/assets3d/[id]/file/handler.ts:44:37 | File-system path is non-literal or built from non-obviously safe input. Review for path traversal and user-controlled path usage. |
| ERROR | nosql-findone-injection | src/app/api/auth/users/[id]/handler.ts:133:71 | findOne() query is not an inline object literal. Review helper-built or user-influenced filters for NoSQL injection risk. |
| ERROR | nosql-findone-injection | src/app/api/auth/users/[id]/handler.ts:157:70 | findOne() query is not an inline object literal. Review helper-built or user-influenced filters for NoSQL injection risk. |
| ERROR | nosql-findone-injection | src/app/api/auth/users/[id]/handler.ts:234:71 | findOne() query is not an inline object literal. Review helper-built or user-influenced filters for NoSQL injection risk. |
| ERROR | weak-randomness | src/app/api/chatbot/handler.ts:66:32 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | ssrf-user-controlled-urls | src/app/api/files/preview/handler.ts:67:34 | Network request uses a non-literal or non-obviously safe URL. Validate and normalize user-controlled URLs before requesting them. |
| ERROR | ssrf-user-controlled-urls | src/app/api/image-studio/composite/handler.ts:49:31 | Network request uses a non-literal or non-obviously safe URL. Validate and normalize user-controlled URLs before requesting them. |
| ERROR | ssrf-user-controlled-urls | src/app/api/image-studio/composite/handler.ts:63:31 | Network request uses a non-literal or non-obviously safe URL. Validate and normalize user-controlled URLs before requesting them. |
| ERROR | ssrf-user-controlled-urls | src/app/api/image-studio/projects/[projectId]/assets/import/handler.ts:131:34 | Network request uses a non-literal or non-obviously safe URL. Validate and normalize user-controlled URLs before requesting them. |
| ERROR | ssrf-user-controlled-urls | src/app/api/image-studio/slots/[slotId]/crop/handler.ts:212:36 | Network request uses a non-literal or non-obviously safe URL. Validate and normalize user-controlled URLs before requesting them. |
| ERROR | ssrf-user-controlled-urls | src/app/api/image-studio/slots/[slotId]/masks/handler.ts:122:34 | Network request uses a non-literal or non-obviously safe URL. Validate and normalize user-controlled URLs before requesting them. |
| ERROR | ssrf-user-controlled-urls | src/app/api/image-studio/slots/base64/handler.ts:28:27 | Network request uses a non-literal or non-obviously safe URL. Validate and normalize user-controlled URLs before requesting them. |
| ERROR | ssrf-user-controlled-urls | src/app/api/search/handler.ts:66:29 | Network request uses a non-literal or non-obviously safe URL. Validate and normalize user-controlled URLs before requesting them. |
| ERROR | ssrf-user-controlled-urls | src/app/api/search/handler.ts:112:29 | Network request uses a non-literal or non-obviously safe URL. Validate and normalize user-controlled URLs before requesting them. |
| ERROR | ssrf-user-controlled-urls | src/app/api/search/handler.ts:150:29 | Network request uses a non-literal or non-obviously safe URL. Validate and normalize user-controlled URLs before requesting them. |
| ERROR | open-redirects | src/app/api/v2/integrations/[id]/connections/[connectionId]/allegro/authorize/handler.ts:57:42 | Redirect target is non-literal or not obviously same-origin. Review redirect sinks for user-controlled navigation targets. |
| ERROR | ssrf-user-controlled-urls | src/app/api/v2/integrations/[id]/connections/[connectionId]/allegro/callback/handler.ts:87:34 | Network request uses a non-literal or non-obviously safe URL. Validate and normalize user-controlled URLs before requesting them. |
| ERROR | ssrf-user-controlled-urls | src/app/api/v2/integrations/[id]/connections/[connectionId]/allegro/request/handler.ts:112:34 | Network request uses a non-literal or non-obviously safe URL. Validate and normalize user-controlled URLs before requesting them. |
| ERROR | ssrf-user-controlled-urls | src/app/api/v2/integrations/[id]/connections/[connectionId]/allegro/request/handler.ts:148:30 | Network request uses a non-literal or non-obviously safe URL. Validate and normalize user-controlled URLs before requesting them. |
| ERROR | ssrf-user-controlled-urls | src/app/api/v2/integrations/[id]/connections/[connectionId]/allegro/request/handler.ts:153:28 | Network request uses a non-literal or non-obviously safe URL. Validate and normalize user-controlled URLs before requesting them. |
| ERROR | ssrf-user-controlled-urls | src/app/api/v2/integrations/[id]/connections/[connectionId]/allegro/test/handler.ts:89:11 | Network request uses a non-literal or non-obviously safe URL. Validate and normalize user-controlled URLs before requesting them. |
| ERROR | ssrf-user-controlled-urls | src/app/api/v2/integrations/[id]/connections/[connectionId]/allegro/test/handler.ts:106:34 | Network request uses a non-literal or non-obviously safe URL. Validate and normalize user-controlled URLs before requesting them. |
| ERROR | open-redirects | src/app/api/v2/integrations/[id]/connections/[connectionId]/linkedin/authorize/handler.ts:85:44 | Redirect target is non-literal or not obviously same-origin. Review redirect sinks for user-controlled navigation targets. |
| ERROR | ssrf-user-controlled-urls | src/app/api/v2/integrations/[id]/connections/[connectionId]/linkedin/callback/handler.ts:41:5 | Network request uses a non-literal or non-obviously safe URL. Validate and normalize user-controlled URLs before requesting them. |
| ERROR | ssrf-user-controlled-urls | src/app/api/v2/integrations/[id]/connections/[connectionId]/linkedin/callback/handler.ts:192:34 | Network request uses a non-literal or non-obviously safe URL. Validate and normalize user-controlled URLs before requesting them. |
| ERROR | hardcoded-passwords | src/app/api/v2/integrations/[id]/connections/[connectionId]/test/handler.ts:540:11 | Sensitive identifier is initialized with a string literal. Move credentials into environment or reviewed secret storage. |
| ERROR | ssrf-user-controlled-urls | src/app/api/v2/integrations/linkedin/callback/handler.ts:79:34 | Network request uses a non-literal or non-obviously safe URL. Validate and normalize user-controlled URLs before requesting them. |
| ERROR | timing-attack-comparisons | src/app/api/v2/integrations/linkedin/callback/handler.ts:147:41 | Direct equality is used on secret-like values. Review token/signature comparisons for timing-attack exposure and prefer timingSafeEqual-style helpers. |
| ERROR | ssrf-user-controlled-urls | src/app/api/v2/integrations/linkedin/callback/handler.ts:190:34 | Network request uses a non-literal or non-obviously safe URL. Validate and normalize user-controlled URLs before requesting them. |
| ERROR | ssrf-user-controlled-urls | src/app/api/v2/products/[id]/images/link-to-file/handler.ts:41:32 | Network request uses a non-literal or non-obviously safe URL. Validate and normalize user-controlled URLs before requesting them. |
| ERROR | ssrf-user-controlled-urls | src/app/api/v2/products/images/base64/handler.ts:28:13 | Network request uses a non-literal or non-obviously safe URL. Validate and normalize user-controlled URLs before requesting them. |
| ERROR | regex-safety-and-dynamic-input | src/app/api/v2/products/validator-patterns/[id]/handler.helpers.ts:138:21 | RegExp constructor uses a non-literal or non-escaped pattern source. Review dynamic regex input for safety and runaway-pattern risk. |
| ERROR | regex-safety-and-dynamic-input | src/app/api/v2/products/validator-patterns/handler.helpers.ts:127:21 | RegExp constructor uses a non-literal or non-escaped pattern source. Review dynamic regex input for safety and runaway-pattern risk. |
| ERROR | regex-safety-and-dynamic-input | src/app/api/v2/products/validator-patterns/import/handler.ts:230:21 | RegExp constructor uses a non-literal or non-escaped pattern source. Review dynamic regex input for safety and runaway-pattern risk. |
| ERROR | regex-safety-and-dynamic-input | src/app/api/v2/products/validator-runtime/evaluate/handler.ts:172:27 | RegExp constructor uses a non-literal or non-escaped pattern source. Review dynamic regex input for safety and runaway-pattern risk. |
| ERROR | weak-randomness | src/features/admin/context/admin-menu-settings-tree.ts:9:45 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | weak-randomness | src/features/admin/pages/AdminValidatorPatternListsPage.tsx:72:33 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | hardcoded-passwords | src/features/ai/agent-runtime/tools/playwright/actions.ts:217:9 | Sensitive identifier is initialized with a string literal. Move credentials into environment or reviewed secret storage. |
| ERROR | ssrf-user-controlled-urls | src/features/ai/agent-runtime/tools/search/index.ts:8:32 | Network request uses a non-literal or non-obviously safe URL. Validate and normalize user-controlled URLs before requesting them. |
| ERROR | ssrf-user-controlled-urls | src/features/ai/agent-runtime/tools/search/index.ts:50:31 | Network request uses a non-literal or non-obviously safe URL. Validate and normalize user-controlled URLs before requesting them. |
| ERROR | ssrf-user-controlled-urls | src/features/ai/agent-runtime/tools/search/index.ts:92:31 | Network request uses a non-literal or non-obviously safe URL. Validate and normalize user-controlled URLs before requesting them. |
| ERROR | ssrf-user-controlled-urls | src/features/ai/agent-runtime/tools/search/index.ts:129:31 | Network request uses a non-literal or non-obviously safe URL. Validate and normalize user-controlled URLs before requesting them. |
| ERROR | ssrf-user-controlled-urls | src/features/ai/agent-runtime/tools/utils.ts:85:34 | Network request uses a non-literal or non-obviously safe URL. Validate and normalize user-controlled URLs before requesting them. |
| ERROR | weak-randomness | src/features/ai/agentcreator/server/persona-avatar-thumbnails.ts:84:21 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | weak-randomness | src/features/ai/agentcreator/teaching/server/repository.ts:37:32 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | ssrf-user-controlled-urls | src/features/ai/ai-context-registry/pages/AdminAiContextRegistryPage.tsx:67:32 | Network request uses a non-literal or non-obviously safe URL. Validate and normalize user-controlled URLs before requesting them. |
| ERROR | ssrf-user-controlled-urls | src/features/ai/ai-context-registry/pages/AdminAiContextRegistryPage.tsx:81:32 | Network request uses a non-literal or non-obviously safe URL. Validate and normalize user-controlled URLs before requesting them. |
| ERROR | regex-safety-and-dynamic-input | src/features/ai/ai-context-registry/services/runtime-providers/kangur-recent-features.ts:42:28 | RegExp constructor uses a non-literal or non-escaped pattern source. Review dynamic regex input for safety and runaway-pattern risk. |
| ERROR | weak-randomness | src/features/ai/ai-paths/components/ai-paths-settings/runtime/server-execution/useServerRunStream.ts:275:59 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | weak-randomness | src/features/ai/ai-paths/components/ai-paths-settings/runtime/useAiPathsRuntimeState.ts:54:39 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | weak-randomness | src/features/ai/ai-paths/components/ai-paths-settings/runtime/utils.ts:33:36 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | weak-randomness | src/features/ai/ai-paths/components/ai-paths-settings/useAiPathsPresets.ts:323:24 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | weak-randomness | src/features/ai/ai-paths/components/ai-paths-settings/useAiPathsPresets.ts:340:24 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | weak-randomness | src/features/ai/ai-paths/components/ai-paths-settings/useAiPathsPresets.ts:357:24 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | weak-randomness | src/features/ai/ai-paths/components/hooks/useClusterPresetsActions.ts:236:26 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | weak-randomness | src/features/ai/ai-paths/components/hooks/useClusterPresetsActions.ts:253:26 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | weak-randomness | src/features/ai/ai-paths/components/hooks/useClusterPresetsActions.ts:270:26 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | regex-safety-and-dynamic-input | src/features/ai/ai-paths/components/node-config/database/query-utils.ts:32:23 | RegExp constructor uses a non-literal or non-escaped pattern source. Review dynamic regex input for safety and runaway-pattern risk. |
| ERROR | hardcoded-passwords | src/features/ai/ai-paths/components/node-config/dialog/ApiAdvancedNodeConfigSection.tsx:78:3 | Sensitive object property is assigned a string literal. Move credentials into environment or reviewed secret storage. |
| ERROR | weak-randomness | src/features/ai/ai-paths/components/node-config/dialog/LogicalConditionNodeConfigSection.tsx:55:23 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | regex-safety-and-dynamic-input | src/features/ai/ai-paths/components/node-config/dialog/regex-node-config-preview.ts:319:20 | RegExp constructor uses a non-literal or non-escaped pattern source. Review dynamic regex input for safety and runaway-pattern risk. |
| ERROR | regex-safety-and-dynamic-input | src/features/ai/ai-paths/components/node-config/dialog/regex-node-config-preview.ts:363:37 | RegExp constructor uses a non-literal or non-escaped pattern source. Review dynamic regex input for safety and runaway-pattern risk. |
| ERROR | regex-safety-and-dynamic-input | src/features/ai/ai-paths/components/node-config/dialog/RegexNodeConfigSection.tsx:431:27 | RegExp constructor uses a non-literal or non-escaped pattern source. Review dynamic regex input for safety and runaway-pattern risk. |
| ERROR | weak-randomness | src/features/ai/ai-paths/components/node-config/dialog/SwitchNodeConfigSection.tsx:11:23 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | ssrf-user-controlled-urls | src/features/ai/ai-paths/components/PortableEngineTrendSnapshotsPanel.tsx:211:9 | Network request uses a non-literal or non-obviously safe URL. Validate and normalize user-controlled URLs before requesting them. |
| ERROR | weak-randomness | src/features/ai/ai-paths/components/useJobQueueDataLayer.ts:148:65 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | weak-randomness | src/features/ai/ai-paths/components/useJobQueueDataLayer.ts:159:65 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | weak-randomness | src/features/ai/ai-paths/components/useJobQueueDataLayer.ts:163:25 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | weak-randomness | src/features/ai/ai-paths/components/useJobQueueDataLayer.ts:246:57 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | weak-randomness | src/features/ai/ai-paths/context/hooks/useCanvasInteractions.clipboard.ts:243:36 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | weak-randomness | src/features/ai/ai-paths/context/hooks/useCanvasInteractions.connections.ts:275:26 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | weak-randomness | src/features/ai/ai-paths/services/playwright-node-runner.ts:78:43 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | weak-randomness | src/features/ai/ai-paths/services/playwright-node-runner.ts:86:26 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | weak-randomness | src/features/ai/ai-paths/services/playwright-node-runner.ts:145:60 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | weak-randomness | src/features/ai/ai-paths/workers/ai-path-run-processor.ts:159:61 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | ssrf-user-controlled-urls | src/features/ai/chatbot/api/client.ts:33:24 | Network request uses a non-literal or non-obviously safe URL. Validate and normalize user-controlled URLs before requesting them. |
| ERROR | ssrf-user-controlled-urls | src/features/ai/chatbot/api/client.ts:55:19 | Network request uses a non-literal or non-obviously safe URL. Validate and normalize user-controlled URLs before requesting them. |
| ERROR | ssrf-user-controlled-urls | src/features/ai/chatbot/api/models.ts:5:27 | Network request uses a non-literal or non-obviously safe URL. Validate and normalize user-controlled URLs before requesting them. |
| ERROR | weak-randomness | src/features/ai/chatbot/hooks/useChatbotContextState.ts:104:38 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | weak-randomness | src/features/ai/chatbot/hooks/useChatbotContextState.ts:186:35 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | weak-randomness | src/features/ai/chatbot/hooks/useChatbotLogic.ts:420:37 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | weak-randomness | src/features/ai/chatbot/hooks/useChatbotLogic.ts:440:41 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | weak-randomness | src/features/ai/chatbot/hooks/useChatbotMessagesState.ts:40:37 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | weak-randomness | src/features/ai/chatbot/hooks/useChatbotMessagesState.ts:60:41 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | weak-randomness | src/features/ai/image-studio/components/generation-toolbar/GenerationToolbarImageUtils.centering.ts:55:45 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | weak-randomness | src/features/ai/image-studio/components/generation-toolbar/GenerationToolbarImageUtils.centering.ts:104:48 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | weak-randomness | src/features/ai/image-studio/components/generation-toolbar/GenerationToolbarImageUtils.cropping.ts:31:43 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | ssrf-user-controlled-urls | src/features/ai/image-studio/components/generation-toolbar/GenerationToolbarImageUtils.helpers.ts:104:32 | Network request uses a non-literal or non-obviously safe URL. Validate and normalize user-controlled URLs before requesting them. |
| ERROR | weak-randomness | src/features/ai/image-studio/components/generation-toolbar/GenerationToolbarImageUtils.upscaling.ts:33:46 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | weak-randomness | src/features/ai/image-studio/components/right-sidebar/useRightSidebarActionHistory.ts:261:55 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | weak-randomness | src/features/ai/image-studio/components/sequencing/SequenceStackCard.tsx:25:76 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | weak-randomness | src/features/ai/image-studio/components/studio-modals/studio-modals-prompt-handlers.ts:76:42 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | ssrf-user-controlled-urls | src/features/ai/image-studio/product-studio/product-studio-service.io.ts:54:34 | Network request uses a non-literal or non-obviously safe URL. Validate and normalize user-controlled URLs before requesting them. |
| ERROR | weak-randomness | src/features/ai/image-studio/server/run-repository.ts:97:32 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | weak-randomness | src/features/ai/image-studio/server/sequence-run-repository.ts:98:32 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | weak-randomness | src/features/ai/image-studio/server/slot-link-repository.ts:43:32 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | weak-randomness | src/features/ai/image-studio/server/slot-repository.ts:82:32 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | ssrf-user-controlled-urls | src/features/ai/image-studio/server/source-image-utils.ts:85:36 | Network request uses a non-literal or non-obviously safe URL. Validate and normalize user-controlled URLs before requesting them. |
| ERROR | ssrf-user-controlled-urls | src/features/ai/image-studio/server/upscale/upscale-buffer-loader.ts:71:36 | Network request uses a non-literal or non-obviously safe URL. Validate and normalize user-controlled URLs before requesting them. |
| ERROR | weak-randomness | src/features/ai/image-studio/utils/object-layout-presets.ts:123:45 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | regex-safety-and-dynamic-input | src/features/ai/image-studio/utils/prompt-formatter.ts:87:27 | RegExp constructor uses a non-literal or non-escaped pattern source. Review dynamic regex input for safety and runaway-pattern risk. |
| ERROR | regex-safety-and-dynamic-input | src/features/ai/image-studio/utils/prompt-formatter.ts:105:27 | RegExp constructor uses a non-literal or non-escaped pattern source. Review dynamic regex input for safety and runaway-pattern risk. |
| ERROR | regex-safety-and-dynamic-input | src/features/ai/image-studio/utils/prompt-validator.ts:15:23 | RegExp constructor uses a non-literal or non-escaped pattern source. Review dynamic regex input for safety and runaway-pattern risk. |
| ERROR | hardcoded-passwords | src/features/auth/auth.config.ts:4:7 | Sensitive identifier is initialized with a string literal. Move credentials into environment or reviewed secret storage. |
| ERROR | open-redirects | src/features/auth/pages/public/SignInPageView.tsx:90:34 | Redirect target is non-literal or not obviously same-origin. Review redirect sinks for user-controlled navigation targets. |
| ERROR | ssrf-user-controlled-urls | src/features/auth/services/auth-email-delivery.ts:76:34 | Network request uses a non-literal or non-obviously safe URL. Validate and normalize user-controlled URLs before requesting them. |
| ERROR | html-and-innerhtml-xss-sinks | src/features/case-resolver/components/case-resolver-canvas-utils.ts:247:14 | HTML sink assignment is not obviously sanitized. Review innerHTML/outerHTML usage for XSS exposure. |
| ERROR | weak-randomness | src/features/case-resolver/components/case-resolver-canvas-utils.ts:373:56 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | weak-randomness | src/features/case-resolver/components/case-resolver-canvas-utils.ts:374:56 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | html-and-innerhtml-xss-sinks | src/features/case-resolver/composer.ts:76:14 | HTML sink assignment is not obviously sanitized. Review innerHTML/outerHTML usage for XSS exposure. |
| ERROR | weak-randomness | src/features/case-resolver/hooks/useCaseResolverState.ocr-actions.ts:67:38 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | ssrf-user-controlled-urls | src/features/case-resolver/hooks/useCaseResolverState.ocr-actions.ts:133:36 | Network request uses a non-literal or non-obviously safe URL. Validate and normalize user-controlled URLs before requesting them. |
| ERROR | ssrf-user-controlled-urls | src/features/case-resolver/node-file-persistence.ts:28:24 | Network request uses a non-literal or non-obviously safe URL. Validate and normalize user-controlled URLs before requesting them. |
| ERROR | weak-randomness | src/features/case-resolver/pages/AdminCaseResolverCategoriesPage.tsx:43:32 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | weak-randomness | src/features/case-resolver/pages/AdminCaseResolverIdentifiersPage.tsx:30:34 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | weak-randomness | src/features/case-resolver/pages/AdminCaseResolverTagsPage.helpers.ts:26:27 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | weak-randomness | src/features/case-resolver/utils/caseResolverUtils.ts:53:28 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | weak-randomness | src/features/case-resolver/utils/workspace-persistence-utils.ts:88:34 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | weak-randomness | src/features/case-resolver/utils/workspace-persistence-utils.ts:116:28 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | ssrf-user-controlled-urls | src/features/case-resolver/workers/case-resolver-ocr/utils.ts:11:24 | Network request uses a non-literal or non-obviously safe URL. Validate and normalize user-controlled URLs before requesting them. |
| ERROR | ssrf-user-controlled-urls | src/features/case-resolver/workspace-persistence-fetch.ts:336:7 | Network request uses a non-literal or non-obviously safe URL. Validate and normalize user-controlled URLs before requesting them. |
| ERROR | html-and-innerhtml-xss-sinks | src/features/cms/components/page-builder/theme/theme-utils.ts:111:8 | HTML sink assignment is not obviously sanitized. Review innerHTML/outerHTML usage for XSS exposure. |
| ERROR | regex-safety-and-dynamic-input | src/features/cms/components/page-builder/utils/ai-helpers.ts:8:43 | RegExp constructor uses a non-literal or non-escaped pattern source. Review dynamic regex input for safety and runaway-pattern risk. |
| ERROR | open-redirects | src/features/cms/components/shared/EventEffectsWrapper.tsx:89:34 | Redirect target is non-literal or not obviously same-origin. Review redirect sinks for user-controlled navigation targets. |
| ERROR | weak-randomness | src/features/filemaker/filemaker-settings.mappers.ts:71:23 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | weak-randomness | src/features/filemaker/filemaker-settings.mappers.ts:82:23 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | regex-safety-and-dynamic-input | src/features/filemaker/filemaker-settings.validation.ts:107:29 | RegExp constructor uses a non-literal or non-escaped pattern source. Review dynamic regex input for safety and runaway-pattern risk. |
| ERROR | regex-safety-and-dynamic-input | src/features/filemaker/filemaker-settings.validation.ts:130:29 | RegExp constructor uses a non-literal or non-escaped pattern source. Review dynamic regex input for safety and runaway-pattern risk. |
| ERROR | regex-safety-and-dynamic-input | src/features/filemaker/filemaker-settings.validation.ts:274:30 | RegExp constructor uses a non-literal or non-escaped pattern source. Review dynamic regex input for safety and runaway-pattern risk. |
| ERROR | weak-randomness | src/features/filemaker/hooks/useAdminFilemakerPageState.ts:49:28 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | ssrf-user-controlled-urls | src/features/filemaker/mail-ui-helpers.ts:5:32 | Network request uses a non-literal or non-obviously safe URL. Validate and normalize user-controlled URLs before requesting them. |
| ERROR | weak-randomness | src/features/filemaker/pages/AdminFilemakerEventEditPage.tsx:55:28 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | ssrf-user-controlled-urls | src/features/filemaker/pages/AdminFilemakerMailComposePage.tsx:32:32 | Network request uses a non-literal or non-obviously safe URL. Validate and normalize user-controlled URLs before requesting them. |
| ERROR | ssrf-user-controlled-urls | src/features/filemaker/pages/AdminFilemakerMailThreadPage.tsx:39:32 | Network request uses a non-literal or non-obviously safe URL. Validate and normalize user-controlled URLs before requesting them. |
| ERROR | hardcoded-passwords | src/features/filemaker/server/campaign-email-delivery.ts:20:3 | Sensitive object property is assigned a string literal. Move credentials into environment or reviewed secret storage. |
| ERROR | ssrf-user-controlled-urls | src/features/filemaker/server/campaign-email-delivery.ts:410:34 | Network request uses a non-literal or non-obviously safe URL. Validate and normalize user-controlled URLs before requesting them. |
| ERROR | ssrf-user-controlled-urls | src/features/files/hooks/useFileUploadEvents.ts:21:31 | Network request uses a non-literal or non-obviously safe URL. Validate and normalize user-controlled URLs before requesting them. |
| ERROR | weak-randomness | src/features/integrations/components/listings/hooks/useListProductForm.ts:76:52 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | weak-randomness | src/features/integrations/components/listings/hooks/useMassListForm.ts:41:74 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | weak-randomness | src/features/integrations/components/listings/hooks/useProductSelectionForm.ts:54:52 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | weak-randomness | src/features/integrations/pages/marketplaces/PlaywrightIntegrationPage.tsx:54:52 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | ssrf-user-controlled-urls | src/features/integrations/services/exports/base-exporter-images.ts:425:36 | Network request uses a non-literal or non-obviously safe URL. Validate and normalize user-controlled URLs before requesting them. |
| ERROR | ssrf-user-controlled-urls | src/features/integrations/services/imports/base-client/core.ts:160:27 | Network request uses a non-literal or non-obviously safe URL. Validate and normalize user-controlled URLs before requesting them. |
| ERROR | ssrf-user-controlled-urls | src/features/integrations/services/imports/base-client/core.ts:223:32 | Network request uses a non-literal or non-obviously safe URL. Validate and normalize user-controlled URLs before requesting them. |
| ERROR | weak-randomness | src/features/integrations/services/imports/base-import-error-utils.ts:246:34 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | ssrf-user-controlled-urls | src/features/integrations/services/imports/base-import-item-processor.ts:195:32 | Network request uses a non-literal or non-obviously safe URL. Validate and normalize user-controlled URLs before requesting them. |
| ERROR | regex-safety-and-dynamic-input | src/features/integrations/services/imports/base-import-run-repository.ts:256:28 | RegExp constructor uses a non-literal or non-escaped pattern source. Review dynamic regex input for safety and runaway-pattern risk. |
| ERROR | weak-randomness | src/features/integrations/services/imports/base-import-service.ts:368:49 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | nosql-findone-injection | src/features/integrations/services/producer-mapping-repository.ts:192:48 | findOne() query is not an inline object literal. Review helper-built or user-influenced filters for NoSQL injection risk. |
| ERROR | nosql-findone-injection | src/features/integrations/services/producer-mapping-repository.ts:212:48 | findOne() query is not an inline object literal. Review helper-built or user-influenced filters for NoSQL injection risk. |
| ERROR | nosql-findone-injection | src/features/integrations/services/tag-mapping-repository.ts:192:48 | findOne() query is not an inline object literal. Review helper-built or user-influenced filters for NoSQL injection risk. |
| ERROR | nosql-findone-injection | src/features/integrations/services/tag-mapping-repository.ts:212:48 | findOne() query is not an inline object literal. Review helper-built or user-influenced filters for NoSQL injection risk. |
| ERROR | regex-safety-and-dynamic-input | src/features/integrations/services/tradera-api-client.ts:70:5 | RegExp constructor uses a non-literal or non-escaped pattern source. Review dynamic regex input for safety and runaway-pattern risk. |
| ERROR | ssrf-user-controlled-urls | src/features/integrations/services/tradera-api-client.ts:187:34 | Network request uses a non-literal or non-obviously safe URL. Validate and normalize user-controlled URLs before requesting them. |
| ERROR | regex-safety-and-dynamic-input | src/features/integrations/services/tradera-api-client.ts:318:45 | RegExp constructor uses a non-literal or non-escaped pattern source. Review dynamic regex input for safety and runaway-pattern risk. |
| ERROR | weak-randomness | src/features/integrations/services/tradera-browser-test-utils.ts:42:21 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | filesystem-path-taint | src/features/integrations/services/tradera-browser-test-utils.ts:143:28 | File-system path is non-literal or built from non-obviously safe input. Review for path traversal and user-controlled path usage. |
| ERROR | filesystem-path-taint | src/features/integrations/services/tradera-browser-test-utils.ts:158:25 | File-system path is non-literal or built from non-obviously safe input. Review for path traversal and user-controlled path usage. |
| ERROR | filesystem-path-taint | src/features/integrations/services/tradera-listing/utils.ts:130:21 | File-system path is non-literal or built from non-obviously safe input. Review for path traversal and user-controlled path usage. |
| ERROR | weak-randomness | src/features/kangur/admin/components/KangurAiTutorNativeGuideSettingsPanel.tsx:63:78 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | weak-randomness | src/features/kangur/admin/context/KangurQuestionIllustrationContext.tsx:16:65 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | weak-randomness | src/features/kangur/admin/hooks/useKangurPageContentMutations.ts:45:51 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | weak-randomness | src/features/kangur/admin/hooks/useKangurPageContentMutations.ts:48:47 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | weak-randomness | src/features/kangur/admin/hooks/useKangurQuestionsMutations.ts:382:20 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | weak-randomness | src/features/kangur/appearance/admin/workspace/ThemeCatalogModal.tsx:134:25 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | weak-randomness | src/features/kangur/cms-builder/project-sections.ts:79:26 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | weak-randomness | src/features/kangur/lesson-documents/utils.ts:98:28 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | weak-randomness | src/features/kangur/number-balance/server.ts:203:27 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | weak-randomness | src/features/kangur/observability/client.ts:63:45 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | filesystem-path-taint | src/features/kangur/server/launch-route-dev-snapshot.ts:33:32 | File-system path is non-literal or built from non-obviously safe input. Review for path traversal and user-controlled path usage. |
| ERROR | filesystem-path-taint | src/features/kangur/server/launch-route-dev-snapshot.ts:53:7 | File-system path is non-literal or built from non-obviously safe input. Review for path traversal and user-controlled path usage. |
| ERROR | weak-randomness | src/features/kangur/services/guest-kangur-scores.ts:35:57 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | weak-randomness | src/features/kangur/services/guest-kangur-scores.ts:43:59 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | nosql-findone-injection | src/features/kangur/services/kangur-learner-repository.ts:398:46 | findOne() query is not an inline object literal. Review helper-built or user-influenced filters for NoSQL injection risk. |
| ERROR | open-redirects | src/features/kangur/services/local-kangur-platform.ts:347:34 | Redirect target is non-literal or not obviously same-origin. Review redirect sinks for user-controlled navigation targets. |
| ERROR | weak-randomness | src/features/kangur/settings.ts:389:50 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | ssrf-user-controlled-urls | src/features/kangur/social/admin/workspace/hooks/useSocialContext.ts:76:45 | Network request uses a non-literal or non-obviously safe URL. Validate and normalize user-controlled URLs before requesting them. |
| ERROR | weak-randomness | src/features/kangur/social/server/social-image-addons-batch-jobs.ts:42:60 | Math.random() is not cryptographically secure. Use crypto.getRandomValues or node:crypto helpers for security-sensitive randomness. |
| ERROR | ssrf-user-controlled-urls | src/features/kangur/social/server/social-posts-publish.linkedin.ts:55:5 | Network request uses a non-literal or non-obviously safe URL. Validate and normalize user-controlled URLs before requesting them. |
| ERROR | ssrf-user-controlled-urls | src/features/kangur/social/server/social-posts-publish.linkedin.ts:165:32 | Network request uses a non-literal or non-obviously safe URL. Validate and normalize user-controlled URLs before requesting them. |
| ERROR | ssrf-user-controlled-urls | src/features/kangur/social/server/social-posts-publish.linkedin.ts:221:32 | Network request uses a non-literal or non-obviously safe URL. Validate and normalize user-controlled URLs before requesting them. |
| ERROR | ssrf-user-controlled-urls | src/features/kangur/social/server/social-posts-publish.linkedin.ts:248:34 | Network request uses a non-literal or non-obviously safe URL. Validate and normalize user-controlled URLs before requesting them. |
| ERROR | ssrf-user-controlled-urls | src/features/kangur/social/server/social-posts-publish.linkedin.ts:389:34 | Network request uses a non-literal or non-obviously safe URL. Validate and normalize user-controlled URLs before requesting them. |
| ERROR | ssrf-user-controlled-urls | src/features/kangur/social/server/social-posts-publish.linkedin.ts:501:34 | Network request uses a non-literal or non-obviously safe URL. Validate and normalize user-controlled URLs before requesting them. |

> Showing first 200 of 420 issues.

## Notes

- This scanner normalizes external rule names onto the local quality framework.
- `implemented` rules are translated from existing analyzers and parity detectors.
- `eslint` entries are reconciled separately against the local ESLint coverage map so pending parity gaps stay visible.
- Keep ESLint changes narrow. Use this parity lane for the broader external taxonomy.
