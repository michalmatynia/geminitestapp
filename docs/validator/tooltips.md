---
owner: 'Products / Platform Team'
last_reviewed: '2026-03-30'
status: 'generated'
doc_type: 'generated'
scope: 'feature:validator'
canonical: true
---
# Validator Tooltip Reference

These tooltips are consumed directly by validator UI components when `Docs Tooltips` is enabled.

| ID | Title | Description | Related Functions |
| --- | --- | --- | --- |
| ui.ValidatorSettings | Validator Settings | Top-level validator settings composition root for the admin validator surface. | ui.ValidatorSettingsProvider, ui.ValidatorPatternTablePanel |
| ui.ValidatorSettingsProvider | Validator Settings Provider | Provides the validator settings controller through React context. | ui.useValidatorSettingsContext |
| ui.useValidatorSettingsContext | Validator Settings Context Hook | Reads the validator settings controller from context for nested panels and modals. | ui.ValidatorSettingsProvider |
| ui.ValidatorDefaultPanel | Validator Default Panel | Controls whether validator behavior is enabled by default for product form instances. | controller.useValidatorSettingsController |
| ui.ValidatorInstanceBehaviorPanel | Validator Instance Behavior Panel | Configures per-scope deny and instance behavior for validator prompts. | controller.useValidatorSettingsController |
| ui.ValidatorPatternTablePanel | Validator Pattern Table Panel | Renders the validator pattern list with ordering, row actions, and sequence controls. | helpers.sortPatternsBySequence, controller.useValidatorSettingsController |
| ui.ValidatorPatternModal | Validator Pattern Modal | Modal surface for creating and editing validator patterns, replacements, and runtime options. | helpers.buildDynamicRecipeFromForm, controller.buildFormDataFromPattern |
| ui.AdminValidatorPatternListsPage | Admin Validator Pattern Lists Page | Admin page for managing validator pattern lists, locking state, and list-level persistence. | ui.ValidatorSettings, controller.useValidatorSettingsController |
| ui.validatorSettingsPanel | Validator Settings Panel | Main admin interface for configuring global and scoped validation rules. | helpers.sortPatternsBySequence, helpers.buildSequenceGroups, controller.useValidatorSettingsController |
| ui.patternEditModal | Pattern Edit Modal | Specialized form for creating and updating individual validation patterns. | helpers.buildDynamicRecipeFromForm, helpers.canCompileRegex, controller.buildFormDataFromPattern |
| ui.productFormValidation | Product Form Validation | Real-time validation and formatting feedback in the product editor. | core.buildFieldIssues, core.isPatternConfiguredForFormatterAutoApply, core.getIssueReplacementPreview |
