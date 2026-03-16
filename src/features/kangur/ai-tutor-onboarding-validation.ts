import { REQUIRED_KANGUR_AI_TUTOR_NATIVE_GUIDE_COVERAGE } from '@/features/kangur/ai-tutor-native-guide-coverage';
import type { KangurAiTutorContent } from '@/features/kangur/shared/contracts/kangur-ai-tutor-content';
import type { KangurAiTutorNativeGuideStore } from '@/features/kangur/shared/contracts/kangur-ai-tutor-native-guide';
import type {
  PromptEngineSettings,
  PromptValidationIssue,
  PromptValidationSeverity,
} from '@/shared/contracts/prompt-engine';
import type { ValidatorPatternList } from '@/shared/contracts/validator';
import {
  preparePromptValidationRuntime,
  validateProgrammaticPromptWithRuntime,
} from '@/shared/lib/prompt-engine/prompt-validator';

export const KANGUR_AI_TUTOR_ONBOARDING_VALIDATOR_LIST_ID = 'kangur-ai-tutor-onboarding';
export const KANGUR_AI_TUTOR_ONBOARDING_VALIDATOR_SCOPE = 'kangur-ai-tutor-onboarding';
export const KANGUR_AI_TUTOR_ONBOARDING_PROMPT_SCOPE = 'kangur_ai_tutor_onboarding';

export const KANGUR_AI_TUTOR_ONBOARDING_RULE_IDS = [
  'kangur.onboarding.no_placeholders',
  'kangur.onboarding.no_raw_urls',
  'kangur.onboarding.no_admin_tokens',
  'kangur.onboarding.non_spoiler_hints',
] as const;

const NON_SPOILER_HINT_RULE_ID = 'kangur.onboarding.non_spoiler_hints';

type RequiredOnboardingFocusKind = keyof KangurAiTutorContent['homeOnboarding']['steps'];

const REQUIRED_ONBOARDING_FOCUS_KINDS: readonly RequiredOnboardingFocusKind[] = [
  'home_actions',
  'home_quest',
  'priority_assignments',
  'leaderboard',
  'progress',
];

export type KangurAiTutorOnboardingValidationField =
  | 'id'
  | 'title'
  | 'shortDescription'
  | 'fullDescription'
  | 'hints'
  | 'triggerPhrases'
  | 'relatedGames'
  | 'relatedTests'
  | 'followUpActions'
  | 'sequence';

export type KangurAiTutorOnboardingValidationIssue = {
  entryId: string | null;
  field: KangurAiTutorOnboardingValidationField;
  severity: PromptValidationSeverity;
  title: string;
  message: string;
  ruleId: string | null;
  sequenceGroupId: string | null;
  blocking: boolean;
};

export type KangurAiTutorOnboardingValidationResultDto<TIssue> = {
  listId: string;
  listName: string;
  ruleIds: string[];
  issues: TIssue[];
  blockingIssues: TIssue[];
};

export type KangurAiTutorOnboardingContentValidationIssue = {
  path: string;
  severity: PromptValidationSeverity;
  title: string;
  message: string;
  ruleId: string | null;
  sequenceGroupId: string | null;
  blocking: boolean;
};

export type KangurAiTutorOnboardingValidationResult =
  KangurAiTutorOnboardingValidationResultDto<KangurAiTutorOnboardingValidationIssue>;

export type KangurAiTutorOnboardingContentValidationResult =
  KangurAiTutorOnboardingValidationResultDto<KangurAiTutorOnboardingContentValidationIssue>;

const toPromptValidationIssue = (
  issue: PromptValidationIssue,
  entryId: string,
  field: KangurAiTutorOnboardingValidationField,
  sequenceGroupId: string | null
): KangurAiTutorOnboardingValidationIssue => ({
  entryId,
  field,
  severity: issue.severity,
  title: issue.title,
  message: issue.message,
  ruleId: issue.ruleId,
  sequenceGroupId,
  blocking: issue.severity === 'error',
});

