import { describe, expect, it } from 'vitest';

import {
  KANGUR_AI_TUTOR_ONBOARDING_VALIDATOR_LIST_ID,
  validateKangurAiTutorOnboardingContent,
  validateKangurAiTutorOnboardingStore,
} from '@/features/kangur/ai-tutor-onboarding-validation';
import { DEFAULT_KANGUR_AI_TUTOR_CONTENT } from '@/shared/contracts/kangur-ai-tutor-content';
import { DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE } from '@/shared/contracts/kangur-ai-tutor-native-guide';
import { parseValidatorPatternLists } from '@/shared/contracts/validator';
import { parsePromptEngineSettings } from '@/shared/lib/prompt-engine/settings';

const cloneDefaultStore = () =>
  JSON.parse(JSON.stringify(DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE));

describe('validateKangurAiTutorOnboardingStore', () => {
  it('accepts the seeded default Kangur native guide store without blocking issues', () => {
    const result = validateKangurAiTutorOnboardingStore({
      store: cloneDefaultStore(),
      patternLists: parseValidatorPatternLists(null),
      promptEngineSettings: parsePromptEngineSettings(null),
    });

    expect(result.listId).toBe(KANGUR_AI_TUTOR_ONBOARDING_VALIDATOR_LIST_ID);
    expect(result.blockingIssues).toHaveLength(0);
  });

  it('flags placeholder onboarding copy as a blocking issue', () => {
    const store = cloneDefaultStore();
    store.entries[0].shortDescription = 'TODO uzupelnic opis tej sekcji.';

    const result = validateKangurAiTutorOnboardingStore({
      store,
      patternLists: parseValidatorPatternLists(null),
      promptEngineSettings: parsePromptEngineSettings(null),
    });

    expect(
      result.blockingIssues.some(
        (issue) =>
          issue.entryId === store.entries[0].id &&
          issue.field === 'shortDescription' &&
          issue.ruleId === 'kangur.onboarding.no_placeholders'
      )
    ).toBe(true);
  });

  it('requires enabled onboarding coverage for the core home sections', () => {
    const store = cloneDefaultStore();
    store.entries = store.entries.filter(
      (entry: { focusKind?: string | null }) => entry.focusKind !== 'home_actions'
    );

    const result = validateKangurAiTutorOnboardingStore({
      store,
      patternLists: parseValidatorPatternLists(null),
      promptEngineSettings: parsePromptEngineSettings(null),
    });

    expect(
      result.blockingIssues.some(
        (issue) =>
          issue.entryId === null &&
          issue.field === 'sequence' &&
          issue.ruleId === 'kangur.onboarding.required_focus_coverage'
      )
    ).toBe(true);
  });
});

describe('validateKangurAiTutorOnboardingContent', () => {
  it('flags placeholder onboarding copy inside the guest intro content pack', () => {
    const content = JSON.parse(JSON.stringify(DEFAULT_KANGUR_AI_TUTOR_CONTENT));
    content.guestIntro.initial.headline = 'TODO uzupelnic naglowek';

    const result = validateKangurAiTutorOnboardingContent({
      content,
      patternLists: parseValidatorPatternLists(null),
      promptEngineSettings: parsePromptEngineSettings(null),
    });

    expect(result.listId).toBe(KANGUR_AI_TUTOR_ONBOARDING_VALIDATOR_LIST_ID);
    expect(
      result.blockingIssues.some(
        (issue) =>
          issue.path === 'guestIntro.initial.headline' &&
          issue.ruleId === 'kangur.onboarding.no_placeholders'
      )
    ).toBe(true);
  });
});
