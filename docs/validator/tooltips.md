---
owner: 'Products / Platform Team'
last_reviewed: '2026-03-28'
status: 'generated'
doc_type: 'generated'
scope: 'feature:validator'
canonical: true
---
# Validator Tooltip Reference

These tooltips are consumed directly by validator UI components when `Docs Tooltips` is enabled.

| ID | Title | Description | Related Functions |
| --- | --- | --- | --- |
| validator.docs.toggle | Docs Tooltip Toggle | Enables inline docs hover tooltips for validator actions and controls. | ui.ValidatorSettings |
| validator.default.toggle | Validator Default Toggle | Controls if validation is enabled by default in product create/edit screens. | ui.ValidatorDefaultPanel, controller.useValidatorSettingsController |
| validator.instance.behavior.select | Instance Deny Behavior | Sets whether denial stops future prompts in session or asks again next validation. | ui.ValidatorInstanceBehaviorPanel, controller.useValidatorSettingsController |
| validator.patterns.add | Add Pattern | Opens pattern modal to create a new validator rule. | controller.useValidatorSettingsController, ui.ValidatorPatternModal |
| validator.patterns.sequence.sku | SKU Auto Sequence | Creates SKU auto-increment + guard sequence templates. | controller.createSequenceActions |
| validator.patterns.sequence.latestPriceStock | Latest Price & Stock | Creates or updates mirror templates for latest price and stock values. | controller.createSequenceActions, helpers.buildLatestFieldRecipe |
| validator.patterns.sequence.nameDimensions | Name Segment -> Dimensions | Creates templates to infer length/height from name segment #2. | controller.createSequenceActions |
| validator.patterns.sequence.nameCategory | Name Segment -> Category | Creates template to map name segment to category. | controller.createSequenceActions |
| validator.patterns.sequence.nameMirrorPl | Name EN -> PL Sequence | Creates sequence that mirrors English name into Polish and applies category replacements. | controller.createSequenceActions |
| validator.pattern.drag | Pattern Drag Handle | Drag pattern row onto another row to create or extend sequence group. | controller.useValidatorSettingsController, helpers.reorderPatterns |
| validator.pattern.toggle | Pattern Enabled Toggle | Enables or disables a single pattern without editing details. | controller.useValidatorSettingsController |
| validator.pattern.duplicate | Duplicate Pattern | Copies pattern with a unique label and independent sequence assignment. | controller.useValidatorSettingsController, helpers.buildDuplicateLabel |
| validator.pattern.edit | Edit Pattern | Loads selected pattern into modal for editing. | controller.useValidatorSettingsController, controller.buildFormDataFromPattern |
| validator.pattern.delete | Delete Pattern | Marks pattern for deletion and opens confirmation dialog. | controller.useValidatorSettingsController |
| validator.group.save | Save Group | Persists group label and debounce to all patterns in sequence group. | controller.createSequenceActions |
| validator.group.ungroup | Ungroup | Removes sequence group metadata from all grouped patterns. | controller.createSequenceActions |
| validator.modal.save | Save Pattern | Validates form data, then creates or updates pattern entity. | controller.useValidatorSettingsController |
| validator.modal.target | Target Selector | Selects product field target for regex validation. | helpers.getReplacementFieldsForTarget, helpers.getSourceFieldOptionsForTarget |
| validator.modal.applyScopes | Apply In Forms | Controls which form contexts execute this pattern. | core.shouldLaunchPattern |
| validator.modal.launch.toggle | Launch Condition Toggle | Enables launch gate block for pattern execution. | core.shouldLaunchPattern, core.resolvePatternLaunchSourceValue |
| validator.modal.runtime.toggle | Runtime Validator Toggle | Enables runtime evaluation through DB query or AI prompt. | core.isRuntimePatternEnabled |
| validator.modal.replacement.toggle | Replacement Toggle | Enables replacement proposal generation for pattern matches. | core.resolvePatternReplacementValue, core.applyResolvedReplacement |
| validator.modal.replacement.autoApply | Auto-Apply Replacement | Applies replacement directly without manual accept step. | core.buildFieldIssues |
| validator.modal.replacement.skipNoop | Skip No-Op Proposals | Hides replacement proposals when replacement equals current value. | core.buildFieldIssues |
| validator.modal.regex | Regex & Flags | Defines pattern matching logic and regex engine flags. | helpers.canCompileRegex, core.buildFieldIssues |
| validator.modal.launch.config | Launch Config | Controls source, operator, and value used to gate execution. | core.resolvePatternLaunchSourceValue, core.shouldLaunchPattern |
| validator.modal.runtime.config | Runtime Config | JSON configuration consumed by runtime evaluator endpoint. | core.isRuntimePatternEnabled |
| validator.modal.sequence | Sequence Controls | Controls execution order, chaining, and max executions in sequence mode. | core.normalizePatternSequence, core.normalizePatternChainMode, core.normalizePatternMaxExecutions |
