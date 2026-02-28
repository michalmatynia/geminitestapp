# Validator Function Reference

Generated from `src/features/products/components/settings/validator-settings/validator-docs-catalog.ts`.

| ID                                          | Symbol                                | File                                                                                              | Purpose                                                                                   |
| ------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| core.normalizeValidationDebounceMs          | `normalizeValidationDebounceMs`       | `src/features/products/validation-engine/core.ts`                                                 | Clamps and normalizes debounce value to an integer between 0 and 30000 ms.                |
| core.normalizePostAcceptBehavior            | `normalizePostAcceptBehavior`         | `src/features/products/validation-engine/core.ts`                                                 | Normalizes post-accept behavior to supported enum values.                                 |
| core.normalizePatternSequence               | `normalizePatternSequence`            | `src/features/products/validation-engine/core.ts`                                                 | Produces a deterministic sequence index for ordering patterns.                            |
| core.normalizePatternChainMode              | `normalizePatternChainMode`           | `src/features/products/validation-engine/core.ts`                                                 | Normalizes chain execution mode for grouped patterns.                                     |
| core.normalizePatternMaxExecutions          | `normalizePatternMaxExecutions`       | `src/features/products/validation-engine/core.ts`                                                 | Bounds max execution count for iterative regex processing.                                |
| core.buildSequenceGroupCounts               | `buildSequenceGroupCounts`            | `src/features/products/validation-engine/core.ts`                                                 | Counts enabled sequence-grouped patterns by scope key.                                    |
| core.isPatternInSequenceGroup               | `isPatternInSequenceGroup`            | `src/features/products/validation-engine/core.ts`                                                 | Determines if a pattern belongs to a multi-step sequence.                                 |
| core.sortValidatorPatterns                  | `sortValidatorPatterns`               | `src/features/products/validation-engine/core.ts`                                                 | Sorts patterns by sequence, target, and label for deterministic runtime order.            |
| core.resolveFieldTargetAndLocale            | `resolveFieldTargetAndLocale`         | `src/features/products/validation-engine/core.ts`                                                 | Maps form field names to validator target and locale context.                             |
| core.isPatternLocaleMatch                   | `isPatternLocaleMatch`                | `src/features/products/validation-engine/core.ts`                                                 | Checks locale compatibility between pattern and field.                                    |
| core.normalizeReplacementFields             | `normalizeReplacementFields`          | `src/features/products/validation-engine/core.ts`                                                 | Validates, deduplicates, and normalizes replacement field allowlist.                      |
| core.isReplacementAllowedForField           | `isReplacementAllowedForField`        | `src/features/products/validation-engine/core.ts`                                                 | Checks whether replacement is permitted for a specific form field.                        |
| core.isLatestPriceStockMirrorPattern        | `isLatestPriceStockMirrorPattern`     | `src/features/products/validation-engine/core.ts`                                                 | Detects dynamic mirror patterns pulling latest price or stock values.                     |
| core.isRuntimePatternEnabled                | `isRuntimePatternEnabled`             | `src/features/products/validation-engine/core.ts`                                                 | Identifies patterns delegated to runtime evaluator.                                       |
| core.resolvePatternLaunchSourceValue        | `resolvePatternLaunchSourceValue`     | `src/features/products/validation-engine/core.ts`                                                 | Resolves the value used to evaluate launch condition.                                     |
| core.shouldLaunchPattern                    | `shouldLaunchPattern`                 | `src/features/products/validation-engine/core.ts`                                                 | Evaluates launch gates for static and sequence patterns.                                  |
| core.resolvePatternReplacementValue         | `resolvePatternReplacementValue`      | `src/features/products/validation-engine/core.ts`                                                 | Resolves static or dynamic replacement payload for matched pattern.                       |
| core.applyResolvedReplacement               | `applyResolvedReplacement`            | `src/features/products/validation-engine/core.ts`                                                 | Applies replacement to value using recipe apply mode.                                     |
| core.deriveDiffSegment                      | `deriveDiffSegment`                   | `src/features/products/validation-engine/core.ts`                                                 | Computes minimal changed segment between original and replaced values.                    |
| core.buildFieldIssues                       | `buildFieldIssues`                    | `src/features/products/validation-engine/core.ts`                                                 | Builds static validator issues by applying eligible patterns to each field.               |
| core.mergeFieldIssueMaps                    | `mergeFieldIssueMaps`                 | `src/features/products/validation-engine/core.ts`                                                 | Merges static and runtime issue maps by field.                                            |
| core.areIssueMapsEquivalent                 | `areIssueMapsEquivalent`              | `src/features/products/validation-engine/core.ts`                                                 | Performs deep structural equality check for issue maps.                                   |
| core.getIssueReplacementPreview             | `getIssueReplacementPreview`          | `src/features/products/validation-engine/core.ts`                                                 | Generates preview value for a single issue replacement.                                   |
| helpers.normalizeReplacementFields          | `normalizeReplacementFields`          | `src/features/products/components/settings/validator-settings/helpers.ts`                         | Normalizes replacement fields selected in modal/controller state.                         |
| helpers.formatReplacementFields             | `formatReplacementFields`             | `src/features/products/components/settings/validator-settings/helpers.ts`                         | Formats replacement field list into user-facing label string.                             |
| helpers.getReplacementFieldsForTarget       | `getReplacementFieldsForTarget`       | `src/features/products/components/settings/validator-settings/helpers.ts`                         | Returns replacement fields allowed for target.                                            |
| helpers.isLocaleTarget                      | `isLocaleTarget`                      | `src/features/products/components/settings/validator-settings/helpers.ts`                         | Indicates if target supports locale selector.                                             |
| helpers.isLatestFieldMirrorPattern          | `isLatestFieldMirrorPattern`          | `src/features/products/components/settings/validator-settings/helpers.ts`                         | Detects auto-template latest value mirror patterns for price/stock.                       |
| helpers.isNameSecondSegmentDimensionPattern | `isNameSecondSegmentDimensionPattern` | `src/features/products/components/settings/validator-settings/helpers.ts`                         | Detects name segment templates used for length/height mapping.                            |
| helpers.getSourceFieldOptionsForTarget      | `getSourceFieldOptionsForTarget`      | `src/features/products/components/settings/validator-settings/helpers.ts`                         | Returns source-field options for dynamic replacement and launch settings.                 |
| helpers.buildDynamicRecipeFromForm          | `buildDynamicRecipeFromForm`          | `src/features/products/components/settings/validator-settings/helpers.ts`                         | Builds dynamic replacement recipe object from modal form state.                           |
| helpers.buildLatestFieldRecipe              | `buildLatestFieldRecipe`              | `src/features/products/components/settings/validator-settings/helpers.ts`                         | Builds encoded dynamic recipe for latest product field mirror templates.                  |
| helpers.buildDuplicateLabel                 | `buildDuplicateLabel`                 | `src/features/products/components/settings/validator-settings/helpers.ts`                         | Generates unique duplicate label with copy suffix.                                        |
| helpers.buildUniqueLabel                    | `buildUniqueLabel`                    | `src/features/products/components/settings/validator-settings/helpers.ts`                         | Builds unique label by incrementing numeric suffix.                                       |
| helpers.getPatternSequence                  | `getPatternSequence`                  | `src/features/products/components/settings/validator-settings/helpers.ts`                         | Normalizes sequence value used in settings sorting.                                       |
| helpers.getSequenceGroupId                  | `getSequenceGroupId`                  | `src/features/products/components/settings/validator-settings/helpers.ts`                         | Returns normalized sequence group identifier or null.                                     |
| helpers.sortPatternsBySequence              | `sortPatternsBySequence`              | `src/features/products/components/settings/validator-settings/helpers.ts`                         | Sorts pattern table records by sequence then target then label.                           |
| helpers.reorderPatterns                     | `reorderPatterns`                     | `src/features/products/components/settings/validator-settings/helpers.ts`                         | Reorders pattern list for drag-and-drop sequencing operations.                            |
| helpers.createSequenceGroupId               | `createSequenceGroupId`               | `src/features/products/components/settings/validator-settings/helpers.ts`                         | Creates unique sequence group id for ad-hoc grouping.                                     |
| helpers.normalizeSequenceGroupDebounceMs    | `normalizeSequenceGroupDebounceMs`    | `src/features/products/components/settings/validator-settings/helpers.ts`                         | Clamps sequence group debounce to 0..30000 integer range.                                 |
| helpers.canCompileRegex                     | `canCompileRegex`                     | `src/features/products/components/settings/validator-settings/helpers.ts`                         | Validates regex source/flags in UI before save.                                           |
| helpers.buildSequenceGroups                 | `buildSequenceGroups`                 | `src/features/products/components/settings/validator-settings/helpers.ts`                         | Builds grouped sequence metadata for table rendering and editing.                         |
| controller.buildFormDataFromPattern         | `buildFormDataFromPattern`            | `src/features/products/components/settings/validator-settings/controller-form-utils.ts`           | Converts persisted pattern entity into editable modal form state.                         |
| controller.createSequenceActions            | `createSequenceActions`               | `src/features/products/components/settings/validator-settings/controller-sequence-actions.ts`     | Builds all advanced template/group action handlers used by validator settings controller. |
| controller.useValidatorSettingsController   | `useValidatorSettingsController`      | `src/features/products/components/settings/validator-settings/useValidatorSettingsController.ts`  | Main orchestration hook for validator settings data, modal state, and mutations.          |
| scope.defaultValidatorPatternLists          | `defaultValidatorPatternLists`        | `src/features/admin/pages/validator-scope.ts`                                                     | Builds default pattern list configuration for each validator scope.                       |
| scope.parseValidatorScope                   | `parseValidatorScope`                 | `src/features/admin/pages/validator-scope.ts`                                                     | Normalizes URL/query scope values to known validator scope enum.                          |
| scope.normalizeValidatorPatternLists        | `normalizeValidatorPatternLists`      | `src/features/admin/pages/validator-scope.ts`                                                     | Normalizes and sanitizes persisted list manager payload.                                  |
| scope.parseValidatorPatternLists            | `parseValidatorPatternLists`          | `src/features/admin/pages/validator-scope.ts`                                                     | Parses settings JSON payload into normalized validator pattern lists.                     |
| ui.ValidatorSettings                        | `ValidatorSettings`                   | `src/features/products/components/settings/ValidatorSettings.tsx`                                 | Top-level validator settings composition root.                                            |
| ui.ValidatorSettingsProvider                | `ValidatorSettingsProvider`           | `src/features/products/components/settings/validator-settings/ValidatorSettingsContext.tsx`       | Provides controller instance via React context.                                           |
| ui.useValidatorSettingsContext              | `useValidatorSettingsContext`         | `src/features/products/components/settings/validator-settings/ValidatorSettingsContext.tsx`       | Reads validator settings controller from context.                                         |
| ui.ValidatorDefaultPanel                    | `ValidatorDefaultPanel`               | `src/features/products/components/settings/validator-settings/ValidatorDefaultPanel.tsx`          | Renders default-on/off validator behavior toggle for product forms.                       |
| ui.ValidatorInstanceBehaviorPanel           | `ValidatorInstanceBehaviorPanel`      | `src/features/products/components/settings/validator-settings/ValidatorInstanceBehaviorPanel.tsx` | Renders deny behavior selectors for each validation scope.                                |
| ui.ValidatorPatternTablePanel               | `ValidatorPatternTablePanel`          | `src/features/products/components/settings/validator-settings/ValidatorPatternTablePanel.tsx`     | Renders pattern table, sequence controls, and row-level actions.                          |
| ui.ValidatorPatternModal                    | `ValidatorPatternModal`               | `src/features/products/components/settings/validator-settings/ValidatorPatternModal.tsx`          | Renders modal for creating/editing validation patterns and runtime configuration.         |
| ui.AdminGlobalValidatorPage                 | `AdminGlobalValidatorPage`            | `src/features/admin/pages/AdminGlobalValidatorPage.tsx`                                           | Switches active validator panel based on selected pattern list/scope.                     |
| ui.AdminValidatorPatternListsPage           | `AdminValidatorPatternListsPage`      | `src/features/admin/pages/AdminValidatorPatternListsPage.tsx`                                     | Manages creation, editing, locking, and persistence of validator pattern lists.           |

