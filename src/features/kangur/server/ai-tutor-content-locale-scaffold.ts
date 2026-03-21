import type { UnknownRecordDto } from '@/shared/contracts/base';
import type { KangurAiTutorContent } from '@/shared/contracts/kangur-ai-tutor-content';
import { parseKangurAiTutorContent } from '@/shared/contracts/kangur-ai-tutor-content';
import type { KangurAiTutorTranslationStatusDto } from '@/shared/contracts/kangur-ai-tutor-locale-scaffold';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';

export type KangurAiTutorContentTranslatableSectionKey = Exclude<
  keyof KangurAiTutorContent,
  'locale' | 'version'
>;

export type KangurAiTutorContentTranslationStatus = KangurAiTutorTranslationStatusDto;

const isPlainObject = (value: unknown): value is UnknownRecordDto =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const cloneValue = <T>(value: T): T => {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
};

const serializeComparable = (value: unknown): string => JSON.stringify(value);

const deepMerge = (base: unknown, override: unknown): unknown => {
  if (Array.isArray(base)) {
    return override === undefined ? cloneValue(base) : override;
  }

  if (isPlainObject(base) && isPlainObject(override)) {
    const next: UnknownRecordDto = {};

    for (const [key, baseValue] of Object.entries(base)) {
      next[key] = deepMerge(baseValue, override[key]);
    }

    for (const [key, overrideValue] of Object.entries(override)) {
      if (!Object.prototype.hasOwnProperty.call(base, key)) {
        next[key] = overrideValue;
      }
    }

    return next;
  }

  return override === undefined ? cloneValue(base) : override;
};

const applyOverlayWhenStillSource = (
  source: unknown,
  current: unknown,
  overlay: unknown
): unknown => {
  if (overlay === undefined) {
    return current;
  }

  if (isPlainObject(overlay)) {
    const sourceRecord = isPlainObject(source) ? source : {};
    const currentRecord = isPlainObject(current) ? current : {};
    const next = { ...currentRecord };

    for (const [key, overlayValue] of Object.entries(overlay)) {
      next[key] = applyOverlayWhenStillSource(sourceRecord[key], currentRecord[key], overlayValue);
    }

    return next;
  }

  if (
    current === undefined ||
    current === null ||
    (typeof current === 'string' && current.trim().length === 0)
  ) {
    return overlay;
  }

  return serializeComparable(current) === serializeComparable(source) ? overlay : current;
};

