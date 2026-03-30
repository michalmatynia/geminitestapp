import type { KangurAiTutorContent } from '@/shared/contracts/kangur-ai-tutor-content';

export const ENGLISH_KANGUR_AI_TUTOR_CONTENT_COPY: Partial<KangurAiTutorContent> = {
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
      redoLabel: 'Redo',
      exportLabel: 'Export PNG',
      clearLabel: 'Clear',
      cancelLabel: 'Cancel',
      doneLabel: 'Done',
      previewAlt: 'Drawing',
      attachedLabel: 'Drawing attached',
      messageLabel: 'Drawn',
    },
};
