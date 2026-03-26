import { z } from 'zod';

import {
  KANGUR_TUTOR_MOOD_IDS,
  type KangurTutorMoodId,
} from '@/shared/contracts/kangur-ai-tutor-mood';
import { DEFAULT_KANGUR_AI_TUTOR_CONTENT_INPUT } from '@/shared/contracts/kangur-ai-tutor-content.defaults';
import { DEFAULT_TUTOR_MOOD_CONTENT } from '@/shared/contracts/kangur-ai-tutor-content.moods';
import { repairKangurPolishCopy } from '@/shared/lib/i18n/kangur-polish-diacritics';

const tutorCopySchema = z.string().trim().min(1);
const tutorCopyRecordSchema = z.record(z.string(), tutorCopySchema);
const tutorStepSchema = z.object({
  title: tutorCopySchema,
  description: tutorCopySchema,
});
const tutorPromptSchema = z.object({
  defaultPrompt: tutorCopySchema,
  labeledPrompt: tutorCopySchema.optional(),
});
const tutorMoodContentSchema = z.object({
  label: tutorCopySchema,
  description: tutorCopySchema,
});
const tutorCopyListSchema = z.array(tutorCopySchema).min(1);

export const kangurAiTutorContentSchema = z.object({
  locale: tutorCopySchema.default('pl'),
  version: z.number().int().positive().default(1),
  common: z.object({
    defaultTutorName: tutorCopySchema,
    openTutorAria: tutorCopySchema,
    closeTutorAria: tutorCopySchema,
    closeAria: tutorCopySchema,
    closeWindowAria: tutorCopySchema,
    disableTutorAria: tutorCopySchema,
    disableTutorLabel: tutorCopySchema,
    enableTutorLabel: tutorCopySchema,
    signInLabel: tutorCopySchema,
    createAccountLabel: tutorCopySchema,
    askAboutSelectionLabel: tutorCopySchema,
    sendAria: tutorCopySchema,
    questionInputAria: tutorCopySchema,
    sendFailureFallback: tutorCopySchema,
    sessionRegistryLabel: tutorCopySchema,
  }),
  narrator: z.object({
    readLabel: tutorCopySchema,
    pauseLabel: tutorCopySchema,
    resumeLabel: tutorCopySchema,
    helpTitleSuffix: tutorCopySchema,
    chatTitleSuffix: tutorCopySchema,
    registrySourceLabel: tutorCopySchema,
  }),
  navigation: z.object({
    restoreTutorLabel: tutorCopySchema,
  }),
  panelChrome: z.object({
    detachFromContextAria: tutorCopySchema,
    detachFromContextLabel: tutorCopySchema,
    followingContextLabel: tutorCopySchema,
    moveToContextAria: tutorCopySchema,
    moveToContextLabel: tutorCopySchema,
    moodPrefix: tutorCopySchema,
    resetPositionAria: tutorCopySchema,
    resetPositionLabel: tutorCopySchema,
    snapPreviewPrefix: tutorCopySchema,
    snapTargets: z.object({
      bottom: tutorCopySchema,
      bottomLeft: tutorCopySchema,
      bottomRight: tutorCopySchema,
      left: tutorCopySchema,
      right: tutorCopySchema,
      top: tutorCopySchema,
      topLeft: tutorCopySchema,
      topRight: tutorCopySchema,
    }),
    surfaceLabels: z.object({
      test: tutorCopySchema,
      game: tutorCopySchema,
      lesson: tutorCopySchema,
      profile: tutorCopySchema,
      parent_dashboard: tutorCopySchema,
      auth: tutorCopySchema,
    }),
    contextFallbackTargets: z.object({
      test: tutorCopySchema,
      game: tutorCopySchema,
      lesson: tutorCopySchema,
      profile: tutorCopySchema,
      parent_dashboard: tutorCopySchema,
      auth: tutorCopySchema,
    }),
  }),
  guestIntro: z.object({
    closeAria: tutorCopySchema,
    acceptLabel: tutorCopySchema,
    dismissLabel: tutorCopySchema,
    showLoginLabel: tutorCopySchema,
    showCreateAccountLabel: tutorCopySchema,
    browseLabel: tutorCopySchema,
    intentPhrases: z.object({
      createAccount: tutorCopyListSchema,
      signIn: tutorCopyListSchema,
    }),
    initial: z.object({
      headline: tutorCopySchema,
      description: tutorCopySchema,
    }),
    repeated: z.object({
      description: tutorCopySchema,
    }),
    help: z.object({
      headline: tutorCopySchema,
      description: tutorCopySchema,
    }),
  }),
  homeOnboarding: z.object({
    calloutHeaderLabel: tutorCopySchema,
    manualStartLabel: tutorCopySchema,
    manualReplayLabel: tutorCopySchema,
    stepLabelTemplate: tutorCopySchema,
    entry: z.object({
      headline: tutorCopySchema,
      description: tutorCopySchema,
    }),
    steps: z.object({
      home_actions: tutorStepSchema,
      home_quest: tutorStepSchema,
      priority_assignments: tutorStepSchema,
      leaderboard: tutorStepSchema,
      progress: tutorStepSchema,
    }),
  }),
  guidedCallout: z.object({
    explanationHeaderSuffix: tutorCopySchema,
    closeAria: tutorCopySchema,
    sectionPrefix: tutorCopySchema,
    sectionTitleTemplate: tutorCopySchema,
    selectionTitle: tutorCopySchema,
    selectionRequestPrompt: tutorCopySchema,
    selectionDetailPending: tutorCopySchema,
    selectionDetailSoon: tutorCopySchema,
    selectionSketchCtaLabel: tutorCopySchema,
    selectionSketchHint: tutorCopySchema,
    sectionDetailPending: tutorCopySchema,
    sectionDetailSoon: tutorCopySchema,
    selectionPreparingBadge: tutorCopySchema,
    authTitles: z.object({
      createAccountNav: tutorCopySchema,
      signInNav: tutorCopySchema,
      createAccountIdentifier: tutorCopySchema,
      signInIdentifier: tutorCopySchema,
      createAccountForm: tutorCopySchema,
      signInForm: tutorCopySchema,
    }),
    authDetails: z.object({
      createAccountNav: tutorCopySchema,
      signInNav: tutorCopySchema,
      createAccountIdentifier: tutorCopySchema,
      signInIdentifier: tutorCopySchema,
      createAccountForm: tutorCopySchema,
      signInForm: tutorCopySchema,
    }),
    buttons: z.object({
      back: tutorCopySchema,
      finish: tutorCopySchema,
      understand: tutorCopySchema,
    }),
  }),
  focusChips: z.object({
    selection: z.object({
      testWithText: tutorCopySchema,
      testWithoutText: tutorCopySchema,
      gameWithText: tutorCopySchema,
      gameWithoutText: tutorCopySchema,
      lessonWithText: tutorCopySchema,
      lessonWithoutText: tutorCopySchema,
    }),
    kinds: tutorCopyRecordSchema,
  }),
  contextSwitch: z.object({
    title: tutorCopySchema,
    detailCurrentQuestion: tutorCopySchema,
    detailCurrentAssignment: tutorCopySchema,
  }),
  sectionExplainPrompts: z.object({
    home_actions: tutorPromptSchema,
    home_quest: tutorPromptSchema,
    priority_assignments: tutorPromptSchema,
    leaderboard: tutorPromptSchema,
    progress: tutorPromptSchema,
    lesson_header: tutorPromptSchema,
    assignment: tutorPromptSchema,
    document: tutorPromptSchema,
    question: tutorPromptSchema,
    review: tutorPromptSchema,
    summary: tutorPromptSchema,
    default: tutorPromptSchema,
  }),
  bridge: z.object({
    toGame: z.object({
      label: tutorCopySchema,
      prompt: tutorCopySchema,
      summaryChip: tutorCopySchema,
    }),
  }),
  quickActions: z.object({
    review: z.object({
      questionLabel: tutorCopySchema,
      gameLabel: tutorCopySchema,
      resultLabel: tutorCopySchema,
      questionPrompt: tutorCopySchema,
      gamePrompt: tutorCopySchema,
      resultPrompt: tutorCopySchema,
    }),
    nextStep: z.object({
      reviewQuestionLabel: tutorCopySchema,
      reviewOtherLabel: tutorCopySchema,
      reviewQuestionPrompt: tutorCopySchema,
      reviewGamePrompt: tutorCopySchema,
      reviewTestPrompt: tutorCopySchema,
      assignmentLabel: tutorCopySchema,
      defaultLabel: tutorCopySchema,
      assignmentGamePrompt: tutorCopySchema,
      assignmentLessonPrompt: tutorCopySchema,
      gamePrompt: tutorCopySchema,
      defaultPrompt: tutorCopySchema,
    }),
    explain: z.object({
      assignmentLabel: tutorCopySchema,
      defaultLabel: tutorCopySchema,
      selectedPrompt: tutorCopySchema,
      defaultPrompt: tutorCopySchema,
    }),
    hint: z.object({
      defaultLabel: tutorCopySchema,
      defaultPrompt: tutorCopySchema,
      altLabel: tutorCopySchema,
      altPrompt: tutorCopySchema,
    }),
    howThink: z.object({
      defaultLabel: tutorCopySchema,
      defaultPrompt: tutorCopySchema,
      misconceptionLabel: tutorCopySchema,
      misconceptionPrompt: tutorCopySchema,
      ladderLabel: tutorCopySchema,
      ladderPrompt: tutorCopySchema,
    }),
    selectedText: z.object({
      label: tutorCopySchema,
      prompt: tutorCopySchema,
    }),
  }),
  proactiveNudges: z.object({
    gentleTitle: tutorCopySchema,
    coachTitle: tutorCopySchema,
    selectedTextCoach: tutorCopySchema,
    selectedTextGentle: tutorCopySchema,
    bridgeToGameCoach: tutorCopySchema,
    bridgeToGameGentle: tutorCopySchema,
    reviewCoach: tutorCopySchema,
    reviewGentle: tutorCopySchema,
    stepByStepCoach: tutorCopySchema,
    stepByStepGentle: tutorCopySchema,
    hintCoach: tutorCopySchema,
    hintGentle: tutorCopySchema,
    assignmentCoach: tutorCopySchema,
    assignmentGentle: tutorCopySchema,
    defaultCoach: tutorCopySchema,
    defaultGentle: tutorCopySchema,
    buttonLabel: tutorCopySchema,
  }),
  emptyStates: z.object({
    selectedText: tutorCopySchema,
    activeQuestion: tutorCopySchema,
    bridgeToGame: tutorCopySchema,
    reviewQuestion: tutorCopySchema,
    reviewGame: tutorCopySchema,
    reviewTest: tutorCopySchema,
    assignment: tutorCopySchema,
    game: tutorCopySchema,
    lesson: tutorCopySchema,
    selectionPending: tutorCopySchema,
    sectionPending: tutorCopySchema,
  }),
  placeholders: z.object({
    limitReached: tutorCopySchema,
    selectedText: tutorCopySchema,
    activeQuestion: tutorCopySchema,
    bridgeToGame: tutorCopySchema,
    reviewQuestion: tutorCopySchema,
    reviewGame: tutorCopySchema,
    reviewTest: tutorCopySchema,
    assignment: tutorCopySchema,
    game: tutorCopySchema,
    lesson: tutorCopySchema,
    askModal: tutorCopySchema,
  }),
  askModal: z.object({
    helperDefault: tutorCopySchema,
    helperAuth: tutorCopySchema,
  }),
  panelContext: z.object({
    selectedTitle: tutorCopySchema,
    sectionTitle: tutorCopySchema,
    refocusSelectionLabel: tutorCopySchema,
    detachSelectionLabel: tutorCopySchema,
    refocusSectionLabel: tutorCopySchema,
    detachSectionLabel: tutorCopySchema,
    selectedPendingDetail: tutorCopySchema,
    selectedCompleteDetail: tutorCopySchema,
    selectedDefaultDetail: tutorCopySchema,
    selectedPendingStatus: tutorCopySchema,
    selectedCompleteStatus: tutorCopySchema,
    sectionPendingDetail: tutorCopySchema,
    sectionCompleteDetail: tutorCopySchema,
    sectionDefaultDetail: tutorCopySchema,
    sectionPendingStatus: tutorCopySchema,
    sectionCompleteStatus: tutorCopySchema,
  }),
  auxiliaryControls: z.object({
    dailyLimitTemplate: tutorCopySchema,
    toolboxDescription: tutorCopySchema,
    toolboxTitle: tutorCopySchema,
    usageRefreshing: tutorCopySchema,
    usageExhausted: tutorCopySchema,
    usageRemainingTemplate: tutorCopySchema,
  }),
  profileMoodWidget: z.object({
    title: tutorCopySchema,
    descriptionWithLearnerTemplate: tutorCopySchema,
    descriptionFallback: tutorCopySchema,
    baselineLabel: tutorCopySchema,
    baselineDescription: tutorCopySchema,
    confidenceLabel: tutorCopySchema,
    confidenceDescription: tutorCopySchema,
    updatedLabel: tutorCopySchema,
    updatedDescription: tutorCopySchema,
    updatedFallback: tutorCopySchema,
  }),
  parentDashboard: z.object({
    noActiveLearner: tutorCopySchema,
    titleTemplate: tutorCopySchema,
    subtitle: tutorCopySchema,
    moodTitle: tutorCopySchema,
    baselineLabel: tutorCopySchema,
    confidenceLabel: tutorCopySchema,
    updatedLabel: tutorCopySchema,
    updatedFallback: tutorCopySchema,
    usageTitle: tutorCopySchema,
    usageLoading: tutorCopySchema,
    usageError: tutorCopySchema,
    usageUnlimitedTemplate: tutorCopySchema,
    usageLimitedTemplate: tutorCopySchema,
    usageUnlimitedBadge: tutorCopySchema,
    usageExhaustedBadge: tutorCopySchema,
    usageRemainingBadgeTemplate: tutorCopySchema,
    usageHelp: tutorCopySchema,
    toggleEnabledLabel: tutorCopySchema,
    toggleDisabledLabel: tutorCopySchema,
    toggleEnableActionLabel: tutorCopySchema,
    toggleDisableActionLabel: tutorCopySchema,
    guardrailsTitle: tutorCopySchema,
    saveIdleLabel: tutorCopySchema,
    savePendingLabel: tutorCopySchema,
    saveSuccess: tutorCopySchema,
    saveError: tutorCopySchema,
    toggles: z.object({
      allowLessonsLabel: tutorCopySchema,
      allowLessonsDescription: tutorCopySchema,
      allowGamesLabel: tutorCopySchema,
      allowGamesDescription: tutorCopySchema,
      showSourcesLabel: tutorCopySchema,
      showSourcesDescription: tutorCopySchema,
      allowSelectedTextSupportLabel: tutorCopySchema,
      allowSelectedTextSupportDescription: tutorCopySchema,
      allowCrossPagePersistenceLabel: tutorCopySchema,
      allowCrossPagePersistenceDescription: tutorCopySchema,
      rememberTutorContextLabel: tutorCopySchema,
      rememberTutorContextDescription: tutorCopySchema,
    }),
    selects: z.object({
      testAccessModeLabel: tutorCopySchema,
      testAccessModeDescription: tutorCopySchema,
      testAccessModeDisabled: tutorCopySchema,
      testAccessModeGuided: tutorCopySchema,
      testAccessModeReview: tutorCopySchema,
      hintDepthLabel: tutorCopySchema,
      hintDepthDescription: tutorCopySchema,
      hintDepthBrief: tutorCopySchema,
      hintDepthGuided: tutorCopySchema,
      hintDepthStepByStep: tutorCopySchema,
      proactiveNudgesLabel: tutorCopySchema,
      proactiveNudgesDescription: tutorCopySchema,
      proactiveNudgesOff: tutorCopySchema,
      proactiveNudgesGentle: tutorCopySchema,
      proactiveNudgesCoach: tutorCopySchema,
      uiModeLabel: tutorCopySchema,
      uiModeDescription: tutorCopySchema,
      uiModeAnchored: tutorCopySchema,
      uiModeFreeform: tutorCopySchema,
      uiModeStatic: tutorCopySchema,
    }),
  }),
  usageApi: z.object({
    availabilityErrors: z.object({
      disabled: tutorCopySchema,
      emailUnverified: tutorCopySchema,
      missingContext: tutorCopySchema,
      lessonsDisabled: tutorCopySchema,
      testsDisabled: tutorCopySchema,
      reviewAfterAnswerOnly: tutorCopySchema,
    }),
  }),
  parentVerification: z.object({
    createSuccessMessage: tutorCopySchema,
    createResentMessage: tutorCopySchema,
    verifySuccessMessage: tutorCopySchema,
    emailSubject: tutorCopySchema,
    emailGreetingTemplate: tutorCopySchema,
    emailReadyLine: tutorCopySchema,
    emailInstructionLine: tutorCopySchema,
    emailUnlockLine: tutorCopySchema,
    emailIgnoreLine: tutorCopySchema,
  }),
  messageList: z.object({
    followUpTitle: tutorCopySchema,
    hintFollowUpQuestion: tutorCopySchema,
    hintFollowUpActionLabel: tutorCopySchema,
    sourcesTitle: tutorCopySchema,
    helpfulPrompt: tutorCopySchema,
    helpfulYesLabel: tutorCopySchema,
    helpfulNoLabel: tutorCopySchema,
    helpfulStatus: tutorCopySchema,
    notHelpfulStatus: tutorCopySchema,
    loadingLabel: tutorCopySchema,
  }),
  moods: z.record(z.string(), tutorMoodContentSchema),
  drawing: z.object({
    title: tutorCopySchema,
    toggleLabel: tutorCopySchema,
    penLabel: tutorCopySchema,
    eraserLabel: tutorCopySchema,
    undoLabel: tutorCopySchema,
    redoLabel: tutorCopySchema,
    exportLabel: tutorCopySchema,
    clearLabel: tutorCopySchema,
    cancelLabel: tutorCopySchema,
    doneLabel: tutorCopySchema,
    previewAlt: tutorCopySchema,
    attachedLabel: tutorCopySchema,
    messageLabel: tutorCopySchema,
  }).optional(),
});