const CONTENT_COPY_BY_LOCALE: Record<string, Partial<KangurAiTutorContent>> = {
  en: {
    locale: 'en',
    common: {
      defaultTutorName: 'Janek',
      openTutorAria: 'Open AI tutor',
      closeTutorAria: 'Close tutor',
      closeAria: 'Close',
      closeWindowAria: 'Close AI Tutor window',
      disableTutorAria: 'Disable AI Tutor',
      disableTutorLabel: 'Disable',
      enableTutorLabel: 'Enable AI Tutor',
      signInLabel: 'Sign in',
      createAccountLabel: 'Create account',
      askAboutSelectionLabel: 'Ask about this',
      sendAria: 'Send',
      questionInputAria: 'Type a question',
      sendFailureFallback: 'Sorry, something went wrong. Try again.',
      sessionRegistryLabel: 'Kangur AI Tutor session',
    },
    narrator: {
      readLabel: 'Read',
      pauseLabel: 'Pause',
      resumeLabel: 'Resume',
      helpTitleSuffix: 'help',
      chatTitleSuffix: 'chat',
      registrySourceLabel: 'Kangur AI Tutor narrator',
    },
    navigation: {
      restoreTutorLabel: 'Enable AI Tutor',
    },
    panelChrome: {
      detachFromContextAria: 'Stop following the current content',
      detachFromContextLabel: 'Detach',
      followingContextLabel: 'Following content',
      moveToContextAria: 'Move the panel next to the current content',
      moveToContextLabel: 'Next to content',
      moodPrefix: 'Mood',
      resetPositionAria: 'Restore the default panel position',
      resetPositionLabel: 'Reset position',
      snapPreviewPrefix: 'Release to snap',
      snapTargets: {
        bottom: 'to the bottom',
        bottomLeft: 'to the bottom left corner',
        bottomRight: 'to the bottom right corner',
        left: 'to the left edge',
        right: 'to the right edge',
        top: 'to the top',
        topLeft: 'to the top left corner',
        topRight: 'to the top right corner',
      },
      surfaceLabels: {
        test: 'Test',
        game: 'Game',
        lesson: 'Lesson',
        profile: 'Profile',
        parent_dashboard: 'Parent dashboard',
        auth: 'Sign in',
      },
      contextFallbackTargets: {
        test: 'New test question',
        game: 'New game step',
        lesson: 'New lesson fragment',
        profile: 'New profile panel',
        parent_dashboard: 'New parent dashboard',
        auth: 'Sign-in screen',
      },
    },
    guestIntro: {
      closeAria: 'Close AI Tutor window',
      acceptLabel: 'Yes',
      dismissLabel: 'No',
      showLoginLabel: 'Show sign in',
      showCreateAccountLabel: 'Show account creation',
      browseLabel: 'Keep browsing',
      intentPhrases: {
        createAccount: [
          'create account',
          'create a parent account',
          'how do i create an account',
          'where do i create an account',
          'how do i sign up',
          'sign up',
          'register',
          'parent account',
          'don\'t have an account',
          'dont have an account',
          'make an account',
          'open registration',
        ],
        signIn: [
          'how do i log in',
          'where do i log in',
          'open login',
          'log in',
          'login',
          'sign in',
          'open sign in',
          'show sign in',
        ],
      },
      initial: {
        headline: 'Do you want help with signing in or creating an account?',
        description: 'I can show you where to sign in or how to create a parent account.',
      },
      repeated: {
        description: 'I can show you where to sign in or how to create a parent account.',
      },
      help: {
        headline: 'I can show you where to click.',
        description:
          'If you already have an account, I will show you the sign-in button. If not, I will show you where to create a parent account and how to verify the email.',
      },
    },
    homeOnboarding: {
      calloutHeaderLabel: 'AI helper · page walkthrough',
      manualStartLabel: 'Show page walkthrough',
      manualReplayLabel: 'Replay page walkthrough',
      stepLabelTemplate: 'Step {current} of {total}',
      entry: {
        headline: 'Do you want me to show the main buttons and the result and progress areas?',
        description:
          'I can walk you through the most important actions on the home page and the places where you will see the ranking, points, and learning pace.',
      },
      steps: {
        home_actions: {
          title: 'Here you choose how you want to start.',
          description:
            'You can go to lessons, start a game, begin mixed practice, or open Kangur Matematyczny.',
        },
        home_quest: {
          title: 'Here your current quest appears.',
          description:
            'This is the fastest way to see what is worth doing next without guessing.',
        },
        priority_assignments: {
          title: 'Here you find assignments from the parent.',
          description:
            'If there are assignments here, it is worth starting with them because they are the current priorities.',
        },
        leaderboard: {
          title: 'Here you see the leaderboard.',
          description:
            'You can check how your result compares with others and how much is left until the next jump.',
        },
        progress: {
          title: 'Here you track your progress.',
          description:
            'This area shows player growth, earned points, and learning pace.',
        },
      },
    },
    guidedCallout: {
      explanationHeaderSuffix: '· explanation',
      closeAria: 'Close AI Tutor window',
      sectionPrefix: 'Section',
      sectionTitleTemplate: 'Explaining section: {label}',
      selectionTitle: 'I am explaining this fragment.',
      selectionRequestPrompt: 'Explain the selected fragment step by step.',
      selectionDetailPending: 'I am preparing an explanation for the selected text.',
      selectionDetailSoon: 'I will open an explanation for the selected text in a moment.',
      selectionSketchCtaLabel: 'Sketch it for me, please',
      selectionSketchHint:
        'I am opening the drawing board. Try sketching the partitions and comparing shapes after rotation or reflection.',
      sectionDetailPending: 'I am preparing an explanation for this part of the page.',
      sectionDetailSoon:
        'In a moment I will explain this part of the page and show what is worth noticing.',
      selectionPreparingBadge: 'Preparing the explanation...',
      authTitles: {
        createAccountNav: 'Click "{label}" at the top to open sign in.',
        signInNav: 'Click "{label}" at the top.',
        createAccountIdentifier: 'Enter the parent email here.',
        signInIdentifier: 'Enter the parent email or the student nickname here.',
        createAccountForm: 'Here you create a parent account.',
        signInForm: 'Here you enter the sign-in details.',
      },
      authDetails: {
        createAccountNav:
          'This opens sign in first. Then switch the form to parent account creation and enter the parent details.',
        signInNav:
          'This button opens sign in. First click it in the navigation, and only then enter the credentials.',
        createAccountIdentifier:
          'Start with the parent email in this field. You will set the password right below.',
        signInIdentifier:
          'Start with the login in this field, then enter the password below.',
        createAccountForm:
          'Enter the parent email and set a password. After email confirmation you will return here with the same login.',
        signInForm: 'Enter the parent email or the student nickname, then the password.',
      },
      buttons: {
        back: 'Back',
        finish: 'Finish',
        understand: 'Got it',
      },
    },
    focusChips: {
      selection: {
        testWithText: 'Question fragment',
        testWithoutText: 'Selected fragment',
        gameWithText: 'Game fragment',
        gameWithoutText: 'Selected fragment',
        lessonWithText: 'Lesson fragment',
        lessonWithoutText: 'Selected fragment',
      },
      kinds: {
        hero: 'Introduction',
        screen: 'Screen',
        library: 'Library',
        empty_state: 'Empty state',
        navigation: 'Navigation',
        home_actions: 'Start',
        home_quest: 'Quest',
        priority_assignments: 'Parent assignments',
        leaderboard: 'Leaderboard',
        progress: 'Progress',
        assignment: 'Parent assignment',
        lesson_header: 'Lesson topic',
        document: 'Lesson content',
        question: 'Current question',
        review: 'Question review',
        summary: 'Test summary',
        login_action: 'Sign in',
        create_account_action: 'Create account',
        login_identifier_field: 'Sign-in field',
        login_form: 'Sign-in form',
      },
    },
    sectionExplainPrompts: {
      home_actions: {
        defaultPrompt:
          'Explain the activity selection section. Say what the available options are for and when to choose each one.',
      },
      home_quest: {
        defaultPrompt:
          'Explain the learner quest section. Say how to read this task and what the next step should be.',
      },
      priority_assignments: {
        defaultPrompt:
          'Explain the priority assignments section. Say where these assignments come from and what is best to start with.',
      },
      leaderboard: {
        defaultPrompt:
          'Explain the leaderboard section. Say what the positions and points mean and how to improve the result.',
      },
      progress: {
        defaultPrompt:
          'Explain the progress section. Say what the indicators mean and what is worth paying attention to.',
      },
      lesson_header: {
        defaultPrompt:
          'Explain what this lesson is about and what the learner will learn here.',
        labeledPrompt:
          'Explain what the lesson "{label}" is about and what the learner will learn here.',
      },
      assignment: {
        defaultPrompt:
          'Explain this assignment and say what needs to be done and what is best to start with.',
        labeledPrompt:
          'Explain the assignment "{label}". Say what needs to be done and what is best to start with.',
      },
      document: {
        defaultPrompt:
          'Explain the main content of this lesson and say how to read it step by step.',
        labeledPrompt:
          'Explain the main content of the lesson "{label}". Say what this part is about and how to read it step by step.',
      },
      question: {
        defaultPrompt:
          'Explain this question. Say what to focus on, but do not give the final answer.',
      },
      review: {
        defaultPrompt:
          'Explain the answer review. Say what went well, where the mistake may be, and what to check next.',
      },
      summary: {
        defaultPrompt:
          'Explain this summary and say what the result shows and what the next step might be.',
        labeledPrompt:
          'Explain the summary "{label}". Say what the result shows and what the next step might be.',
      },
      default: {
        defaultPrompt:
          'Explain this part of the page and say what is worth paying attention to.',
        labeledPrompt:
          'Explain this section: {label}. Say what it is about and what is worth paying attention to.',
      },
    },
    quickActions: {
      review: {
        questionLabel: 'Review answer',
        gameLabel: 'Review game',
        resultLabel: 'Review result',
        questionPrompt:
          'Review this question: what went well, where the mistake was, and what to check next time.',
        gamePrompt:
          'Review my last game: what went well and what is worth practising next.',
        resultPrompt:
          'Review my test result: what went well and what is worth improving next time.',
      },
      nextStep: {
        reviewQuestionLabel: 'What to improve?',
        reviewOtherLabel: 'What to practise?',
        reviewQuestionPrompt: 'Tell me what to practise next after this question.',
        reviewGamePrompt: 'Tell me what my next step should be after this game.',
        reviewTestPrompt: 'Tell me what my next step should be after this test.',
        assignmentLabel: 'Assignment plan',
        defaultLabel: 'What next?',
        assignmentGamePrompt:
          'Tell me what my next step should be in this assignment and in this game.',
        assignmentLessonPrompt:
          'Tell me what my next step should be in this assignment and in this lesson.',
        gamePrompt: 'Tell me what is worth practising next based on my game.',
        defaultPrompt: 'Tell me what is worth practising next based on my progress.',
      },
      explain: {
        assignmentLabel: 'Explain the topic',
        defaultLabel: 'Explain',
        selectedPrompt: 'Explain this fragment in simple words.',
        defaultPrompt: 'Explain this to me in simple words.',
      },
      hint: {
        defaultLabel: 'Hint',
        defaultPrompt: 'Give me a small hint, but not the final answer.',
        altLabel: 'Another clue',
        altPrompt: 'Give me another small clue, but not the final answer.',
      },
      howThink: {
        defaultLabel: 'How should I think?',
        defaultPrompt:
          'Explain how to approach this question step by step without giving the answer.',
        misconceptionLabel: 'What am I mixing up?',
        misconceptionPrompt:
          'Help me find where my way of thinking may be wrong, without giving the answer.',
        ladderLabel: 'How should I continue thinking?',
        ladderPrompt:
          'Help me check the reasoning step by step, without giving the answer.',
      },
      selectedText: {
        label: 'This fragment',
        prompt: 'Explain this selected fragment in simple words.',
      },
    },
    proactiveNudges: {
      gentleTitle: 'Suggested first step',
      coachTitle: 'Tutor suggests where to start',
      selectedTextCoach:
        'You have a selected fragment, so the tutor suggests unpacking just this piece first.',
      selectedTextGentle: 'Start with a short explanation of the selected fragment.',
      bridgeToGameCoach:
        'The tutor suggests turning this lesson into one specific practice right away.',
      bridgeToGameGentle: 'Start with one specific practice after this lesson.',
      reviewCoach:
        'The tutor suggests reviewing the attempt first and only then choosing the next exercise.',
      reviewGentle: 'The calmest start is a short review of the latest attempt.',
      stepByStepCoach:
        'The tutor suggests going straight into a step-by-step thinking plan.',
      stepByStepGentle: 'It is best to start with a step-by-step thinking plan.',
      hintCoach:
        'The tutor suggests one quick hint to get moving without revealing the answer.',
      hintGentle: 'One small hint should be enough to move forward.',
      assignmentCoach:
        'The tutor suggests choosing one concrete next move for the assignment now.',
      assignmentGentle: 'Ask for one concrete next step for this assignment.',
      defaultCoach: 'The tutor suggests setting the next direction of work right away.',
      defaultGentle:
        'A short start with an explanation or a next step usually works best.',
      buttonLabel: 'Try now',
    },
    contextSwitch: {
      title: 'New help location',
      detailCurrentQuestion: 'The tutor aligns with the current question.',
      detailCurrentAssignment: 'The tutor aligns with the active assignment.',
    },
    emptyStates: {
      selectedText: 'You have selected a fragment. Ask for an explanation or the next step.',
      activeQuestion:
        'Ask for a hint for this question. The tutor will not give the ready answer.',
      bridgeToGame:
        'You have already completed the previous step. Ask for one specific practice after this lesson.',
      reviewQuestion: 'Ask for an answer review or the next practice step.',
      reviewGame: 'Ask for a game review or a plan for the next practice.',
      reviewTest: 'Ask for a result review or a plan for the next practice.',
      assignment: 'Ask for a plan to complete the assignment or a short topic explanation.',
      game: 'Do you have a question about the game? Ask for a hint or the next step.',
      lesson: 'Do you have a question about the lesson? Ask for an explanation or the next step.',
      selectionPending: 'Wait, I am explaining the selected fragment.',
      sectionPending: 'Wait, I am explaining the selected section.',
    },
    placeholders: {
      limitReached: 'Daily message limit reached',
      selectedText: 'Ask about the selected fragment',
      activeQuestion: 'Ask for a hint for the question',
      bridgeToGame: 'Ask about practice after this lesson',
      reviewQuestion: 'Ask for an answer review',
      reviewGame: 'Ask about the game or the next step',
      reviewTest: 'Ask about the result or the next step',
      assignment: 'Ask about the assignment or the next step',
      game: 'Ask about the game',
      lesson: 'Ask...',
      askModal: 'Write a question to the tutor',
    },
    askModal: {
      helperDefault: 'You can ask about signing in, the parent account, or how to use the page.',
      helperAuth:
        'You can ask about signing in, the parent account, or the next step on the page.',
    },
    panelContext: {
      selectedTitle: 'Explained fragment',
      sectionTitle: 'Explained section',
      refocusSelectionLabel: 'Show fragment',
      detachSelectionLabel: 'Back to chat',
      refocusSectionLabel: 'Show section',
      detachSectionLabel: 'Back to chat',
      selectedPendingDetail:
        'Wait a moment. I am focusing only on this fragment now and preparing the explanation.',
      selectedCompleteDetail:
        'The explanation is ready. You can ask follow-up questions or return to the regular chat.',
      selectedDefaultDetail:
        'You can return to the regular chat or show the fragment on the page again.',
      selectedPendingStatus:
        'I am preparing an explanation exactly for the selected text.',
      selectedCompleteStatus: 'The explanation is ready. You can now ask about the details.',
      sectionPendingDetail:
        'Wait a moment. I am focusing only on this section now and preparing the explanation.',
      sectionCompleteDetail:
        'The explanation is ready. You can ask follow-up questions or return to the regular chat.',
      sectionDefaultDetail:
        'This conversation is now pinned to this part of the page. You can show the section again or return to the regular chat.',
      sectionPendingStatus:
        'I am preparing an explanation exactly for this part of the page.',
      sectionCompleteStatus: 'The explanation is ready. You can now ask about the details.',
    },
    auxiliaryControls: {
      dailyLimitTemplate: 'Limit today: {count}/{limit}',
      toolboxDescription:
        'Shortcuts to hints, drawing, and next steps in the current conversation.',
      toolboxTitle: 'Tutor tools',
      usageRefreshing: 'Refreshing...',
      usageExhausted: 'Limit reached',
      usageRemainingTemplate: '{remaining} left',
    },
    profileMoodWidget: {
      title: 'AI Tutor mood',
      descriptionWithLearnerTemplate:
        'This setting belongs to the profile of {learnerName} and changes with progress, task scope, and conversation history with the tutor.',
      descriptionFallback:
        'In local mode the tutor works, but the mood is not saved per learner.',
      baselineLabel: 'Baseline tone',
      baselineDescription: 'The tone the tutor returns to as the starting point.',
      confidenceLabel: 'Confidence',
      confidenceDescription: 'How strongly learner signals support the current mood.',
      updatedLabel: 'Updated',
      updatedDescription: 'The last saved state in the learner profile.',
      updatedFallback: 'Not calculated yet',
    },
    parentDashboard: {
      noActiveLearner: 'Select a learner to configure AI Tutor.',
      titleTemplate: 'AI Tutor for {learnerName}',
      subtitle: 'Set AI help availability and guardrails for this learner',
      moodTitle: 'Current learner mood',
      baselineLabel: 'Baseline tone',
      confidenceLabel: 'Confidence',
      updatedLabel: 'Updated',
      updatedFallback: 'Not calculated yet',
      usageTitle: 'Usage today',
      usageLoading: 'Checking today\'s messages...',
      usageError: 'Couldn\'t read the current usage.',
      usageUnlimitedTemplate: 'Sent {messageCount} messages.',
      usageLimitedTemplate: 'Used {messageCount} of {dailyMessageLimit} messages.',
      usageUnlimitedBadge: 'Unlimited',
      usageExhaustedBadge: 'Limit reached',
      usageRemainingBadgeTemplate: '{remainingMessages} left',
      usageHelp:
        'This view refreshes automatically, so the parent sees the current usage of the active learner.',
      toggleEnabledLabel: 'AI Tutor enabled',
      toggleDisabledLabel: 'AI Tutor disabled',
      toggleEnableActionLabel: 'Enable AI Tutor',
      toggleDisableActionLabel: 'Disable AI Tutor',
      guardrailsTitle: 'Parent guardrails',
      saveIdleLabel: 'Save AI Tutor settings',
      savePendingLabel: 'Saving...',
      saveSuccess: 'AI Tutor settings saved.',
      saveError: 'Couldn\'t save the settings.',
      toggles: {
        allowLessonsLabel: 'Show tutor in lessons',
        allowLessonsDescription:
          'The tutor can help during open lessons and self-guided review.',
        allowGamesLabel: 'Show tutor in games',
        allowGamesDescription:
          'The tutor can help in Grajmy during drills and quizzes without mixing this with lesson settings.',
        showSourcesLabel: 'Show answer sources',
        showSourcesDescription:
          'After an answer, the tutor can show fragments of the materials it used.',
        allowSelectedTextSupportLabel: 'Allow questions about the selected fragment',
        allowSelectedTextSupportDescription:
          'After opening the tutor, it can work on the indicated fragment without losing the selection.',
        allowCrossPagePersistenceLabel: 'Keep the conversation when the place changes',
        allowCrossPagePersistenceDescription:
          'The tutor can stay open and return to the previous thread when moving between lessons, tests, and summaries.',
        rememberTutorContextLabel: 'Remember the latest hints',
        rememberTutorContextDescription:
          'Allows the tutor to carry short memory of the latest blockage and recommended next step between learner sessions.',
      },
      selects: {
        testAccessModeLabel: 'Help mode in tests',
        testAccessModeDescription:
          'This restriction also applies in the API, so an active test cannot bypass it with a manual request.',
        testAccessModeDisabled: 'Disable tutor in tests',
        testAccessModeGuided: 'Allow hints only, no answers',
        testAccessModeReview: 'Allow only after the answer is shown',
        hintDepthLabel: 'Hint depth',
        hintDepthDescription:
          'Determines how detailed the hints should be in a single tutor reply.',
        hintDepthBrief: 'One short nudge',
        hintDepthGuided: 'One hint and a checking question',
        hintDepthStepByStep: 'Guide step by step without giving the answer',
        proactiveNudgesLabel: 'Tutor activity',
        proactiveNudgesDescription:
          'Controls how assertively the tutor may suggest the next move or review.',
        proactiveNudgesOff: 'No proactive nudges',
        proactiveNudgesGentle: 'Gently suggest the next step',
        proactiveNudgesCoach: 'Clearly propose the next exercise',
        uiModeLabel: 'Tutor interface mode',
        uiModeDescription:
          'Anchored mode follows the selection and the active task. Freeform mode lets you drag the open panel around the page. Static mode keeps the chat in one place but still uses the current lesson or test context.',
        uiModeAnchored: 'Anchored near content',
        uiModeFreeform: 'Freeform draggable panel',
        uiModeStatic: 'Static in the corner',
      },
    },
    usageApi: {
      availabilityErrors: {
        disabled: 'AI Tutor is not enabled for this learner.',
        emailUnverified: 'Verify your parent email to unlock AI Tutor.',
        missingContext: 'AI Tutor context is required for Kangur tutoring sessions.',
        lessonsDisabled: 'AI Tutor is disabled for lessons for this learner.',
        testsDisabled: 'AI Tutor is disabled for tests for this learner.',
        reviewAfterAnswerOnly:
          'AI Tutor is available in tests only after the answer has been revealed.',
      },
    },
    parentVerification: {
      createSuccessMessage:
        'Check the parent email. The account will be created after the address is confirmed, and AI Tutor will unlock after verification.',
      createResentMessage:
        'This parent account is waiting for email confirmation. We sent a new verification email. The account will activate after the address is verified.',
      verifySuccessMessage:
        'The email has been verified. The parent account is ready, AI Tutor is unlocked, and you can sign in with email and password.',
      emailSubject: 'Kangur: confirm the parent email',
      emailGreetingTemplate: 'Hi {displayName},',
      emailReadyLine: 'The parent account in Kangur is almost ready.',
      emailInstructionLine: 'Click the link below to confirm the email:',
      emailUnlockLine: 'After the email is confirmed, AI Tutor will be unlocked.',
      emailIgnoreLine: 'If you did not create this account, ignore this message.',
    },
    messageList: {
      followUpTitle: 'Next step',
      hintFollowUpQuestion: 'Do you need another hint?',
      hintFollowUpActionLabel: 'Yes, help me',
      sourcesTitle: 'Sources',
      helpfulPrompt: 'Was this helpful?',
      helpfulYesLabel: 'Yes',
      helpfulNoLabel: 'Not yet',
      helpfulStatus: 'Thanks. This helps tailor the tutor’s next answers.',
      notHelpfulStatus: 'Thanks. The tutor will try a different approach in the next answer.',
      loadingLabel: 'Thinking...',
    },
    moods: {
      neutral: {
        label: 'Neutral',
        description: 'A stable starting point when a stronger tone is not needed.',
      },
      thinking: {
        label: 'Thoughtful',
        description: 'The tutor is considering the next step and organising hints.',
      },
      focused: {
        label: 'Focused',
        description: 'The tutor stays on the current task and guides through a specific fragment.',
      },
      careful: {
        label: 'Careful',
        description: 'The tutor slows the pace and keeps the next steps precise.',
      },
      curious: {
        label: 'Curious',
        description: 'The tutor encourages exploration and asking questions.',
      },
      encouraging: {
        label: 'Encouraging',
        description: 'The tutor reinforces the learner’s effort and helps them move on.',
      },
      motivating: {
        label: 'Motivating',
        description: 'The tutor keeps up the energy and willingness to continue.',
      },
      playful: {
        label: 'Playful',
        description: 'The tutor keeps a light, more game-like tone in the conversation.',
      },
      calm: {
        label: 'Calm',
        description: 'The tutor lowers the tension and organises the situation step by step.',
      },
      patient: {
        label: 'Patient',
        description: 'The tutor gives more time and returns to the basics without pressure.',
      },
      gentle: {
        label: 'Gentle',
        description: 'The tutor guides softly and limits too many stimuli.',
      },
      reassuring: {
        label: 'Reassuring',
        description: 'The tutor strengthens the sense of safety and reduces stress.',
      },
      empathetic: {
        label: 'Empathetic',
        description: 'The tutor recognises the learner’s difficulty and adjusts the support tone.',
      },
      supportive: {
        label: 'Supportive',
        description: 'The tutor actively supports the learner in the current attempt.',
      },
      reflective: {
        label: 'Reflective',
        description: 'The tutor helps analyse what already happened and what it teaches.',
      },
      determined: {
        label: 'Determined',
        description: 'The tutor drives toward one concrete next step.',
      },
      confident: {
        label: 'Confident',
        description: 'The tutor gives shorter hints because the learner is coping better and better.',
      },
      proud: {
        label: 'Proud',
        description: 'The tutor highlights progress and genuinely appreciates the learner’s achievements.',
      },
      happy: {
        label: 'Happy',
        description: 'The tutor keeps a warm, positive tone after successful work.',
      },
      celebrating: {
        label: 'Celebrating',
        description: 'The tutor strongly marks a success or an important breakthrough.',
      },
    },
    drawing: {
      title: 'Drawing',
      toggleLabel: 'Draw',
      penLabel: 'Pen',
      eraserLabel: 'Eraser',
      undoLabel: 'Undo',
      clearLabel: 'Clear',
      cancelLabel: 'Cancel',
      doneLabel: 'Done',
      previewAlt: 'Drawing',
      attachedLabel: 'Drawing attached',
      messageLabel: 'Drawn',
    },
  },
  de: {
    locale: 'de',
    common: {
      defaultTutorName: 'Janek',
      openTutorAria: 'KI-Tutor öffnen',
      closeTutorAria: 'Tutor schließen',
      closeAria: 'Schließen',
      closeWindowAria: 'Fenster des KI-Tutors schließen',
      disableTutorAria: 'KI-Tutor deaktivieren',
      disableTutorLabel: 'Deaktivieren',
      enableTutorLabel: 'KI-Tutor aktivieren',
      signInLabel: 'Anmelden',
      createAccountLabel: 'Konto erstellen',
      askAboutSelectionLabel: 'Danach fragen',
      sendAria: 'Senden',
      questionInputAria: 'Frage eingeben',
      sendFailureFallback:
        'Entschuldigung, etwas ist schiefgelaufen. Bitte versuchen Sie es erneut.',
      sessionRegistryLabel: 'Sitzung des Kangur KI-Tutors',
    },
    narrator: {
      readLabel: 'Vorlesen',
      pauseLabel: 'Pause',
      resumeLabel: 'Fortsetzen',
      helpTitleSuffix: 'hilfe',
      chatTitleSuffix: 'chat',
      registrySourceLabel: 'Erzähler des Kangur KI-Tutors',
    },
    navigation: {
      restoreTutorLabel: 'KI-Tutor aktivieren',
    },
    panelChrome: {
      detachFromContextAria: 'Das Folgen des aktuellen Inhalts beenden',
      detachFromContextLabel: 'Lösen',
      followingContextLabel: 'Folgt dem Inhalt',
      moveToContextAria: 'Panel neben den aktuellen Inhalt verschieben',
      moveToContextLabel: 'Beim Inhalt',
      moodPrefix: 'Stimmung',
      resetPositionAria: 'Standardposition des Panels wiederherstellen',
      resetPositionLabel: 'Position zurücksetzen',
      snapPreviewPrefix: 'Loslassen zum Andocken',
      snapTargets: {
        bottom: 'nach unten',
        bottomLeft: 'in die linke untere Ecke',
        bottomRight: 'in die rechte untere Ecke',
        left: 'an den linken Rand',
        right: 'an den rechten Rand',
        top: 'nach oben',
        topLeft: 'in die linke obere Ecke',
        topRight: 'in die rechte obere Ecke',
      },
      surfaceLabels: {
        test: 'Test',
        game: 'Spiel',
        lesson: 'Lektion',
        profile: 'Profil',
        parent_dashboard: 'Eltern-Dashboard',
        auth: 'Anmeldung',
      },
      contextFallbackTargets: {
        test: 'Neue Testfrage',
        game: 'Neuer Spielschritt',
        lesson: 'Neuer Lernabschnitt',
        profile: 'Neues Profilpanel',
        parent_dashboard: 'Neues Eltern-Dashboard',
        auth: 'Anmeldebildschirm',
      },
    },
    guestIntro: {
      closeAria: 'Fenster des KI-Tutors schließen',
      acceptLabel: 'Ja',
      dismissLabel: 'Nein',
      showLoginLabel: 'Anmeldung zeigen',
      showCreateAccountLabel: 'Kontoerstellung zeigen',
      browseLabel: 'Weiter stöbern',
      intentPhrases: {
        createAccount: [
          'konto erstellen',
          'elternkonto erstellen',
          'wie erstelle ich ein konto',
          'wo erstelle ich ein konto',
          'registrieren',
          'anmelden registrieren',
          'ich habe kein konto',
          'konto anlegen',
          'elternkonto',
          'registrierung öffnen',
        ],
        signIn: [
          'wie melde ich mich an',
          'wo melde ich mich an',
          'anmeldung öffnen',
          'anmelden',
          'login',
          'sign in',
          'anmeldung zeigen',
        ],
      },
      initial: {
        headline: 'Möchten Sie Hilfe beim Anmelden oder beim Erstellen eines Kontos?',
        description:
          'Ich kann zeigen, wo Sie sich anmelden oder wie Sie ein Elternkonto erstellen.',
      },
      repeated: {
        description:
          'Ich kann zeigen, wo Sie sich anmelden oder wie Sie ein Elternkonto erstellen.',
      },
      help: {
        headline: 'Ich zeige Ihnen, wo Sie klicken müssen.',
        description:
          'Wenn Sie bereits ein Konto haben, zeige ich Ihnen die Anmeldung. Wenn nicht, zeige ich Ihnen, wo Sie ein Elternkonto erstellen und wie Sie die E-Mail bestätigen.',
      },
    },
    homeOnboarding: {
      calloutHeaderLabel: 'KI-Helfer · Seitenrundgang',
      manualStartLabel: 'Seitenrundgang zeigen',
      manualReplayLabel: 'Seitenrundgang wiederholen',
      stepLabelTemplate: 'Schritt {current} von {total}',
      entry: {
        headline:
          'Möchten Sie, dass ich die wichtigsten Schaltflächen sowie die Bereiche für Ergebnis und Fortschritt zeige?',
        description:
          'Ich kann Sie durch die wichtigsten Aktionen auf der Startseite und die Stellen führen, an denen Sie Rangliste, Punkte und Lerntempo sehen.',
      },
      steps: {
        home_actions: {
          title: 'Hier wählen Sie, wie Sie starten möchten.',
          description:
            'Sie können zu Lektionen wechseln, ein Spiel starten, gemischtes Training beginnen oder Kangur Matematyczny öffnen.',
        },
        home_quest: {
          title: 'Hier erscheint Ihre aktuelle Quest.',
          description:
            'Das ist der schnellste Weg zu sehen, was sich als Nächstes lohnt, ohne raten zu müssen.',
        },
        priority_assignments: {
          title: 'Hier finden Sie Aufgaben vom Elternteil.',
          description:
            'Wenn hier Aufgaben vorhanden sind, lohnt es sich, mit ihnen zu beginnen, weil sie aktuell Priorität haben.',
        },
        leaderboard: {
          title: 'Hier sehen Sie die Rangliste.',
          description:
            'Sie können prüfen, wie Ihr Ergebnis im Vergleich zu anderen aussieht und wie viel bis zum nächsten Sprung fehlt.',
        },
        progress: {
          title: 'Hier verfolgen Sie Ihren Fortschritt.',
          description:
            'In diesem Bereich sehen Sie die Entwicklung des Spielers, die gesammelten Punkte und das Lerntempo.',
        },
      },
    },
    guidedCallout: {
      explanationHeaderSuffix: '· Erklärung',
      closeAria: 'Fenster des KI-Tutors schließen',
      sectionPrefix: 'Abschnitt',
      sectionTitleTemplate: 'Ich erkläre den Abschnitt: {label}',
      selectionTitle: 'Ich erkläre diesen Ausschnitt.',
      selectionRequestPrompt: 'Erkläre den markierten Ausschnitt Schritt für Schritt.',
      selectionDetailPending: 'Ich bereite gerade eine Erklärung für den markierten Text vor.',
      selectionDetailSoon:
        'Gleich öffne ich eine Erklärung genau für den markierten Text.',
      selectionSketchCtaLabel: 'Zeichne es mir bitte auf',
      selectionSketchHint:
        'Ich öffne das Zeichenbrett. Versuchen Sie, die Aufteilungen zu skizzieren und Formen nach Drehung oder Spiegelung zu vergleichen.',
      sectionDetailPending:
        'Ich bereite gerade eine Erklärung für diesen Teil der Seite vor.',
      sectionDetailSoon:
        'Gleich erkläre ich diesen Teil der Seite und zeige, worauf man achten sollte.',
      selectionPreparingBadge: 'Die Erklärung wird vorbereitet...',
      authTitles: {
        createAccountNav: 'Klicken Sie oben auf "{label}", um die Anmeldung zu öffnen.',
        signInNav: 'Klicken Sie oben auf "{label}".',
        createAccountIdentifier: 'Geben Sie hier die E-Mail des Elternteils ein.',
        signInIdentifier:
          'Geben Sie hier die E-Mail des Elternteils oder den Nickname des Schülers ein.',
        createAccountForm: 'Hier erstellen Sie ein Elternkonto.',
        signInForm: 'Hier geben Sie die Anmeldedaten ein.',
      },
      authDetails: {
        createAccountNav:
          'Damit öffnen Sie zuerst die Anmeldung. Schalten Sie das Formular danach auf die Erstellung eines Elternkontos um und geben Sie die Daten des Elternteils ein.',
        signInNav:
          'Diese Schaltfläche öffnet die Anmeldung. Klicken Sie zuerst in der Navigation darauf und geben Sie erst dann die Daten ein.',
        createAccountIdentifier:
          'Beginnen Sie in diesem Feld mit der E-Mail des Elternteils. Das Passwort legen Sie direkt darunter fest.',
        signInIdentifier:
          'Beginnen Sie in diesem Feld mit dem Login und geben Sie darunter das Passwort ein.',
        createAccountForm:
          'Geben Sie die E-Mail des Elternteils ein und legen Sie ein Passwort fest. Nach der E-Mail-Bestätigung kommen Sie mit denselben Daten hierher zurück.',
        signInForm:
          'Geben Sie die E-Mail des Elternteils oder den Nickname des Schülers und danach das Passwort ein.',
      },
      buttons: {
        back: 'Zurück',
        finish: 'Fertig',
        understand: 'Verstanden',
      },
    },
    focusChips: {
      selection: {
        testWithText: 'Fragenausschnitt',
        testWithoutText: 'Markierter Ausschnitt',
        gameWithText: 'Spielausschnitt',
        gameWithoutText: 'Markierter Ausschnitt',
        lessonWithText: 'Lektionsausschnitt',
        lessonWithoutText: 'Markierter Ausschnitt',
      },
      kinds: {
        hero: 'Einführung',
        screen: 'Bildschirm',
        library: 'Bibliothek',
        empty_state: 'Leerer Zustand',
        navigation: 'Navigation',
        home_actions: 'Start',
        home_quest: 'Quest',
        priority_assignments: 'Aufgaben vom Elternteil',
        leaderboard: 'Rangliste',
        progress: 'Fortschritt',
        assignment: 'Aufgabe vom Elternteil',
        lesson_header: 'Lektionsthema',
        document: 'Lektionsinhalt',
        question: 'Aktuelle Frage',
        review: 'Fragenbesprechung',
        summary: 'Testzusammenfassung',
        login_action: 'Anmeldung',
        create_account_action: 'Kontoerstellung',
        login_identifier_field: 'Anmeldefeld',
        login_form: 'Anmeldeformular',
      },
    },
    sectionExplainPrompts: {
      home_actions: {
        defaultPrompt:
          'Erkläre den Abschnitt zur Auswahl der Aktivität. Sage, wofür die verfügbaren Optionen da sind und wann man welche wählen sollte.',
      },
      home_quest: {
        defaultPrompt:
          'Erkläre den Quest-Abschnitt des Lernenden. Sage, wie man diese Aufgabe lesen soll und was der nächste Schritt sein sollte.',
      },
      priority_assignments: {
        defaultPrompt:
          'Erkläre den Abschnitt mit den priorisierten Aufgaben. Sage, woher diese Aufgaben kommen und womit man am besten anfängt.',
      },
      leaderboard: {
        defaultPrompt:
          'Erkläre den Ranglisten-Abschnitt. Sage, was die Positionen und Punkte bedeuten und wie man das Ergebnis verbessern kann.',
      },
      progress: {
        defaultPrompt:
          'Erkläre den Fortschritts-Abschnitt. Sage, was die angezeigten Werte bedeuten und worauf man achten sollte.',
      },
      lesson_header: {
        defaultPrompt:
          'Erkläre, worum es in dieser Lektion geht und was der Lernende hier lernen wird.',
        labeledPrompt:
          'Erkläre, worum es in der Lektion "{label}" geht und was der Lernende hier lernen wird.',
      },
      assignment: {
        defaultPrompt:
          'Erkläre diese Aufgabe und sage, was zu tun ist und womit man am besten anfängt.',
        labeledPrompt:
          'Erkläre die Aufgabe "{label}". Sage, was zu tun ist und womit man am besten anfängt.',
      },
      document: {
        defaultPrompt:
          'Erkläre den Hauptinhalt dieser Lektion und sage, wie man ihn Schritt für Schritt lesen sollte.',
        labeledPrompt:
          'Erkläre den Hauptinhalt der Lektion "{label}". Sage, worum es in diesem Teil geht und wie man ihn Schritt für Schritt lesen sollte.',
      },
      question: {
        defaultPrompt:
          'Erkläre diese Frage. Sage, worauf man sich konzentrieren sollte, aber gib nicht die fertige Antwort.',
      },
      review: {
        defaultPrompt:
          'Erkläre die Besprechung der Antwort. Sage, was gut lief, wo der Fehler liegen könnte und was man als Nächstes prüfen sollte.',
      },
      summary: {
        defaultPrompt:
          'Erkläre diese Zusammenfassung und sage, was das Ergebnis zeigt und was der nächste Schritt sein könnte.',
        labeledPrompt:
          'Erkläre die Zusammenfassung "{label}". Sage, was das Ergebnis zeigt und was der nächste Schritt sein könnte.',
      },
      default: {
        defaultPrompt:
          'Erkläre diesen Abschnitt der Seite und sage, worauf man achten sollte.',
        labeledPrompt:
          'Erkläre diesen Abschnitt: {label}. Sage, worum es geht und worauf man achten sollte.',
      },
    },
    quickActions: {
      review: {
        questionLabel: 'Antwort besprechen',
        gameLabel: 'Spiel besprechen',
        resultLabel: 'Ergebnis besprechen',
        questionPrompt:
          'Besprich diese Frage: was gut lief, wo der Fehler lag und was ich beim nächsten Mal prüfen sollte.',
        gamePrompt:
          'Besprich mein letztes Spiel: was gut lief und was ich als Nächstes üben sollte.',
        resultPrompt:
          'Besprich mein Testergebnis: was gut lief und was ich beim nächsten Mal verbessern sollte.',
      },
      nextStep: {
        reviewQuestionLabel: 'Was verbessern?',
        reviewOtherLabel: 'Was üben?',
        reviewQuestionPrompt: 'Sag mir, was ich nach dieser Frage als Nächstes üben sollte.',
        reviewGamePrompt: 'Sag mir, was mein nächster Schritt nach diesem Spiel sein sollte.',
        reviewTestPrompt: 'Sag mir, was mein nächster Schritt nach diesem Test sein sollte.',
        assignmentLabel: 'Aufgabenplan',
        defaultLabel: 'Wie weiter?',
        assignmentGamePrompt:
          'Sag mir, was mein nächster Schritt in dieser Aufgabe und in diesem Spiel sein sollte.',
        assignmentLessonPrompt:
          'Sag mir, was mein nächster Schritt in dieser Aufgabe und in dieser Lektion sein sollte.',
        gamePrompt:
          'Sag mir, was ich auf Basis meines Spiels als Nächstes üben sollte.',
        defaultPrompt:
          'Sag mir, was ich auf Basis meines Fortschritts als Nächstes üben sollte.',
      },
      explain: {
        assignmentLabel: 'Thema erklären',
        defaultLabel: 'Erklären',
        selectedPrompt: 'Erkläre diesen Ausschnitt in einfachen Worten.',
        defaultPrompt: 'Erkläre mir das in einfachen Worten.',
      },
      hint: {
        defaultLabel: 'Hinweis',
        defaultPrompt: 'Gib mir einen kleinen Hinweis, aber nicht die fertige Antwort.',
        altLabel: 'Andere Spur',
        altPrompt: 'Gib mir eine andere kleine Spur, aber nicht die fertige Antwort.',
      },
      howThink: {
        defaultLabel: 'Wie denken?',
        defaultPrompt:
          'Erkläre, wie man an diese Frage Schritt für Schritt herangeht, ohne die Antwort zu geben.',
        misconceptionLabel: 'Was verwechsle ich?',
        misconceptionPrompt:
          'Hilf mir zu finden, wo mein Denkweg falsch sein könnte, ohne die Antwort zu geben.',
        ladderLabel: 'Wie weiterdenken?',
        ladderPrompt:
          'Hilf mir, den Denkweg Schritt für Schritt zu prüfen, ohne die Antwort zu geben.',
      },
      selectedText: {
        label: 'Dieser Ausschnitt',
        prompt: 'Erkläre diesen markierten Ausschnitt in einfachen Worten.',
      },
    },
    proactiveNudges: {
      gentleTitle: 'Vorgeschlagener erster Schritt',
      coachTitle: 'Der Tutor schlägt einen Start vor',
      selectedTextCoach:
        'Sie haben einen Ausschnitt markiert, daher schlägt der Tutor vor, zuerst genau dieses Stück zu entwirren.',
      selectedTextGentle: 'Beginnen Sie mit einer kurzen Erklärung des markierten Ausschnitts.',
      bridgeToGameCoach:
        'Der Tutor schlägt vor, diese Lektion sofort in eine konkrete Übung zu übersetzen.',
      bridgeToGameGentle: 'Beginnen Sie mit einer konkreten Übung nach dieser Lektion.',
      reviewCoach:
        'Der Tutor schlägt vor, zuerst den Versuch zu besprechen und erst danach die nächste Übung zu wählen.',
      reviewGentle:
        'Am ruhigsten ist es, mit einer kurzen Besprechung des letzten Versuchs zu beginnen.',
      stepByStepCoach:
        'Der Tutor schlägt vor, direkt mit einem Denkplan Schritt für Schritt zu starten.',
      stepByStepGentle:
        'Am besten beginnt man mit einem Denkplan Schritt für Schritt.',
      hintCoach:
        'Der Tutor schlägt einen schnellen Hinweis vor, damit Sie ohne verratene Antwort weiterkommen.',
      hintGentle:
        'Ein kleiner Hinweis sollte reichen, um wieder voranzukommen.',
      assignmentCoach:
        'Der Tutor schlägt vor, jetzt einen konkreten nächsten Schritt für die Aufgabe zu wählen.',
      assignmentGentle:
        'Bitten Sie um einen konkreten nächsten Schritt für diese Aufgabe.',
      defaultCoach:
        'Der Tutor schlägt vor, die nächste Arbeitsrichtung direkt festzulegen.',
      defaultGentle:
        'Ein kurzer Start mit einer Erklärung oder dem nächsten Schritt funktioniert meist am besten.',
      buttonLabel: 'Jetzt ausprobieren',
    },
    contextSwitch: {
      title: 'Neuer Hilfekontext',
      detailCurrentQuestion: 'Der Tutor richtet sich nach der aktuellen Frage aus.',
      detailCurrentAssignment: 'Der Tutor richtet sich nach der aktiven Aufgabe aus.',
    },
    emptyStates: {
      selectedText:
        'Sie haben einen Ausschnitt markiert. Fragen Sie nach einer Erklärung oder dem nächsten Schritt.',
      activeQuestion:
        'Fragen Sie nach einem Hinweis zu dieser Frage. Der Tutor gibt nicht direkt die fertige Antwort.',
      bridgeToGame:
        'Der vorherige Schritt ist bereits erledigt. Fragen Sie nach einer konkreten Übung nach dieser Lektion.',
      reviewQuestion:
        'Fragen Sie nach einer Besprechung der Antwort oder dem nächsten Übungsschritt.',
      reviewGame:
        'Fragen Sie nach einer Spielbesprechung oder einem Plan für die nächsten Übungen.',
      reviewTest:
        'Fragen Sie nach einer Besprechung des Ergebnisses oder einem Plan für die nächsten Übungen.',
      assignment:
        'Fragen Sie nach einem Plan zur Lösung der Aufgabe oder nach einer kurzen Erklärung des Themas.',
      game:
        'Haben Sie eine Frage zum Spiel? Fragen Sie nach einem Hinweis oder dem nächsten Schritt.',
      lesson:
        'Haben Sie eine Frage zur Lektion? Fragen Sie nach einer Erklärung oder dem nächsten Schritt.',
      selectionPending: 'Warten Sie, ich erkläre den markierten Ausschnitt.',
      sectionPending: 'Warten Sie, ich erkläre den gewählten Abschnitt.',
    },
    placeholders: {
      limitReached: 'Tägliches Nachrichtenlimit erreicht',
      selectedText: 'Fragen Sie nach dem markierten Ausschnitt',
      activeQuestion: 'Fragen Sie nach einem Hinweis zur Frage',
      bridgeToGame: 'Fragen Sie nach einer Übung nach dieser Lektion',
      reviewQuestion: 'Fragen Sie nach einer Besprechung der Antwort',
      reviewGame: 'Fragen Sie nach dem Spiel oder dem nächsten Schritt',
      reviewTest: 'Fragen Sie nach dem Ergebnis oder dem nächsten Schritt',
      assignment: 'Fragen Sie nach der Aufgabe oder dem nächsten Schritt',
      game: 'Fragen Sie nach dem Spiel',
      lesson: 'Fragen Sie...',
      askModal: 'Schreiben Sie eine Frage an den Tutor',
    },
    askModal: {
      helperDefault:
        'Sie können nach der Anmeldung, dem Elternkonto oder der Nutzung der Seite fragen.',
      helperAuth:
        'Sie können nach der Anmeldung, dem Elternkonto oder dem nächsten Schritt auf der Seite fragen.',
    },
    panelContext: {
      selectedTitle: 'Erklärter Ausschnitt',
      sectionTitle: 'Erklärter Abschnitt',
      refocusSelectionLabel: 'Ausschnitt zeigen',
      detachSelectionLabel: 'Zurück zum Chat',
      refocusSectionLabel: 'Abschnitt zeigen',
      detachSectionLabel: 'Zurück zum Chat',
      selectedPendingDetail:
        'Einen Moment. Ich konzentriere mich jetzt nur auf diesen Ausschnitt und bereite die Erklärung vor.',
      selectedCompleteDetail:
        'Die Erklärung ist fertig. Sie können nachfragen oder zum normalen Chat zurückkehren.',
      selectedDefaultDetail:
        'Sie können zum normalen Chat zurückkehren oder den Ausschnitt erneut auf der Seite zeigen.',
      selectedPendingStatus:
        'Ich bereite eine Erklärung genau für den markierten Text vor.',
      selectedCompleteStatus:
        'Die Erklärung ist fertig. Sie können jetzt nach Details fragen.',
      sectionPendingDetail:
        'Einen Moment. Ich konzentriere mich jetzt nur auf diesen Abschnitt und bereite die Erklärung vor.',
      sectionCompleteDetail:
        'Die Erklärung ist fertig. Sie können nachfragen oder zum normalen Chat zurückkehren.',
      sectionDefaultDetail:
        'Dieses Gespräch ist jetzt an diesen Teil der Seite angeheftet. Sie können den Abschnitt erneut zeigen oder zum normalen Chat zurückkehren.',
      sectionPendingStatus:
        'Ich bereite eine Erklärung genau für diesen Teil der Seite vor.',
      sectionCompleteStatus:
        'Die Erklärung ist fertig. Sie können jetzt nach Details fragen.',
    },
    auxiliaryControls: {
      dailyLimitTemplate: 'Limit heute: {count}/{limit}',
      toolboxDescription:
        'Kurzbefehle zu Hinweisen, Zeichnen und nächsten Schritten im aktuellen Gespräch.',
      toolboxTitle: 'Tutor-Werkzeuge',
      usageRefreshing: 'Wird aktualisiert...',
      usageExhausted: 'Limit erreicht',
      usageRemainingTemplate: '{remaining} übrig',
    },
    profileMoodWidget: {
      title: 'Stimmung des KI-Tutors',
      descriptionWithLearnerTemplate:
        'Diese Einstellung gehört zum Profil von {learnerName} und ändert sich mit Fortschritt, Aufgabenumfang und Gesprächsverlauf mit dem Tutor.',
      descriptionFallback:
        'Im lokalen Modus funktioniert der Tutor, aber die Stimmung wird nicht pro Lernendem gespeichert.',
      baselineLabel: 'Grundton',
      baselineDescription: 'Der Ton, zu dem der Tutor als Ausgangspunkt zurückkehrt.',
      confidenceLabel: 'Sicherheit',
      confidenceDescription:
        'Wie stark die Signale des Lernenden die aktuelle Stimmung stützen.',
      updatedLabel: 'Aktualisiert',
      updatedDescription: 'Der zuletzt gespeicherte Zustand im Profil des Lernenden.',
      updatedFallback: 'Noch nicht berechnet',
    },
    parentDashboard: {
      noActiveLearner: 'Wählen Sie einen Lernenden aus, um den KI-Tutor zu konfigurieren.',
      titleTemplate: 'KI-Tutor für {learnerName}',
      subtitle:
        'Legen Sie Verfügbarkeit und Guardrails der KI-Hilfe für diesen Lernenden fest',
      moodTitle: 'Aktuelle Stimmung des Lernenden',
      baselineLabel: 'Grundton',
      confidenceLabel: 'Sicherheit',
      updatedLabel: 'Aktualisierung',
      updatedFallback: 'Noch nicht berechnet',
      usageTitle: 'Heutige Nutzung',
      usageLoading: 'Heutige Nachrichten werden geprüft...',
      usageError: 'Die aktuelle Nutzung konnte nicht gelesen werden.',
      usageUnlimitedTemplate: '{messageCount} Nachrichten gesendet.',
      usageLimitedTemplate:
        '{messageCount} von {dailyMessageLimit} Nachrichten verbraucht.',
      usageUnlimitedBadge: 'Unbegrenzt',
      usageExhaustedBadge: 'Limit erreicht',
      usageRemainingBadgeTemplate: '{remainingMessages} übrig',
      usageHelp:
        'Diese Ansicht aktualisiert sich automatisch, damit das Elternteil die aktuelle Nutzung des aktiven Lernenden sieht.',
      toggleEnabledLabel: 'KI-Tutor aktiviert',
      toggleDisabledLabel: 'KI-Tutor deaktiviert',
      toggleEnableActionLabel: 'KI-Tutor aktivieren',
      toggleDisableActionLabel: 'KI-Tutor deaktivieren',
      guardrailsTitle: 'Guardrails der Eltern',
      saveIdleLabel: 'Einstellungen des KI-Tutors speichern',
      savePendingLabel: 'Wird gespeichert...',
      saveSuccess: 'Die Einstellungen des KI-Tutors wurden gespeichert.',
      saveError: 'Die Einstellungen konnten nicht gespeichert werden.',
      toggles: {
        allowLessonsLabel: 'Tutor in Lektionen anzeigen',
        allowLessonsDescription:
          'Der Tutor kann in offenen Lektionen und bei selbstständigen Wiederholungen helfen.',
        allowGamesLabel: 'Tutor in Spielen anzeigen',
        allowGamesDescription:
          'Der Tutor kann in Grajmy bei Trainings und Quizzen helfen, ohne dies mit den Lektionseinstellungen zu vermischen.',
        showSourcesLabel: 'Quellen der Antworten anzeigen',
        showSourcesDescription:
          'Nach einer Antwort kann der Tutor Ausschnitte der verwendeten Materialien zeigen.',
        allowSelectedTextSupportLabel:
          'Fragen zum markierten Ausschnitt erlauben',
        allowSelectedTextSupportDescription:
          'Nach dem Öffnen des Tutors kann er am ausgewählten Ausschnitt arbeiten, ohne die Markierung zu verlieren.',
        allowCrossPagePersistenceLabel:
          'Gespräch beim Ortswechsel beibehalten',
        allowCrossPagePersistenceDescription:
          'Der Tutor kann geöffnet bleiben und nach dem Wechsel zwischen Lektionen, Tests und Zusammenfassungen zum vorherigen Faden zurückkehren.',
        rememberTutorContextLabel: 'Letzte Hinweise merken',
        rememberTutorContextDescription:
          'Erlaubt dem Tutor, eine kurze Erinnerung an die letzte Blockade und den empfohlenen nächsten Schritt zwischen Lernersitzungen mitzunehmen.',
      },
      selects: {
        testAccessModeLabel: 'Hilfemodus in Tests',
        testAccessModeDescription:
          'Diese Einschränkung gilt auch in der API, sodass ein aktiver Test sie nicht mit einer manuellen Anfrage umgehen kann.',
        testAccessModeDisabled: 'Tutor in Tests deaktivieren',
        testAccessModeGuided: 'Nur Hinweise erlauben, keine Antworten',
        testAccessModeReview: 'Erst nach Anzeige der Antwort erlauben',
        hintDepthLabel: 'Hinweistiefe',
        hintDepthDescription:
          'Legt fest, wie ausführlich die Hinweise in einer einzelnen Tutor-Antwort sein sollen.',
        hintDepthBrief: 'Ein kurzer Impuls',
        hintDepthGuided: 'Ein Hinweis und eine Kontrollfrage',
        hintDepthStepByStep:
          'Schritt für Schritt führen, ohne die Antwort zu geben',
        proactiveNudgesLabel: 'Aktivität des Tutors',
        proactiveNudgesDescription:
          'Steuert, wie deutlich der Tutor den nächsten Schritt oder eine Wiederholung vorschlagen darf.',
        proactiveNudgesOff: 'Keine aktiven Hinweise',
        proactiveNudgesGentle: 'Nächsten Schritt sanft vorschlagen',
        proactiveNudgesCoach: 'Nächste Übung deutlich vorschlagen',
        uiModeLabel: 'Modus der Tutor-Oberfläche',
        uiModeDescription:
          'Der verankerte Modus folgt der Auswahl und der aktiven Aufgabe. Im freien Modus können Sie das geöffnete Panel auf der Seite ziehen. Der statische Modus hält den Chat an einem festen Ort, nutzt aber weiterhin den aktuellen Kontext der Lektion oder des Tests.',
        uiModeAnchored: 'Verankert beim Inhalt',
        uiModeFreeform: 'Freies, verschiebbares Panel',
        uiModeStatic: 'Statisch in der Ecke',
      },
    },
    usageApi: {
      availabilityErrors: {
        disabled: 'Der KI-Tutor ist für diesen Lernenden nicht aktiviert.',
        emailUnverified:
          'Bestätigen Sie die E-Mail der Eltern, um den KI-Tutor freizuschalten.',
        missingContext:
          'Für Kangur-Nachhilfesitzungen ist ein Kontext für den KI-Tutor erforderlich.',
        lessonsDisabled: 'Der KI-Tutor ist für Lektionen dieses Lernenden deaktiviert.',
        testsDisabled: 'Der KI-Tutor ist für Tests dieses Lernenden deaktiviert.',
        reviewAfterAnswerOnly:
          'Der KI-Tutor ist in Tests erst verfügbar, nachdem die Antwort angezeigt wurde.',
      },
    },
    parentVerification: {
      createSuccessMessage:
        'Prüfen Sie die E-Mail der Eltern. Das Konto wird nach der Bestätigung der Adresse erstellt, und der KI-Tutor wird nach der Verifizierung freigeschaltet.',
      createResentMessage:
        'Dieses Elternkonto wartet auf die Bestätigung der E-Mail. Wir haben eine neue Bestätigungs-E-Mail gesendet. Das Konto wird nach der Verifizierung der Adresse aktiviert.',
      verifySuccessMessage:
        'Die E-Mail wurde verifiziert. Das Elternkonto ist bereit, der KI-Tutor ist freigeschaltet, und Sie können sich mit E-Mail und Passwort anmelden.',
      emailSubject: 'Kangur: E-Mail der Eltern bestätigen',
      emailGreetingTemplate: 'Hallo {displayName},',
      emailReadyLine: 'Das Elternkonto in Kangur ist fast fertig.',
      emailInstructionLine:
        'Klicken Sie auf den untenstehenden Link, um die E-Mail zu bestätigen:',
      emailUnlockLine: 'Nach der Bestätigung der E-Mail wird der KI-Tutor freigeschaltet.',
      emailIgnoreLine:
        'Wenn Sie dieses Konto nicht erstellt haben, ignorieren Sie diese Nachricht.',
    },
    messageList: {
      followUpTitle: 'Nächster Schritt',
      hintFollowUpQuestion: 'Brauchen Sie noch einen weiteren Hinweis?',
      hintFollowUpActionLabel: 'Ja, hilf mir',
      sourcesTitle: 'Quellen',
      helpfulPrompt: 'War das hilfreich?',
      helpfulYesLabel: 'Ja',
      helpfulNoLabel: 'Noch nicht',
      helpfulStatus:
        'Danke. Das hilft, die nächsten Antworten des Tutors besser anzupassen.',
      notHelpfulStatus:
        'Danke. Der Tutor versucht es in der nächsten Antwort auf eine andere Weise.',
      loadingLabel: 'Ich denke nach...',
    },
    moods: {
      neutral: {
        label: 'Neutral',
        description:
          'Ein stabiler Ausgangspunkt, wenn kein stärkerer Ton gebraucht wird.',
      },
      thinking: {
        label: 'Nachdenklich',
        description:
          'Der Tutor überlegt den nächsten Schritt und ordnet die Hinweise.',
      },
      focused: {
        label: 'Fokussiert',
        description:
          'Der Tutor bleibt bei der aktuellen Aufgabe und führt durch einen konkreten Ausschnitt.',
      },
      careful: {
        label: 'Vorsichtig',
        description:
          'Der Tutor verlangsamt das Tempo und hält die nächsten Schritte präzise.',
      },
      curious: {
        label: 'Neugierig',
        description:
          'Der Tutor ermutigt zum Entdecken und zum Stellen von Fragen.',
      },
      encouraging: {
        label: 'Ermutigend',
        description:
          'Der Tutor stärkt die Anstrengung des Lernenden und hilft beim Weitergehen.',
      },
      motivating: {
        label: 'Motivierend',
        description:
          'Der Tutor hält die Energie und die Lust auf weiteres Arbeiten aufrecht.',
      },
      playful: {
        label: 'Spielerisch',
        description:
          'Der Tutor hält den Ton des Gesprächs leicht und stärker spielerisch.',
      },
      calm: {
        label: 'Ruhig',
        description:
          'Der Tutor senkt die Spannung und ordnet die Situation Schritt für Schritt.',
      },
      patient: {
        label: 'Geduldig',
        description:
          'Der Tutor gibt mehr Zeit und kehrt ohne Druck zu den Grundlagen zurück.',
      },
      gentle: {
        label: 'Sanft',
        description:
          'Der Tutor führt behutsam und begrenzt zu viele Reize.',
      },
      reassuring: {
        label: 'Beruhigend',
        description:
          'Der Tutor stärkt das Sicherheitsgefühl und reduziert Stress.',
      },
      empathetic: {
        label: 'Einfühlsam',
        description:
          'Der Tutor erkennt die Schwierigkeit des Lernenden und passt den Unterstützungston an.',
      },
      supportive: {
        label: 'Unterstützend',
        description:
          'Der Tutor trägt den Lernenden aktiv im aktuellen Versuch.',
      },
      reflective: {
        label: 'Reflektierend',
        description:
          'Der Tutor hilft zu analysieren, was bereits passiert ist und was man daraus lernt.',
      },
      determined: {
        label: 'Entschlossen',
        description:
          'Der Tutor steuert auf einen konkreten nächsten Schritt zu.',
      },
      confident: {
        label: 'Selbstsicher',
        description:
          'Der Tutor gibt kürzere Hinweise, weil der Lernende immer besser zurechtkommt.',
      },
      proud: {
        label: 'Stolz',
        description:
          'Der Tutor hebt Fortschritt hervor und würdigt die Erfolge des Lernenden ehrlich.',
      },
      happy: {
        label: 'Freudig',
        description:
          'Der Tutor hält nach gelungener Arbeit einen warmen, positiven Ton.',
      },
      celebrating: {
        label: 'Feiernd',
        description:
          'Der Tutor betont einen Erfolg oder einen wichtigen Durchbruch besonders deutlich.',
      },
    },
    drawing: {
      title: 'Zeichnen',
      toggleLabel: 'Zeichnen',
      penLabel: 'Stift',
      eraserLabel: 'Radierer',
      undoLabel: 'Rückgängig',
      clearLabel: 'Löschen',
      cancelLabel: 'Abbrechen',
      doneLabel: 'Fertig',
      previewAlt: 'Zeichnung',
      attachedLabel: 'Zeichnung angehängt',
      messageLabel: 'Gezeichnet',
    },
  },
  uk: {
    locale: 'uk',
    panelChrome: {
      detachFromContextAria: 'Перестати стежити за поточним вмістом',
      detachFromContextLabel: 'Відкріпити',
      followingContextLabel: 'Стежить за вмістом',
      moveToContextAria: 'Перемістити панель поруч із поточним вмістом',
      moveToContextLabel: 'Поруч із вмістом',
      moodPrefix: 'Настрій',
      resetPositionAria: 'Відновити стандартну позицію панелі',
      resetPositionLabel: 'Скинути позицію',
      snapPreviewPrefix: 'Відпустіть, щоб пристикувати',
      snapTargets: {
        bottom: 'вниз',
        bottomLeft: 'у нижній лівий кут',
        bottomRight: 'у нижній правий кут',
        left: 'до лівого краю',
        right: 'до правого краю',
        top: 'вгору',
        topLeft: 'у верхній лівий кут',
        topRight: 'у верхній правий кут',
      },
      surfaceLabels: {
        test: 'Тест',
        game: 'Гра',
        lesson: 'Урок',
        profile: 'Профіль',
        parent_dashboard: 'Панель для батьків',
        auth: 'Вхід',
      },
      contextFallbackTargets: {
        test: 'Нове тестове запитання',
        game: 'Новий крок гри',
        lesson: 'Новий фрагмент уроку',
        profile: 'Нова панель профілю',
        parent_dashboard: 'Нова батьківська панель',
        auth: 'Екран входу',
      },
    },
  },
};