### core.normalizeValidationDebounceMs

- File: `src/features/products/validation-engine/core.ts`
- Symbol: `normalizeValidationDebounceMs`
- Purpose: Clamps and normalizes debounce value to an integer between 0 and 30000 ms.
- Parameters: value: unknown raw debounce value from persisted settings or request payload.
- Returns: Safe debounce delay in milliseconds.
- Errors: No throws.
- Edge Cases: Non-finite numbers resolve to 0. Negative values clamp to 0.
- Example: `normalizeValidationDebounceMs(31200.8) // 30000`

### core.normalizePostAcceptBehavior

- File: `src/features/products/validation-engine/core.ts`
- Symbol: `normalizePostAcceptBehavior`
- Purpose: Normalizes post-accept behavior to supported enum values.
- Parameters: value: unknown incoming post-accept behavior.
- Returns: revalidate or stop_after_accept.
- Errors: No throws.
- Edge Cases: Unknown values fallback to revalidate.
- Example: `normalizePostAcceptBehavior('stop_after_accept')`

### core.normalizePatternSequence

- File: `src/features/products/validation-engine/core.ts`
- Symbol: `normalizePatternSequence`
- Purpose: Produces a deterministic sequence index for ordering patterns.
- Parameters: pattern: pattern record. fallbackIndex: array index when sequence is unset.
- Returns: Non-negative integer sequence number.
- Errors: No throws.
- Edge Cases: Missing sequence uses (fallbackIndex + 1) \* 10.
- Example: `normalizePatternSequence(pattern, 3)`

