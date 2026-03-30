export type ValidatorUiDoc = {
  id: string;
  title: string;
  description: string;
  relatedFunctions: string[];
};

export const VALIDATOR_UI_DOCS: ValidatorUiDoc[] = [
  {
    id: 'ui.ValidatorSettings',
    title: 'Validator Settings',
    description: 'Top-level validator settings composition root for the admin validator surface.',
    relatedFunctions: ['ui.ValidatorSettingsProvider', 'ui.ValidatorPatternTablePanel'],
  },
  {
    id: 'ui.ValidatorSettingsProvider',
    title: 'Validator Settings Provider',
    description: 'Provides the validator settings controller through React context.',
    relatedFunctions: ['ui.useValidatorSettingsContext'],
  },
  {
    id: 'ui.useValidatorSettingsContext',
    title: 'Validator Settings Context Hook',
    description: 'Reads the validator settings controller from context for nested panels and modals.',
    relatedFunctions: ['ui.ValidatorSettingsProvider'],
  },
  {
    id: 'ui.ValidatorDefaultPanel',
    title: 'Validator Default Panel',
    description: 'Controls whether validator behavior is enabled by default for product form instances.',
    relatedFunctions: ['controller.useValidatorSettingsController'],
  },
  {
    id: 'ui.ValidatorInstanceBehaviorPanel',
    title: 'Validator Instance Behavior Panel',
    description: 'Configures per-scope deny and instance behavior for validator prompts.',
    relatedFunctions: ['controller.useValidatorSettingsController'],
  },
  {
    id: 'ui.ValidatorPatternTablePanel',
    title: 'Validator Pattern Table Panel',
    description: 'Renders the validator pattern list with ordering, row actions, and sequence controls.',
    relatedFunctions: [
      'helpers.sortPatternsBySequence',
      'controller.useValidatorSettingsController',
    ],
  },
  {
    id: 'ui.ValidatorPatternModal',
    title: 'Validator Pattern Modal',
    description:
      'Modal surface for creating and editing validator patterns, replacements, and runtime options.',
    relatedFunctions: [
      'helpers.buildDynamicRecipeFromForm',
      'controller.buildFormDataFromPattern',
    ],
  },
  {
    id: 'ui.AdminValidatorPatternListsPage',
    title: 'Admin Validator Pattern Lists Page',
    description:
      'Admin page for managing validator pattern lists, locking state, and list-level persistence.',
    relatedFunctions: ['ui.ValidatorSettings', 'controller.useValidatorSettingsController'],
  },
  {
    id: 'ui.validatorSettingsPanel',
    title: 'Validator Settings Panel',
    description: 'Main admin interface for configuring global and scoped validation rules.',
    relatedFunctions: [
      'helpers.sortPatternsBySequence',
      'helpers.buildSequenceGroups',
      'controller.useValidatorSettingsController',
    ],
  },
  {
    id: 'ui.patternEditModal',
    title: 'Pattern Edit Modal',
    description: 'Specialized form for creating and updating individual validation patterns.',
    relatedFunctions: [
      'helpers.buildDynamicRecipeFromForm',
      'helpers.canCompileRegex',
      'controller.buildFormDataFromPattern',
    ],
  },
  {
    id: 'ui.productFormValidation',
    title: 'Product Form Validation',
    description: 'Real-time validation and formatting feedback in the product editor.',
    relatedFunctions: [
      'core.buildFieldIssues',
      'core.isPatternConfiguredForFormatterAutoApply',
      'core.getIssueReplacementPreview',
    ],
  },
];
