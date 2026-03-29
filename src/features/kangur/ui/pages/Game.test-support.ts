const buildGameRuntime = (screenKey: string) => ({
  activePracticeAssignment: null,
  basePath: '/kangur',
  canAccessParentAssignments: false,
  currentQuestion: null,
  currentQuestionIndex: 0,
  difficulty: 'medium',
  kangurMode: null,
  launchableGameInstanceId: null,
  operation: null,
  progress: {},
  resultPracticeAssignment: null,
  score: 0,
  screen: screenKey,
  totalQuestions: 0,
  user: null,
  xpToast: {
    xpGained: 0,
    newBadges: [],
    breakdown: [],
    nextBadge: null,
    dailyQuest: null,
    recommendation: null,
    visible: false,
  },
});

export { buildGameRuntime };