export const KANGUR_AI_TUTOR_CONTENT_TRANSLATABLE_SECTION_KEYS = Array.from(
  new Set(
    Object.values(CONTENT_COPY_BY_LOCALE).flatMap((content) =>
      Object.keys(content).filter((key) => key !== 'locale')
    )
  )
) as KangurAiTutorContentTranslatableSectionKey[];

export const getKangurAiTutorContentLocaleOverlay = (
  locale: string
): Partial<KangurAiTutorContent> => {
  const normalizedLocale = normalizeSiteLocale(locale);
  return CONTENT_COPY_BY_LOCALE[normalizedLocale] ?? { locale: normalizedLocale };
};

export const buildKangurAiTutorContentLocaleScaffold = (input: {
  locale: string;
  sourceContent: KangurAiTutorContent;
  existingContent?: Partial<KangurAiTutorContent> | null;
}): KangurAiTutorContent => {
  const normalizedLocale = normalizeSiteLocale(input.locale);
  const sourceScaffold = deepMerge(input.sourceContent, { locale: normalizedLocale });
  const withExistingContent = deepMerge(sourceScaffold, input.existingContent ?? {});
  const withLocaleOverlay = applyOverlayWhenStillSource(
    sourceScaffold,
    withExistingContent,
    getKangurAiTutorContentLocaleOverlay(normalizedLocale)
  );

  return parseKangurAiTutorContent(withLocaleOverlay);
};