const createCustomIssue = ({
  entryId,
  field,
  severity,
  title,
  message,
  ruleId,
  sequenceGroupId,
}: {
  entryId: string | null;
  field: KangurAiTutorOnboardingValidationField;
  severity: PromptValidationSeverity;
  title: string;
  message: string;
  ruleId: string;
  sequenceGroupId: string | null;
}): KangurAiTutorOnboardingValidationIssue => ({
  entryId,
  field,
  severity,
  title,
  message,
  ruleId,
  sequenceGroupId,
  blocking: severity === 'error',
});

const resolveOnboardingPatternList = (
  patternLists: ValidatorPatternList[]
): ValidatorPatternList | null =>
  patternLists.find((list) => list.id === KANGUR_AI_TUTOR_ONBOARDING_VALIDATOR_LIST_ID) ??
  patternLists.find((list) => list.scope === KANGUR_AI_TUTOR_ONBOARDING_VALIDATOR_SCOPE) ??
  null;

const normalizeRuleIds = (
  candidateRuleIds: readonly string[],
  availableRuleIds: Set<string>
): string[] => candidateRuleIds.filter((ruleId) => availableRuleIds.has(ruleId));

const validateTextField = ({
  entryId,
  field,
  value,
  includeRuleIds,
  runtimeRuleGroups,
  runtime,
}: {
  entryId: string;
  field: KangurAiTutorOnboardingValidationField;
  value: string;
  includeRuleIds: string[];
  runtimeRuleGroups: Map<string, string | null>;
  runtime: ReturnType<typeof preparePromptValidationRuntime>;
}): KangurAiTutorOnboardingValidationIssue[] => {
  if (includeRuleIds.length === 0 || value.trim().length === 0) {
    return [];
  }

  return validateProgrammaticPromptWithRuntime(value, runtime, {
    includeRuleIds,
  }).map((issue: PromptValidationIssue) =>
    toPromptValidationIssue(issue, entryId, field, runtimeRuleGroups.get(issue.ruleId) ?? null)
  );
};

const buildOnboardingRuntimeContext = (
  patternLists: ValidatorPatternList[],
  promptEngineSettings: PromptEngineSettings
) => {
  const list =
    resolveOnboardingPatternList(patternLists) ??
    ({
      id: KANGUR_AI_TUTOR_ONBOARDING_VALIDATOR_LIST_ID,
      name: 'Kangur AI Tutor Onboarding',
      description: '',
      scope: KANGUR_AI_TUTOR_ONBOARDING_VALIDATOR_SCOPE,
      deletionLocked: true,
      patterns: [...KANGUR_AI_TUTOR_ONBOARDING_RULE_IDS],
      isActive: true,
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
    } satisfies ValidatorPatternList);

  const runtime = preparePromptValidationRuntime(promptEngineSettings.promptValidation, {
    scope: KANGUR_AI_TUTOR_ONBOARDING_PROMPT_SCOPE,
  });
  const runtimeRuleIds = new Set(runtime.orderedRules.map((rule) => rule.id));
  const selectedRuleIds = normalizeRuleIds(
    list.patterns.length > 0 ? list.patterns : [...KANGUR_AI_TUTOR_ONBOARDING_RULE_IDS],
    runtimeRuleIds
  );
  const runtimeRuleGroups = new Map(
    runtime.orderedRules.map((rule) => [rule.id, rule.sequenceGroupId?.trim() || null])
  );

  return {
    list,
    runtime,
    selectedRuleIds,
    contentRuleIds: selectedRuleIds.filter((ruleId) => ruleId !== NON_SPOILER_HINT_RULE_ID),
    runtimeRuleGroups,
  };
};

