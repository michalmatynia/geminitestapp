---
owner: 'Products / Platform Team'
last_reviewed: '2026-04-11'
status: 'generated'
doc_type: 'generated'
scope: 'feature:validator'
canonical: true
---
# Validator Function Inventory

| File | Symbol | ID | JSDoc | Catalog |
| --- | --- | --- | --- | --- |
| `src/features/products/validation-engine/core.ts:49` | `normalizeValidationDebounceMs` | core.normalizeValidationDebounceMs | yes | yes |
| `src/features/products/validation-engine/core.ts:57` | `normalizePostAcceptBehavior` | core.normalizePostAcceptBehavior | yes | yes |
| `src/features/products/validation-engine/core.ts:63` | `normalizePatternSequence` | core.normalizePatternSequence | yes | yes |
| `src/features/products/validation-engine/core.ts:76` | `normalizePatternChainMode` | core.normalizePatternChainMode | yes | yes |
| `src/features/products/validation-engine/core.ts:88` | `normalizePatternMaxExecutions` | core.normalizePatternMaxExecutions | yes | yes |
| `src/features/products/validation-engine/core.ts:105` | `buildSequenceGroupCounts` | core.buildSequenceGroupCounts | yes | yes |
| `src/features/products/validation-engine/core.ts:121` | `isPatternInSequenceGroup` | core.isPatternInSequenceGroup | yes | yes |
| `src/features/products/validation-engine/core.ts:133` | `sortValidatorPatterns` | core.sortValidatorPatterns | yes | yes |
| `src/features/products/validation-engine/core.ts:152` | `resolveFieldTargetAndLocale` | core.resolveFieldTargetAndLocale | yes | yes |
| `src/features/products/validation-engine/core.ts:185` | `isPatternLocaleMatch` | core.isPatternLocaleMatch | yes | yes |
| `src/features/products/validation-engine/core.ts:197` | `normalizeReplacementFields` | core.normalizeReplacementFields | yes | yes |
| `src/features/products/validation-engine/core.ts:210` | `isReplacementAllowedForField` | core.isReplacementAllowedForField | yes | yes |
| `src/features/products/validation-engine/core.ts:247` | `isPatternConfiguredForFormatterAutoApply` | core.isPatternConfiguredForFormatterAutoApply | yes | yes |
| `src/features/products/validation-engine/core.ts:262` | `allowsPatternExecutionWithoutRegexMatch` | core.allowsPatternExecutionWithoutRegexMatch | yes | yes |
| `src/features/products/validation-engine/core.ts:272` | `isLatestPriceStockMirrorPattern` | core.isLatestPriceStockMirrorPattern | yes | yes |
| `src/features/products/validation-engine/core.ts:286` | `isRuntimePatternEnabled` | core.isRuntimePatternEnabled | yes | yes |
| `src/features/products/validation-engine/core.ts:322` | `resolvePatternLaunchSourceValue` | core.resolvePatternLaunchSourceValue | yes | yes |
| `src/features/products/validation-engine/core.ts:340` | `shouldLaunchPattern` | core.shouldLaunchPattern | yes | yes |
| `src/features/products/validation-engine/core.ts:380` | `resolvePatternReplacementValue` | core.resolvePatternReplacementValue | yes | yes |
| `src/features/products/validation-engine/core.ts:418` | `applyResolvedReplacement` | core.applyResolvedReplacement | yes | yes |
| `src/features/products/validation-engine/core.ts:451` | `deriveDiffSegment` | core.deriveDiffSegment | yes | yes |
| `src/features/products/validation-engine/core.ts:742` | `buildFieldIssues` | core.buildFieldIssues | yes | yes |
| `src/features/products/validation-engine/core.ts:808` | `mergeFieldIssueMaps` | core.mergeFieldIssueMaps | yes | yes |
| `src/features/products/validation-engine/core.ts:823` | `areIssueMapsEquivalent` | core.areIssueMapsEquivalent | yes | yes |
| `src/features/products/validation-engine/core.ts:865` | `getIssueReplacementPreview` | core.getIssueReplacementPreview | yes | yes |
| `src/features/products/components/settings/validator-settings/helpers.ts:92` | `normalizeReplacementFields` | helpers.normalizeReplacementFields | yes | yes |
| `src/features/products/components/settings/validator-settings/helpers.ts:106` | `formatReplacementFields` | helpers.formatReplacementFields | yes | yes |
| `src/features/products/components/settings/validator-settings/helpers.ts:115` | `getReplacementFieldsForTarget` | helpers.getReplacementFieldsForTarget | yes | yes |
| `src/features/products/components/settings/validator-settings/helpers.ts:129` | `isLocaleTarget` | helpers.isLocaleTarget | yes | yes |
| `src/features/products/components/settings/validator-settings/helpers.ts:135` | `isLatestFieldMirrorPattern` | helpers.isLatestFieldMirrorPattern | yes | yes |
| `src/features/products/components/settings/validator-settings/helpers.ts:151` | `isNameSecondSegmentDimensionPattern` | helpers.isNameSecondSegmentDimensionPattern | yes | yes |
| `src/features/products/components/settings/validator-settings/helpers.ts:167` | `getSourceFieldOptionsForTarget` | helpers.getSourceFieldOptionsForTarget | yes | yes |
| `src/features/products/components/settings/validator-settings/helpers.ts:176` | `buildDynamicRecipeFromForm` | helpers.buildDynamicRecipeFromForm | yes | yes |
| `src/features/products/components/settings/validator-settings/helpers.ts:221` | `buildLatestFieldRecipe` | helpers.buildLatestFieldRecipe | yes | yes |
| `src/features/products/components/settings/validator-settings/helpers.ts:248` | `buildDuplicateLabel` | helpers.buildDuplicateLabel | yes | yes |
| `src/features/products/components/settings/validator-settings/helpers.ts:263` | `buildUniqueLabel` | helpers.buildUniqueLabel | yes | yes |
| `src/features/products/components/settings/validator-settings/helpers.ts:277` | `getPatternSequence` | helpers.getPatternSequence | yes | yes |
| `src/features/products/components/settings/validator-settings/helpers.ts:290` | `getSequenceGroupId` | helpers.getSequenceGroupId | yes | yes |
| `src/features/products/components/settings/validator-settings/helpers.ts:305` | `sortPatternsBySequence` | helpers.sortPatternsBySequence | yes | yes |
| `src/features/products/components/settings/validator-settings/helpers.ts:326` | `reorderPatterns` | helpers.reorderPatterns | yes | yes |
| `src/features/products/components/settings/validator-settings/helpers.ts:352` | `createSequenceGroupId` | helpers.createSequenceGroupId | yes | yes |
| `src/features/products/components/settings/validator-settings/helpers.ts:360` | `normalizeSequenceGroupDebounceMs` | helpers.normalizeSequenceGroupDebounceMs | yes | yes |
| `src/features/products/components/settings/validator-settings/helpers.ts:368` | `canCompileRegex` | helpers.canCompileRegex | yes | yes |
| `src/features/products/components/settings/validator-settings/helpers.ts:381` | `buildSequenceGroups` | helpers.buildSequenceGroups | yes | yes |
| `src/features/products/components/settings/validator-settings/controller-form-utils.ts:20` | `buildFormDataFromPattern` | controller.buildFormDataFromPattern | yes | yes |
| `src/features/products/components/settings/validator-settings/controller-sequence-actions.ts:24` | `createSequenceActions` | controller.createSequenceActions | yes | yes |
| `src/features/products/components/settings/validator-settings/useValidatorSettingsController.ts:60` | `useValidatorSettingsController` | controller.useValidatorSettingsController | yes | yes |
| `src/features/products/components/settings/ValidatorSettings.tsx:16` | `ValidatorSettings` | ui.ValidatorSettings | yes | no |
| `src/features/products/components/settings/validator-settings/ValidatorSettingsContext.tsx:22` | `ValidatorSettingsProvider` | ui.ValidatorSettingsProvider | yes | no |
| `src/features/products/components/settings/validator-settings/ValidatorDefaultPanel.tsx:16` | `ValidatorDefaultPanel` | ui.ValidatorDefaultPanel | yes | no |
| `src/features/products/components/settings/validator-settings/ValidatorInstanceBehaviorPanel.tsx:18` | `ValidatorInstanceBehaviorPanel` | ui.ValidatorInstanceBehaviorPanel | yes | no |
| `src/features/products/components/settings/validator-settings/ValidatorPatternTablePanel.tsx:20` | `ValidatorPatternTablePanel` | ui.ValidatorPatternTablePanel | yes | no |
| `src/features/products/components/settings/validator-settings/ValidatorPatternModal.tsx:29` | `ValidatorPatternModal` | ui.ValidatorPatternModal | yes | no |
| `src/features/admin/pages/AdminValidatorPatternListsPage.tsx:172` | `AdminValidatorPatternListsPage` | ui.AdminValidatorPatternListsPage | yes | no |