### core.normalizePatternChainMode

- File: `src/features/products/validation-engine/core.ts`
- Symbol: `normalizePatternChainMode`
- Purpose: Normalizes chain execution mode for grouped patterns.
- Parameters: pattern: pattern containing optional chainMode.
- Returns: continue, stop_on_match, or stop_on_replace.
- Errors: No throws.
- Edge Cases: Unsupported values fallback to continue.
- Example: `normalizePatternChainMode(pattern)`

### core.normalizePatternMaxExecutions

- File: `src/features/products/validation-engine/core.ts`
- Symbol: `normalizePatternMaxExecutions`
- Purpose: Bounds max execution count for iterative regex processing.
- Parameters: pattern: pattern with optional maxExecutions.
- Returns: Integer in range 1..20.
- Errors: No throws.
- Edge Cases: Invalid values fallback to 1.
- Example: `normalizePatternMaxExecutions(pattern)`

### core.buildSequenceGroupCounts

- File: `src/features/products/validation-engine/core.ts`
- Symbol: `buildSequenceGroupCounts`
- Purpose: Counts enabled sequence-grouped patterns by scope key.
- Parameters: patterns: ordered pattern list.
- Returns: Map keyed by group+target+locale scope.
- Errors: No throws.
- Edge Cases: Disabled patterns are excluded.
- Example: `buildSequenceGroupCounts(patterns)`