export type KangurAiTutorContent = z.infer<typeof kangurAiTutorContentSchema>;

const defaultMoodContent = Object.fromEntries(
  KANGUR_TUTOR_MOOD_IDS.map((moodId) => [moodId, DEFAULT_TUTOR_MOOD_CONTENT[moodId]])
) as Record<KangurTutorMoodId, { label: string; description: string }>;

const defaultMoodContentRepaired = repairKangurPolishCopy(defaultMoodContent);

export const DEFAULT_KANGUR_AI_TUTOR_CONTENT: KangurAiTutorContent =
  kangurAiTutorContentSchema.parse(
    repairKangurPolishCopy({
      ...DEFAULT_KANGUR_AI_TUTOR_CONTENT_INPUT,
      moods: defaultMoodContentRepaired,
    })
  );

const isPlainTutorObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const mergeKangurAiTutorContent = (base: unknown, value: unknown): unknown => {
  if (!isPlainTutorObject(base)) {
    return value === undefined ? base : value;
  }

  const baseObject = base;
  const valueObject = isPlainTutorObject(value) ? value : {};
  const mergedEntries = Object.entries(baseObject).map(([key, baseEntry]) => [
    key,
    mergeKangurAiTutorContent(baseEntry, valueObject[key]),
  ]);

  for (const [key, entry] of Object.entries(valueObject)) {
    if (!(key in baseObject)) {
      mergedEntries.push([key, entry]);
    }
  }

  return Object.fromEntries(mergedEntries);
};

export const parseKangurAiTutorContent = (value: unknown): KangurAiTutorContent =>
  kangurAiTutorContentSchema.parse(
    mergeKangurAiTutorContent(DEFAULT_KANGUR_AI_TUTOR_CONTENT, value)
  );

export const formatKangurAiTutorTemplate = (
  template: string,
  values: Record<string, string | number | null | undefined>
): string =>
  template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, key: string) => {
    const value = values[key];
    return value === null || value === undefined ? '' : String(value);
  });

export const getKangurAiTutorMoodCopy = (
  content: KangurAiTutorContent,
  moodId: string | KangurTutorMoodId
): { label: string; description: string } => {
  const fromContent = content.moods[moodId];
  if (fromContent) {
    return fromContent;
  }

  return (
    defaultMoodContentRepaired[moodId as KangurTutorMoodId] ?? {
      label: 'Neutralny',
      description: 'Stabilny punkt wyjścia, gdy nie potrzeba silniejszego tonu.',
    }
  );
};