const mergeKangurAiTutorContentWithSource = (input: {
  locale: string;
  sourceContent: KangurAiTutorContent;
  localizedContent?: Partial<KangurAiTutorContent> | null;
}): KangurAiTutorContent =>
  parseKangurAiTutorContent({
    ...(deepMerge(cloneValue(input.sourceContent), input.localizedContent ?? {}) as Partial<KangurAiTutorContent>),
    locale: normalizeSiteLocale(input.locale),
  });

export const buildKangurAiTutorContentTranslationStatusBySectionKey = (input: {
  locale: string;
  sourceContent: KangurAiTutorContent;
  localizedContent?: Partial<KangurAiTutorContent> | null;
  sourceLocale?: string;
}): Map<KangurAiTutorContentTranslatableSectionKey, KangurAiTutorContentTranslationStatus> => {
  const locale = normalizeSiteLocale(input.locale);
  const sourceLocale = normalizeSiteLocale(input.sourceLocale ?? 'pl');
  const sourceContent = parseKangurAiTutorContent(input.sourceContent);

  if (locale === sourceLocale) {
    return new Map(
      KANGUR_AI_TUTOR_CONTENT_TRANSLATABLE_SECTION_KEYS.map((sectionKey) => [
        sectionKey,
        'source-locale',
      ])
    );
  }

  const scaffoldContent = buildKangurAiTutorContentLocaleScaffold({
    locale,
    sourceContent,
  });
  const localizedContent = input.localizedContent
    ? mergeKangurAiTutorContentWithSource({
        locale,
        sourceContent,
        localizedContent: input.localizedContent,
      })
    : null;

  return new Map(
    KANGUR_AI_TUTOR_CONTENT_TRANSLATABLE_SECTION_KEYS.map((sectionKey) => {
      if (!localizedContent) {
        return [sectionKey, 'missing'] as const;
      }

      const sourceSection = sourceContent[sectionKey];
      const localizedSection = localizedContent[sectionKey];
      const scaffoldSection = scaffoldContent[sectionKey];

      if (serializeComparable(localizedSection) === serializeComparable(sourceSection)) {
        return [sectionKey, 'source-copy'] as const;
      }

      if (serializeComparable(localizedSection) === serializeComparable(scaffoldSection)) {
        return [sectionKey, 'scaffolded'] as const;
      }

      return [sectionKey, 'manual'] as const;
    })
  );
};

export const summarizeKangurAiTutorContentTranslationStatuses = (
  statuses: Iterable<KangurAiTutorContentTranslationStatus>
): Record<KangurAiTutorContentTranslationStatus, number> => {
  const summary: Record<KangurAiTutorContentTranslationStatus, number> = {
    'source-locale': 0,
    missing: 0,
    'source-copy': 0,
    scaffolded: 0,
    manual: 0,
  };

  for (const status of statuses) {
    summary[status] += 1;
  }

  return summary;
};