### core.isPatternInSequenceGroup

- File: `src/features/products/validation-engine/core.ts`
- Symbol: `isPatternInSequenceGroup`
- Purpose: Determines if a pattern belongs to a multi-step sequence.
- Parameters: pattern: candidate pattern. counts: map produced by buildSequenceGroupCounts.
- Returns: True when group size is greater than one.
- Errors: No throws.
- Edge Cases: Missing group id returns false.
- Example: `isPatternInSequenceGroup(pattern, counts)`

### core.sortValidatorPatterns

- File: `src/features/products/validation-engine/core.ts`
- Symbol: `sortValidatorPatterns`
- Purpose: Sorts patterns by sequence, target, and label for deterministic runtime order.
- Parameters: patterns: unsorted pattern list.
- Returns: New sorted array.
- Errors: No throws.
- Edge Cases: Stable fallback ordering uses target and label.
- Example: `sortValidatorPatterns(patterns)`

### core.resolveFieldTargetAndLocale

- File: `src/features/products/validation-engine/core.ts`
- Symbol: `resolveFieldTargetAndLocale`
- Purpose: Maps form field names to validator target and locale context.
- Parameters: fieldName: form key such as name_en or sku.
- Returns: target and locale tuple.
- Errors: No throws.
- Edge Cases: Unknown fields return target=null.
- Example: `resolveFieldTargetAndLocale('name_pl')`

### core.isPatternLocaleMatch

- File: `src/features/products/validation-engine/core.ts`
- Symbol: `isPatternLocaleMatch`
- Purpose: Checks locale compatibility between pattern and field.
- Parameters: patternLocale: locale configured on pattern. fieldLocale: locale inferred from field name.
- Returns: Boolean locale match decision.
- Errors: No throws.
- Edge Cases: Pattern without locale matches any locale.
- Example: `isPatternLocaleMatch('pl', 'pl')`

### core.normalizeReplacementFields

- File: `src/features/products/validation-engine/core.ts`
- Symbol: `normalizeReplacementFields`
- Purpose: Validates, deduplicates, and normalizes replacement field allowlist.
- Parameters: fields: optional replacement field list.
- Returns: Filtered unique list of allowed fields.
- Errors: No throws.
- Edge Cases: Invalid entries are dropped silently.
- Example: `normalizeReplacementFields(['sku', 'sku'])`

### core.isReplacementAllowedForField

- File: `src/features/products/validation-engine/core.ts`
- Symbol: `isReplacementAllowedForField`
- Purpose: Checks whether replacement is permitted for a specific form field.
- Parameters: pattern: pattern with replacement configuration. fieldName: form field name.
- Returns: Boolean allow/deny.
- Errors: No throws.
- Edge Cases: Empty allowlist means global replacement.
- Example: `isReplacementAllowedForField(pattern, 'name_en')`

### core.isLatestPriceStockMirrorPattern

- File: `src/features/products/validation-engine/core.ts`
- Symbol: `isLatestPriceStockMirrorPattern`
- Purpose: Detects dynamic mirror patterns pulling latest price or stock values.
- Parameters: pattern: candidate pattern.
- Returns: True when pattern is latest_product_field mirror for price/stock.
- Errors: No throws.
- Edge Cases: Non-dynamic replacement values return false.
- Example: `isLatestPriceStockMirrorPattern(pattern)`

### core.isRuntimePatternEnabled

- File: `src/features/products/validation-engine/core.ts`
- Symbol: `isRuntimePatternEnabled`
- Purpose: Identifies patterns delegated to runtime evaluator.
- Parameters: pattern: candidate pattern.
- Returns: True when runtimeEnabled is set and runtimeType is not none.
- Errors: No throws.
- Edge Cases: Disabled runtimeType none always returns false.
- Example: `isRuntimePatternEnabled(pattern)`

### core.resolvePatternLaunchSourceValue

- File: `src/features/products/validation-engine/core.ts`
- Symbol: `resolvePatternLaunchSourceValue`
- Purpose: Resolves the value used to evaluate launch condition.
- Parameters: pattern: pattern launch settings. fieldValue: current field value. values: full form values. latestProductValues: latest persisted product snapshot.
- Returns: Source value string used by launch operator.
- Errors: No throws.
- Edge Cases: Missing source field resolves to empty string.
- Example: `resolvePatternLaunchSourceValue({ pattern, fieldValue, values, latestProductValues })`

### core.shouldLaunchPattern

- File: `src/features/products/validation-engine/core.ts`
- Symbol: `shouldLaunchPattern`
- Purpose: Evaluates launch gates for static and sequence patterns.
- Parameters: pattern: candidate pattern. validationScope: current form instance scope. fieldValue: field value under validation. values: full form values. latestProductValues: latest persisted product snapshot.
- Returns: Boolean launch decision.
- Errors: No throws.
- Edge Cases: Missing external source field blocks launch. Out-of-scope behavior depends on launchScopeBehavior.
- Example: `shouldLaunchPattern({ pattern, validationScope, fieldValue, values, latestProductValues })`