export function validateKangurAiTutorOnboardingStore({
  store,
  patternLists,
  promptEngineSettings,
}: {
  store: KangurAiTutorNativeGuideStore;
  patternLists: ValidatorPatternList[];
  promptEngineSettings: PromptEngineSettings;
}): KangurAiTutorOnboardingValidationResult {
  const { list, runtime, selectedRuleIds, contentRuleIds, runtimeRuleGroups } =
    buildOnboardingRuntimeContext(patternLists, promptEngineSettings);
  const issues: KangurAiTutorOnboardingValidationIssue[] = [];

  const entryIds = new Map<string, number>();
  for (const entry of store.entries) {
    entryIds.set(entry.id, (entryIds.get(entry.id) ?? 0) + 1);
  }

  for (const entry of store.entries) {
    if ((entryIds.get(entry.id) ?? 0) > 1) {
      issues.push(
        createCustomIssue({
          entryId: entry.id,
          field: 'id',
          severity: 'error',
          title: 'Unique entry ids',
          message: `Entry id "${entry.id}" is duplicated. Each native guide entry must have a unique id.`,
          ruleId: 'kangur.onboarding.unique_entry_ids',
          sequenceGroupId: 'kangur_onboarding_guardrails',
        })
      );
    }

    issues.push(
      ...validateTextField({
        entryId: entry.id,
        field: 'title',
        value: entry.title,
        includeRuleIds: contentRuleIds,
        runtimeRuleGroups,
        runtime,
      }),
      ...validateTextField({
        entryId: entry.id,
        field: 'shortDescription',
        value: entry.shortDescription,
        includeRuleIds: contentRuleIds,
        runtimeRuleGroups,
        runtime,
      }),
      ...validateTextField({
        entryId: entry.id,
        field: 'fullDescription',
        value: entry.fullDescription,
        includeRuleIds: contentRuleIds,
        runtimeRuleGroups,
        runtime,
      }),
      ...validateTextField({
        entryId: entry.id,
        field: 'triggerPhrases',
        value: entry.triggerPhrases.join('\n'),
        includeRuleIds: contentRuleIds,
        runtimeRuleGroups,
        runtime,
      }),
      ...validateTextField({
        entryId: entry.id,
        field: 'relatedGames',
        value: entry.relatedGames.join('\n'),
        includeRuleIds: contentRuleIds,
        runtimeRuleGroups,
        runtime,
      }),
      ...validateTextField({
        entryId: entry.id,
        field: 'relatedTests',
        value: entry.relatedTests.join('\n'),
        includeRuleIds: contentRuleIds,
        runtimeRuleGroups,
        runtime,
      }),
      ...validateTextField({
        entryId: entry.id,
        field: 'hints',
        value: entry.hints.join('\n'),
        includeRuleIds: selectedRuleIds,
        runtimeRuleGroups,
        runtime,
      })
    );

    const followUpActionIds = new Set<string>();
    const duplicateFollowUpIds = new Set<string>();
    for (const action of entry.followUpActions) {
      const normalizedActionId = action.id.trim();
      if (!normalizedActionId) continue;
      if (followUpActionIds.has(normalizedActionId)) {
        duplicateFollowUpIds.add(normalizedActionId);
      }
      followUpActionIds.add(normalizedActionId);
    }

    if (duplicateFollowUpIds.size > 0) {
      issues.push(
        createCustomIssue({
          entryId: entry.id,
          field: 'followUpActions',
          severity: 'error',
          title: 'Unique follow-up action ids',
          message: `Follow-up actions must use unique ids. Duplicates: ${[
            ...duplicateFollowUpIds,
          ].join(', ')}.`,
          ruleId: 'kangur.onboarding.unique_followup_ids',
          sequenceGroupId: 'kangur_onboarding_guardrails',
        })
      );
    }
  }

  const enabledEntryIds = new Set(
    store.entries.filter((entry) => entry.enabled).map((entry) => entry.id)
  );
  const missingGuideCoverage = REQUIRED_KANGUR_AI_TUTOR_NATIVE_GUIDE_COVERAGE.filter(
    (requirement) => !enabledEntryIds.has(requirement.entryId)
  );

  if (missingGuideCoverage.length > 0) {
    issues.push(
      createCustomIssue({
        entryId: null,
        field: 'sequence',
        severity: 'error',
        title: 'Required native guide coverage',
        message: `Missing enabled Mongo knowledge-base coverage for: ${missingGuideCoverage
          .map((requirement) => requirement.label)
          .join(', ')}.`,
        ruleId: 'kangur.onboarding.required_entry_coverage',
        sequenceGroupId: 'kangur_onboarding_coverage',
      })
    );
  }

  return {
    listId: list.id,
    listName: list.name,
    ruleIds: selectedRuleIds,
    issues,
    blockingIssues: issues.filter((issue) => issue.blocking),
  };
}