### core.resolvePatternReplacementValue

- File: `src/features/products/validation-engine/core.ts`
- Symbol: `resolvePatternReplacementValue`
- Purpose: Resolves static or dynamic replacement payload for matched pattern.
- Parameters: pattern: candidate pattern. fieldValue: current field value. values: full form values. latestProductValues: latest persisted product snapshot.
- Returns: Resolved replacement object or null.
- Errors: No throws.
- Edge Cases: Invalid dynamic recipe returns null. Dynamic recipes always use replace_whole_field.
- Example: `resolvePatternReplacementValue({ pattern, fieldValue, values, latestProductValues })`

### core.applyResolvedReplacement

- File: `src/features/products/validation-engine/core.ts`
- Symbol: `applyResolvedReplacement`
- Purpose: Applies replacement to value using recipe apply mode.
- Parameters: value: current field value. pattern: pattern regex/flags context. replacement: resolved replacement data.
- Returns: Rewritten field value.
- Errors: Regex compilation errors are swallowed and original value is returned.
- Edge Cases: No replacement value returns original input.
- Example: `applyResolvedReplacement({ value, pattern, replacement })`

### core.deriveDiffSegment

- File: `src/features/products/validation-engine/core.ts`
- Symbol: `deriveDiffSegment`
- Purpose: Computes minimal changed segment between original and replaced values.
- Parameters: before: original value. after: final value.
- Returns: Diff index, length, and matchText snippet.
- Errors: No throws.
- Edge Cases: Equal strings produce a single-character fallback segment.
- Example: `deriveDiffSegment('abc', 'axc')`

### core.buildFieldIssues

- File: `src/features/products/validation-engine/core.ts`
- Symbol: `buildFieldIssues`
- Purpose: Builds static validator issues by applying eligible patterns to each field.
- Parameters: values: form values map. patterns: all validation patterns. latestProductValues: latest persisted product values. validationScope: form instance scope.
- Returns: Map of field names to issue arrays.
- Errors: Invalid regex in persisted pattern is skipped defensively.
- Edge Cases: Sequence groups merge outputs into one issue. No-op replacements can be suppressed per pattern setting.
- Example: `buildFieldIssues({ values, patterns, latestProductValues, validationScope })`

### core.mergeFieldIssueMaps

- File: `src/features/products/validation-engine/core.ts`
- Symbol: `mergeFieldIssueMaps`
- Purpose: Merges static and runtime issue maps by field.
- Parameters: staticIssues: issues from static engine. runtimeIssues: issues from runtime evaluator.
- Returns: Combined issue map.
- Errors: No throws.
- Edge Cases: Fields existing in one map are preserved.
- Example: `mergeFieldIssueMaps(staticIssues, runtimeIssues)`

### core.areIssueMapsEquivalent

- File: `src/features/products/validation-engine/core.ts`
- Symbol: `areIssueMapsEquivalent`
- Purpose: Performs deep structural equality check for issue maps.
- Parameters: left: previous issue map. right: next issue map.
- Returns: True when both maps contain identical ordered issues.
- Errors: No throws.
- Edge Cases: Order differences count as non-equivalent.
- Example: `areIssueMapsEquivalent(prev, next)`

### core.getIssueReplacementPreview

- File: `src/features/products/validation-engine/core.ts`
- Symbol: `getIssueReplacementPreview`
- Purpose: Generates preview value for a single issue replacement.
- Parameters: value: current field value. issue: issue record with replacement metadata.
- Returns: Preview value after applying issue replacement.
- Errors: Regex errors are swallowed and original value is returned.
- Edge Cases: Whole-field apply mode bypasses regex replace path.
- Example: `getIssueReplacementPreview(value, issue)`

### helpers.normalizeReplacementFields

- File: `src/features/products/components/settings/validator-settings/helpers.ts`
- Symbol: `normalizeReplacementFields`
- Purpose: Normalizes replacement fields selected in modal/controller state.
- Parameters: fields: candidate replacement field list.
- Returns: Validated and deduplicated replacement fields.
- Errors: No throws.
- Edge Cases: Invalid fields are removed.
- Example: `normalizeReplacementFields(['name_en', 'name_en'])`

### helpers.formatReplacementFields

- File: `src/features/products/components/settings/validator-settings/helpers.ts`
- Symbol: `formatReplacementFields`
- Purpose: Formats replacement field list into user-facing label string.
- Parameters: fields: replacement fields list.
- Returns: Localized display text.
- Errors: No throws.
- Edge Cases: Empty list maps to all matching fields.
- Example: `formatReplacementFields(pattern.replacementFields)`

### helpers.getReplacementFieldsForTarget

- File: `src/features/products/components/settings/validator-settings/helpers.ts`
- Symbol: `getReplacementFieldsForTarget`
- Purpose: Returns replacement fields allowed for target.
- Parameters: target: pattern target from form state.
- Returns: List of allowed replacement field keys.
- Errors: No throws.
- Edge Cases: Unknown target falls back to sku.
- Example: `getReplacementFieldsForTarget('name')`

### helpers.isLocaleTarget

- File: `src/features/products/components/settings/validator-settings/helpers.ts`
- Symbol: `isLocaleTarget`
- Purpose: Indicates if target supports locale selector.
- Parameters: target: pattern target.
- Returns: True for name and description targets.
- Errors: No throws.
- Edge Cases: Non-localized targets return false.
- Example: `isLocaleTarget('sku')`

### helpers.isLatestFieldMirrorPattern

- File: `src/features/products/components/settings/validator-settings/helpers.ts`
- Symbol: `isLatestFieldMirrorPattern`
- Purpose: Detects auto-template latest value mirror patterns for price/stock.
- Parameters: pattern: existing pattern. field: price or stock target.
- Returns: Boolean match result.
- Errors: No throws.
- Edge Cases: Static replacers are not treated as mirror patterns.
- Example: `isLatestFieldMirrorPattern(pattern, 'price')`

### helpers.isNameSecondSegmentDimensionPattern

- File: `src/features/products/components/settings/validator-settings/helpers.ts`
- Symbol: `isNameSecondSegmentDimensionPattern`
- Purpose: Detects name segment templates used for length/height mapping.
- Parameters: pattern: existing pattern. target: size_length or length.
- Returns: Boolean match result.
- Errors: No throws.
- Edge Cases: Requires form_field name_en dynamic recipe.
- Example: `isNameSecondSegmentDimensionPattern(pattern, 'length')`

### helpers.getSourceFieldOptionsForTarget

- File: `src/features/products/components/settings/validator-settings/helpers.ts`
- Symbol: `getSourceFieldOptionsForTarget`
- Purpose: Returns source-field options for dynamic replacement and launch settings.
- Parameters: target: pattern target currently selected.
- Returns: Array of selectable source field options.
- Errors: No throws.
- Edge Cases: Current implementation returns common source list for all targets.
- Example: `getSourceFieldOptionsForTarget(formData.target)`

### helpers.buildDynamicRecipeFromForm

- File: `src/features/products/components/settings/validator-settings/helpers.ts`
- Symbol: `buildDynamicRecipeFromForm`
- Purpose: Builds dynamic replacement recipe object from modal form state.
- Parameters: formData: full pattern modal state.
- Returns: Dynamic recipe or null when required source data is missing.
- Errors: No throws.
- Edge Cases: Numeric fields are normalized to finite numbers or null.
- Example: `buildDynamicRecipeFromForm(formData)`

### helpers.buildLatestFieldRecipe

- File: `src/features/products/components/settings/validator-settings/helpers.ts`
- Symbol: `buildLatestFieldRecipe`
- Purpose: Builds encoded dynamic recipe for latest product field mirror templates.
- Parameters: field: price or stock.
- Returns: Encoded recipe string.
- Errors: No throws.
- Edge Cases: Always sets replace_whole_field target apply mode.
- Example: `buildLatestFieldRecipe('stock')`

### helpers.buildDuplicateLabel

- File: `src/features/products/components/settings/validator-settings/helpers.ts`
- Symbol: `buildDuplicateLabel`
- Purpose: Generates unique duplicate label with copy suffix.
- Parameters: label: base pattern label. existingLabels: lowercase label set.
- Returns: Unique duplicate label.
- Errors: No throws.
- Edge Cases: Empty label falls back to Pattern.
- Example: `buildDuplicateLabel(pattern.label, existingLabels)`

### helpers.buildUniqueLabel

- File: `src/features/products/components/settings/validator-settings/helpers.ts`
- Symbol: `buildUniqueLabel`
- Purpose: Builds unique label by incrementing numeric suffix.
- Parameters: label: desired label. existingLabels: lowercase label set.
- Returns: Unique label not present in existing set.
- Errors: No throws.
- Edge Cases: Empty label falls back to Pattern.
- Example: `buildUniqueLabel('Price from latest product', labels)`

### helpers.getPatternSequence

- File: `src/features/products/components/settings/validator-settings/helpers.ts`
- Symbol: `getPatternSequence`
- Purpose: Normalizes sequence value used in settings sorting.
- Parameters: pattern: candidate pattern. fallbackIndex: index fallback.
- Returns: Non-negative integer sequence.
- Errors: No throws.
- Edge Cases: Missing sequence uses fallback slot spacing.
- Example: `getPatternSequence(pattern, index)`

### helpers.getSequenceGroupId

- File: `src/features/products/components/settings/validator-settings/helpers.ts`
- Symbol: `getSequenceGroupId`
- Purpose: Returns normalized sequence group identifier or null.
- Parameters: pattern: candidate pattern.
- Returns: Trimmed group id or null.
- Errors: No throws.
- Edge Cases: Whitespace-only ids are treated as null.
- Example: `getSequenceGroupId(pattern)`

### helpers.sortPatternsBySequence