export function validateKangurAiTutorOnboardingContent({
  content,
  patternLists,
  promptEngineSettings,
}: {
  content: KangurAiTutorContent;
  patternLists: ValidatorPatternList[];
  promptEngineSettings: PromptEngineSettings;
}): KangurAiTutorOnboardingContentValidationResult {
  const { list, runtime, selectedRuleIds, contentRuleIds, runtimeRuleGroups } =
    buildOnboardingRuntimeContext(patternLists, promptEngineSettings);

  const issues: KangurAiTutorOnboardingContentValidationIssue[] = [];

  const validatePath = ({
    path,
    value,
    includeRuleIds,
  }: {
    path: string;
    value: string;
    includeRuleIds: string[];
  }) => {
    if (value.trim().length === 0 || includeRuleIds.length === 0) {
      return;
    }
    const nextIssues = validateProgrammaticPromptWithRuntime(value, runtime, {
      includeRuleIds,
    }).map((issue: PromptValidationIssue) => ({
      path,
      severity: issue.severity,
      title: issue.title,
      message: issue.message,
      ruleId: issue.ruleId,
      sequenceGroupId: runtimeRuleGroups.get(issue.ruleId) ?? null,
      blocking: issue.severity === 'error',
    }));
    issues.push(...nextIssues);
  };

  validatePath({
    path: 'guestIntro.initial.headline',
    value: content.guestIntro.initial.headline,
    includeRuleIds: contentRuleIds,
  });
  validatePath({
    path: 'guestIntro.initial.description',
    value: content.guestIntro.initial.description,
    includeRuleIds: contentRuleIds,
  });
  validatePath({
    path: 'guestIntro.repeated.description',
    value: content.guestIntro.repeated.description,
    includeRuleIds: contentRuleIds,
  });
  validatePath({
    path: 'guestIntro.help.headline',
    value: content.guestIntro.help.headline,
    includeRuleIds: contentRuleIds,
  });
  validatePath({
    path: 'guestIntro.help.description',
    value: content.guestIntro.help.description,
    includeRuleIds: contentRuleIds,
  });
  validatePath({
    path: 'homeOnboarding.calloutHeaderLabel',
    value: content.homeOnboarding.calloutHeaderLabel,
    includeRuleIds: contentRuleIds,
  });
  validatePath({
    path: 'homeOnboarding.manualStartLabel',
    value: content.homeOnboarding.manualStartLabel,
    includeRuleIds: contentRuleIds,
  });
  validatePath({
    path: 'homeOnboarding.manualReplayLabel',
    value: content.homeOnboarding.manualReplayLabel,
    includeRuleIds: contentRuleIds,
  });
  validatePath({
    path: 'homeOnboarding.stepLabelTemplate',
    value: content.homeOnboarding.stepLabelTemplate,
    includeRuleIds: contentRuleIds,
  });
  validatePath({
    path: 'homeOnboarding.entry.headline',
    value: content.homeOnboarding.entry.headline,
    includeRuleIds: contentRuleIds,
  });
  validatePath({
    path: 'homeOnboarding.entry.description',
    value: content.homeOnboarding.entry.description,
    includeRuleIds: contentRuleIds,
  });

  for (const focusKind of REQUIRED_ONBOARDING_FOCUS_KINDS) {
    const step = content.homeOnboarding.steps[focusKind];
    validatePath({
      path: `homeOnboarding.steps.${focusKind}.title`,
      value: step.title,
      includeRuleIds: contentRuleIds,
    });
    validatePath({
      path: `homeOnboarding.steps.${focusKind}.description`,
      value: step.description,
      includeRuleIds: contentRuleIds,
    });
  }

  validatePath({
    path: 'guidedCallout.buttons.back',
    value: content.guidedCallout.buttons.back,
    includeRuleIds: contentRuleIds,
  });
  validatePath({
    path: 'guidedCallout.buttons.finish',
    value: content.guidedCallout.buttons.finish,
    includeRuleIds: contentRuleIds,
  });
  validatePath({
    path: 'guidedCallout.buttons.understand',
    value: content.guidedCallout.buttons.understand,
    includeRuleIds: contentRuleIds,
  });

  return {
    listId: list.id,
    listName: list.name,
    ruleIds: selectedRuleIds,
    issues,
    blockingIssues: issues.filter((issue) => issue.blocking),
  };
}