- File: `src/features/products/components/settings/validator-settings/helpers.ts`
- Symbol: `sortPatternsBySequence`
- Purpose: Sorts pattern table records by sequence then target then label.
- Parameters: patterns: unsorted patterns list.
- Returns: Sorted pattern array.
- Errors: No throws.
- Edge Cases: Ties are resolved using target and label lexical order.
- Example: `sortPatternsBySequence(patterns)`

### helpers.reorderPatterns

- File: `src/features/products/components/settings/validator-settings/helpers.ts`
- Symbol: `reorderPatterns`
- Purpose: Reorders pattern list for drag-and-drop sequencing operations.
- Parameters: patterns: ordered list. draggedId: dragged pattern id. targetId: drop target pattern id.
- Returns: Reordered list or null when no-op/invalid.
- Errors: No throws.
- Edge Cases: Dropping onto same id returns null.
- Example: `reorderPatterns(patterns, 'a', 'b')`

### helpers.createSequenceGroupId

- File: `src/features/products/components/settings/validator-settings/helpers.ts`
- Symbol: `createSequenceGroupId`
- Purpose: Creates unique sequence group id for ad-hoc grouping.
- Parameters:
- Returns: String id with seq\_ prefix.
- Errors: No throws.
- Edge Cases: Uses Date.now plus random suffix for collision resistance.
- Example: `createSequenceGroupId()`

### helpers.normalizeSequenceGroupDebounceMs

- File: `src/features/products/components/settings/validator-settings/helpers.ts`
- Symbol: `normalizeSequenceGroupDebounceMs`
- Purpose: Clamps sequence group debounce to 0..30000 integer range.
- Parameters: value: candidate debounce value.
- Returns: Safe debounce number.
- Errors: No throws.
- Edge Cases: Non-number values fallback to 0.
- Example: `normalizeSequenceGroupDebounceMs(1200.8)`

### helpers.canCompileRegex

- File: `src/features/products/components/settings/validator-settings/helpers.ts`
- Symbol: `canCompileRegex`
- Purpose: Validates regex source/flags in UI before save.
- Parameters: pattern: regex source. flags: regex flags.
- Returns: True when RegExp constructor succeeds.
- Errors: No throws (exceptions are caught).
- Edge Cases: Empty flags are treated as undefined.
- Example: `canCompileRegex('^KEY', 'i')`

### helpers.buildSequenceGroups

- File: `src/features/products/components/settings/validator-settings/helpers.ts`
- Symbol: `buildSequenceGroups`
- Purpose: Builds grouped sequence metadata for table rendering and editing.
- Parameters: patterns: ordered patterns list.
- Returns: Map of sequence group views keyed by group id.
- Errors: No throws.
- Edge Cases: First non-empty label in a group becomes display label.
- Example: `buildSequenceGroups(orderedPatterns)`

### controller.buildFormDataFromPattern

- File: `src/features/products/components/settings/validator-settings/controller-form-utils.ts`
- Symbol: `buildFormDataFromPattern`
- Purpose: Converts persisted pattern entity into editable modal form state.
- Parameters: pattern: persisted pattern object.
- Returns: PatternFormData ready for modal editing.
- Errors: No throws.
- Edge Cases: Runtime none is remapped to database_query when runtime toggle is enabled.
- Example: `buildFormDataFromPattern(pattern)`

### controller.createSequenceActions

- File: `src/features/products/components/settings/validator-settings/controller-sequence-actions.ts`
- Symbol: `createSequenceActions`
- Purpose: Builds all advanced template/group action handlers used by validator settings controller.
- Parameters: input: dependencies and mutation callbacks for sequence/template actions.
- Returns: Action handlers object consumed by controller.
- Errors: Handlers catch errors and route failures to notifyError + logClientError.
- Edge Cases: Some template actions fallback to local creation when template endpoints fail.
- Example: `const actions = createSequenceActions({...})`

### controller.useValidatorSettingsController

- File: `src/features/products/components/settings/validator-settings/useValidatorSettingsController.ts`
- Symbol: `useValidatorSettingsController`
- Purpose: Main orchestration hook for validator settings data, modal state, and mutations.
- Parameters:
- Returns: ValidatorSettingsController interface consumed by UI panels.
- Errors: Mutation errors are surfaced via toasts and observability logs.
- Edge Cases: Reorder flow includes optimistic grouping draft updates and stale timestamp checks.
- Example: `const controller = useValidatorSettingsController()`

### scope.defaultValidatorPatternLists

- File: `src/features/admin/pages/validator-scope.ts`
- Symbol: `defaultValidatorPatternLists`
- Purpose: Builds default pattern list configuration for each validator scope.
- Parameters:
- Returns: Default list array with current timestamps.
- Errors: No throws.
- Edge Cases: All default lists are deletion locked.
- Example: `defaultValidatorPatternLists()`

### scope.parseValidatorScope

- File: `src/features/admin/pages/validator-scope.ts`
- Symbol: `parseValidatorScope`
- Purpose: Normalizes URL/query scope values to known validator scope enum.
- Parameters: value: raw scope string from query or persisted payload.
- Returns: Validated scope enum value.
- Errors: No throws.
- Edge Cases: Unknown values fallback to products scope.
- Example: `parseValidatorScope('image-studio')`

### scope.normalizeValidatorPatternLists

- File: `src/features/admin/pages/validator-scope.ts`
- Symbol: `normalizeValidatorPatternLists`
- Purpose: Normalizes and sanitizes persisted list manager payload.
- Parameters: value: candidate list array.
- Returns: Validated unique-id list array.
- Errors: No throws.
- Edge Cases: Empty input returns defaults.
- Example: `normalizeValidatorPatternLists(lists)`

### scope.parseValidatorPatternLists

- File: `src/features/admin/pages/validator-scope.ts`
- Symbol: `parseValidatorPatternLists`
- Purpose: Parses settings JSON payload into normalized validator pattern lists.
- Parameters: value: persisted setting string.
- Returns: Normalized list array.
- Errors: JSON parse errors fallback to defaults.
- Edge Cases: Supports both legacy array payload and object payload with lists key.
- Example: `parseValidatorPatternLists(rawSetting)`

### ui.ValidatorSettings

- File: `src/features/products/components/settings/ValidatorSettings.tsx`
- Symbol: `ValidatorSettings`
- Purpose: Top-level validator settings composition root.
- Parameters:
- Returns: Composed validator settings UI with modal and deletion confirmation.
- Errors: No throws.
- Edge Cases: Provider boundary is required for child panels.
- Example: `<ValidatorSettings />`

### ui.ValidatorSettingsProvider

- File: `src/features/products/components/settings/validator-settings/ValidatorSettingsContext.tsx`
- Symbol: `ValidatorSettingsProvider`
- Purpose: Provides controller instance via React context.
- Parameters: value: controller object. children: subtree.
- Returns: Context provider element.
- Errors: No throws.
- Edge Cases: useValidatorSettingsContext throws if provider is missing.
- Example: `<ValidatorSettingsProvider value={controller}>{children}</ValidatorSettingsProvider>`

### ui.useValidatorSettingsContext

- File: `src/features/products/components/settings/validator-settings/ValidatorSettingsContext.tsx`
- Symbol: `useValidatorSettingsContext`
- Purpose: Reads validator settings controller from context.
- Parameters:
- Returns: ValidatorSettingsController object.
- Errors: Throws internalError when used outside provider.
- Edge Cases: No fallback controller is provided intentionally.
- Example: `const controller = useValidatorSettingsContext()`

### ui.ValidatorDefaultPanel

- File: `src/features/products/components/settings/validator-settings/ValidatorDefaultPanel.tsx`
- Symbol: `ValidatorDefaultPanel`
- Purpose: Renders default-on/off validator behavior toggle for product forms.
- Parameters:
- Returns: Panel section component.
- Errors: No throws.
- Edge Cases: Toggle disabled while settings mutation is pending.
- Example: `<ValidatorDefaultPanel />`

### ui.ValidatorInstanceBehaviorPanel

- File: `src/features/products/components/settings/validator-settings/ValidatorInstanceBehaviorPanel.tsx`
- Symbol: `ValidatorInstanceBehaviorPanel`
- Purpose: Renders deny behavior selectors for each validation scope.
- Parameters:
- Returns: Panel section component.
- Errors: No throws.
- Edge Cases: Options lock while settings mutation is pending.
- Example: `<ValidatorInstanceBehaviorPanel />`

### ui.ValidatorPatternTablePanel

- File: `src/features/products/components/settings/validator-settings/ValidatorPatternTablePanel.tsx`
- Symbol: `ValidatorPatternTablePanel`
- Purpose: Renders pattern table, sequence controls, and row-level actions.
- Parameters:
- Returns: Pattern management panel component.
- Errors: No throws.
- Edge Cases: Drag-drop is disabled while reorder mutations are active.
- Example: `<ValidatorPatternTablePanel />`

### ui.ValidatorPatternModal

- File: `src/features/products/components/settings/validator-settings/ValidatorPatternModal.tsx`
- Symbol: `ValidatorPatternModal`
- Purpose: Renders modal for creating/editing validation patterns and runtime configuration.
- Parameters:
- Returns: Modal component or null when closed.
- Errors: No throws.
- Edge Cases: Returns null when showModal is false.
- Example: `<ValidatorPatternModal />`

### ui.AdminGlobalValidatorPage

- File: `src/features/admin/pages/AdminGlobalValidatorPage.tsx`
- Symbol: `AdminGlobalValidatorPage`
- Purpose: Switches active validator panel based on selected pattern list/scope.
- Parameters:
- Returns: Global validator admin page.
- Errors: No throws.
- Edge Cases: Falls back to first available list when query params are missing.
- Example: `<AdminGlobalValidatorPage />`

### ui.AdminValidatorPatternListsPage

- File: `src/features/admin/pages/AdminValidatorPatternListsPage.tsx`
- Symbol: `AdminValidatorPatternListsPage`
- Purpose: Manages creation, editing, locking, and persistence of validator pattern lists.
- Parameters:
- Returns: List manager page component.
- Errors: Save errors are surfaced via toast.
- Edge Cases: At least one list must remain after delete.
- Example: `<AdminValidatorPatternListsPage />`
