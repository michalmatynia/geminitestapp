import {
  mergeKangurAiTutorNativeGuideStore,
  parseKangurAiTutorNativeGuideStore,
  type KangurAiTutorNativeGuideEntry,
  type KangurAiTutorNativeGuideStore,
} from '@/shared/contracts/kangur-ai-tutor-native-guide';
import type { KangurAiTutorFollowUpAction } from '@/shared/contracts/kangur-ai-tutor';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';

type PlainRecord = Record<string, unknown>;

type GuideEntryOverlay = Partial<
  Pick<
    KangurAiTutorNativeGuideEntry,
    | 'title'
    | 'shortDescription'
    | 'fullDescription'
    | 'hints'
    | 'relatedGames'
    | 'relatedTests'
    | 'followUpActions'
    | 'triggerPhrases'
  >
>;

type KangurAiTutorNativeGuideLocaleOverlay = {
  locale: string;
  entries: Record<string, GuideEntryOverlay>;
};

const isPlainObject = (value: unknown): value is PlainRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const cloneValue = <T>(value: T): T => {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
};

const serializeComparable = (value: unknown): string => JSON.stringify(value);

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

const action = (
  id: string,
  label: string,
  page: KangurAiTutorFollowUpAction['page']
): KangurAiTutorFollowUpAction => ({ id, label, page });

const GUIDE_COPY_BY_LOCALE: Record<string, Record<string, GuideEntryOverlay>> = {
  en: {
    'auth-overview': {
      title: 'Sign-in and account setup screen',
      shortDescription:
        'This shared entry screen lets the learner sign in and the parent sign in or create an account.',
      fullDescription:
        'This screen covers two paths: the learner signs in with a nickname and password, while the parent signs in with email and password or creates a new account. The tutor should explain which path is active and when to switch between sign in and account creation.',
      hints: [
        'First check whether the learner or the parent is trying to enter Kangur.',
        'If the parent does not have an account yet, switch to account creation instead of guessing a password.',
        'If the user already has an account, make sure the form is in sign-in mode.',
      ],
      triggerPhrases: [
        'sign in screen',
        'how sign in works',
        'how to create a parent account',
        'what can i do here',
      ],
    },
    'auth-login-form': {
      title: 'Kangur sign-in form',
      shortDescription:
        'This form collects the details needed for the learner or the parent to enter the app.',
      fullDescription:
        'The sign-in form switches between regular sign in and parent account creation. Depending on the current mode it shows different fields and actions, so the tutor should explain not only where to type, but also which mode is active.',
      hints: [
        'If the form shows account-creation fields, the parent should enter email and a new password instead of learner details.',
        'When the learner signs in with a nickname, the identifier has to match exactly and should not include spaces.',
        'If an error appears, check whether the form is in the correct mode: sign in or account creation.',
      ],
      triggerPhrases: ['sign in form', 'login section', 'how do i fill in this form', 'what does this form mean'],
    },
    'auth-login-identifier-field': {
      title: 'Sign-in identifier field',
      shortDescription:
        'This field accepts the parent email or the learner nickname, depending on who is signing in.',
      fullDescription:
        'The identifier field is the first step of sign in. For the parent it expects an email address, and for the learner it expects a nickname. The tutor should help distinguish those two cases and remind the user that the correct identifier type matters.',
      hints: [
        'The parent enters a full email address with the @ sign.',
        'The learner enters the nickname exactly as it was created in Kangur.',
        'Do not add spaces or extra characters at the beginning or the end.',
      ],
      triggerPhrases: ['sign in field', 'what do i enter here', 'email or nickname', 'sign in identifier'],
    },
    'auth-create-account-action': {
      title: 'Create account action',
      shortDescription:
        'This button takes the parent to account creation instead of the regular sign-in flow.',
      fullDescription:
        'This action is for a parent who does not have sign-in details yet. After clicking it, the form switches to registration and guides the parent through creating an account and confirming the email address.',
      hints: [
        'Use this action when the parent is entering for the first time and does not have a password yet.',
        'After the account is created, email confirmation is usually required before sign in works.',
        'Check the inbox if the confirmation message does not appear immediately.',
      ],
      triggerPhrases: ['create account', 'how to create an account', 'why this button', 'parent account creation'],
    },
    'auth-login-action': {
      title: 'Sign-in action',
      shortDescription:
        'This button opens access to an existing learner or parent account.',
      fullDescription:
        'The sign-in action is for people who already have credentials. The tutor should explain that it is the right path for an existing account, not for a parent who is creating first-time access.',
      hints: [
        'Choose sign in when the account already exists and only the credentials need to be entered.',
        'If the parent does not have an account yet, use the account-creation action instead.',
        'If the form still shows registration fields, switch it back to sign in.',
      ],
      triggerPhrases: ['sign in', 'how do i enter my account', 'why this sign in button', 'i already have an account'],
    },
    'lesson-overview': {
      title: 'Lesson screen',
      shortDescription: 'This is where the learner moves through one topic step by step.',
      fullDescription:
        'The lesson screen guides the learner through one maths or logic topic. It is the right place to understand the topic first and only then move to fast practice or a test.',
      hints: [
        'Start by reading the lesson title and description to understand the topic.',
        'Go through the material in order instead of jumping between blocks.',
        'Move to practice only after the core idea becomes clear.',
      ],
      relatedGames: ['Quick drill', 'Lesson review'],
      relatedTests: ['Check after the lesson'],
      followUpActions: [
        action('lesson-open-library', 'Open lessons', 'Lessons'),
        action('lesson-open-training', 'Go to game', 'Game'),
      ],
      triggerPhrases: ['lesson screen', 'what can i do here', 'how this lesson works', 'what this lesson is for'],
    },
    'lesson-document': {
      title: 'Main lesson content',
      shortDescription: 'This is the core material with explanations, images, and examples.',
      fullDescription:
        'The main lesson content explains the topic with examples, visuals, and solution steps. It should be read calmly before the learner switches to quicker answers in a game or test.',
      hints: [
        'Read one block at a time and pause after each example.',
        'If there is a drawing, connect it with the text next to it.',
        'After each part, try to explain the idea in your own words.',
      ],
      followUpActions: [action('lesson-document-open', 'Keep reading', 'Lessons')],
      triggerPhrases: ['main content', 'lesson material', 'explain this section', 'lesson document'],
    },
    'lesson-library': {
      title: 'Lesson library',
      shortDescription: 'This is the list of topics where the next lesson is chosen.',
      fullDescription:
        'The lesson library gathers active topics and shows which ones matter most right now. The cards help the learner or the parent decide where to start instead of choosing at random.',
      hints: [
        'Start with the topic that has the highest priority or the weakest mastery.',
        'Choose a lesson that matches what was practised most recently.',
      ],
      followUpActions: [action('lesson-library-open', 'Choose a topic', 'Lessons')],
      triggerPhrases: ['lesson library', 'lesson list', 'which lesson should i choose', 'lesson cards'],
    },
    'lesson-empty-state': {
      title: 'No lesson content available',
      shortDescription:
        'This message means there is no active lesson content available in this place yet.',
      fullDescription:
        'The empty lesson state does not mean the learner made a mistake. It only means there are no active lessons here yet or the lesson document has not been saved, so the best next step is to return to the lesson list or another activity.',
      hints: [
        'Check whether other lesson topics are active in the list.',
        'If the document is empty, return to another lesson or a practice round instead of waiting here.',
      ],
      followUpActions: [
        action('lesson-empty-state-open-list', 'Back to list', 'Lessons'),
        action('lesson-empty-state-open-game', 'Go to game', 'Game'),
      ],
      triggerPhrases: ['empty lesson', 'no lesson content', 'why is nothing here', 'no active lessons'],
    },
    'lesson-navigation': {
      title: 'Lesson navigation',
      shortDescription:
        'This section helps move to the previous or the next lesson without returning to the full list.',
      fullDescription:
        'Lesson navigation controls movement through the material. It helps the learner decide whether to move on or stay a little longer with the current topic.',
      hints: [
        'Move on only when the current lesson is already fairly clear.',
        'If the topic still feels uncertain, stay on this lesson or go back to the document.',
      ],
      followUpActions: [action('lesson-navigation-open', 'Browse lessons', 'Lessons')],
      triggerPhrases: ['lesson navigation', 'previous lesson', 'next lesson', 'how do i move on'],
    },
    'shared-progress': {
      title: 'Progress',
      shortDescription: 'Progress shows how regularly and how effectively the learner is working.',
      fullDescription:
        'The progress section combines regularity, accuracy, pace, and earned points. Its main value is not just the score, but whether the learner keeps returning to the material and building a steady rhythm.',
      hints: [
        'Look at regularity, not only at points.',
        'If progress slows down, choose a short review instead of a random new activity.',
        'Short regular sessions usually build steadier progress than one very long attempt.',
      ],
      followUpActions: [
        action('progress-profile', 'Open profile', 'LearnerProfile'),
        action('progress-lessons', 'Back to lessons', 'Lessons'),
      ],
      triggerPhrases: ['progress', 'how is it going', 'what does progress show', 'progress results'],
    },
    'shared-leaderboard': {
      title: 'Leaderboard',
      shortDescription: 'The leaderboard shows positions and results compared with other attempts.',
      fullDescription:
        'The leaderboard can add light motivation, but it should not become the main learning goal. It is most useful when it helps the learner notice personal improvement, not only rank against others.',
      hints: [
        'First compare the current result with your own earlier progress.',
        'A calm regular series is usually more useful than one fast attempt made only for ranking.',
        'Use the ranking as a signal, not as a verdict.',
      ],
      followUpActions: [action('leaderboard-profile', 'View profile', 'LearnerProfile')],
      triggerPhrases: ['leaderboard', 'ranking', 'position', 'how the leaderboard works'],
    },
    'shared-home-actions': {
      title: 'Quick actions',
      shortDescription: 'These are shortcuts to the most important activities in Kangur.',
      fullDescription:
        'Quick actions lead straight to lessons, Grajmy, Duels, or Kangur Matematyczny. They help the learner or the parent open the right next step without searching across the whole screen.',
      hints: [
        'Use this area when you are not sure where to start.',
        'Choose lessons for explanation and choose a game for practice.',
        'If there is a daily quest or a priority task, start there first.',
      ],
      followUpActions: [
        action('home-actions-lessons', 'Go to lessons', 'Lessons'),
        action('home-actions-game', 'Go to game', 'Game'),
      ],
      triggerPhrases: ['quick actions', 'shortcuts', 'where should i start', 'what should i open'],
    },
    'shared-home-quest': {
      title: 'Daily quest',
      shortDescription: 'The daily quest suggests one small concrete goal for right now.',
      fullDescription:
        'The daily quest narrows the choice down to one sensible target. Instead of many options, the learner gets one clear direction based on recent progress and assignments.',
      hints: [
        'Treat the quest as one small target, not a long checklist.',
        'After finishing the quest, review progress or do a light follow-up round.',
        'If the quest feels unclear, open it and check the concrete step.',
      ],
      followUpActions: [
        action('home-quest-lessons', 'Complete it in lessons', 'Lessons'),
        action('home-quest-game', 'Complete it in game', 'Game'),
      ],
      triggerPhrases: ['daily quest', 'quest', 'goal for today', 'what this quest does'],
    },
    'shared-priority-assignments': {
      title: 'Priority tasks',
      shortDescription: 'These are the most important things to do right now.',
      fullDescription:
        'Priority tasks organise what should be done first. They usually come from the parent or a guardian so the learner does not have to guess what will help the most now.',
      hints: [
        'Start with the first task instead of choosing the easiest one by eye.',
        'If the task leads to a lesson, understand the topic first and only then move to a game.',
        'If the task is unclear, return to the lesson description or ask the parent about the goal.',
      ],
      followUpActions: [action('priority-assignments-open', 'Go to lessons', 'Lessons')],
      triggerPhrases: ['priority tasks', 'priorities', 'what should i do first'],
    },
    'game-overview': {
      title: 'Game screen',
      shortDescription: 'The game is for quick practice and reinforcement.',
      fullDescription:
        'The game screen is where the learner builds pace, accuracy, and repetition. Games do not replace lessons; they reinforce what has already been learned.',
      hints: [
        'Focus on correct answers before speed.',
        'After a few weaker attempts, return to a lesson or an easier drill.',
        'Short regular sessions usually help more than one very long try.',
      ],
      relatedGames: ['Addition', 'Subtraction', 'Multiplication', 'Division'],
      relatedTests: ['Check after practice'],
      followUpActions: [
        action('game-open', 'Start game', 'Game'),
        action('game-lessons', 'Back to lessons', 'Lessons'),
      ],
      triggerPhrases: ['game screen', 'how this game works', 'what this game is for', 'game'],
    },
    'game-training-setup': {
      title: 'Training setup',
      shortDescription:
        'Here one training session is configured: level, categories, and question count.',
      fullDescription:
        'Training setup prepares one round of practice. The learner chooses difficulty, the scope of categories, and the number of questions so the session matches current form and focus.',
      hints: [
        'Choose a level that still allows accurate work.',
        'Limit the categories to what needs the most practice now.',
        'A shorter series is usually better than an overly long round at the start.',
      ],
      followUpActions: [action('game-training-setup-open', 'Configure training', 'Game')],
      triggerPhrases: ['training setup', 'mixed practice', 'training settings', 'how many questions'],
    },
    'game-operation-selector': {
      title: 'Game type picker',
      shortDescription:
        'Here the learner chooses the type of game or quick practice that best fits the goal.',
      fullDescription:
        'The game type picker helps decide whether the next step should be arithmetic practice, calendar work, shapes, or another quick activity. Its role is to send the learner to the kind of practice that fits the current topic.',
      hints: [
        'Choose an activity that matches what was practised in the last lesson.',
        'If the learner needs a basic review, start with a simpler game instead of the competition mode.',
        'Keep one practice area at a time instead of mixing several in one session.',
      ],
      followUpActions: [action('game-operation-selector-open', 'Choose a game', 'Game')],
      triggerPhrases: ['game type', 'which game should i choose', 'game picker', 'operation selector'],
    },
    'game-kangur-setup': {
      title: 'Kangur Matematyczny session setup',
      shortDescription: 'Here the learner chooses the contest edition and the task set before starting.',
      fullDescription:
        'Kangur Matematyczny setup prepares a more contest-like session. It is useful when the learner needs to practise careful reading and calmer multi-step thinking.',
      hints: [
        'Choose the mode that matches the learner’s current level.',
        'If the learner is just returning to this kind of task, begin with a shorter set.',
      ],
      followUpActions: [action('game-kangur-setup-open', 'Prepare session', 'Game')],
      triggerPhrases: ['kangur setup', 'contest edition', 'task set', 'kangur matematyczny setup'],
    },
    'game-assignment': {
      title: 'Training assignment',
      shortDescription: 'This card shows which practice round matters most right now.',
      fullDescription:
        'A training assignment links the learning plan with one concrete game round. It points to the most useful next practice instead of leaving the learner to choose at random.',
      hints: [
        'Start with the active assignment or the one at the top of the list.',
        'If the assignment stays difficult after a few tries, return to the lesson on the same topic.',
      ],
      followUpActions: [
        action('game-assignment-open', 'Start assignment', 'Game'),
        action('game-assignment-lessons', 'Back to lessons', 'Lessons'),
      ],
      triggerPhrases: ['training assignment', 'active assignment', 'assigned task', 'what should i practise now'],
    },
    'game-question': {
      title: 'Game question',
      shortDescription:
        'This is the active task to solve, where the thinking process matters more than raw speed.',
      fullDescription:
        'A game question shows one active attempt. The learner should first read the prompt, recognise the task type, and only then answer. The tutor can guide attention, but should not replace the learner’s work with the final result.',
      hints: [
        'Name the task type first: addition, subtraction, multiplication, or another activity.',
        'If the timer feels stressful, slow down for a moment and check what the question is really asking.',
        'Only after understanding the prompt should the learner calculate or choose an answer.',
      ],
      relatedGames: ['Addition', 'Subtraction', 'Multiplication', 'Division'],
      triggerPhrases: ['game question', 'current question', 'how should i approach this question', 'what does this question do'],
    },
    'game-review': {
      title: 'Game result review',
      shortDescription:
        'This is where the learner sees what worked well and what is worth improving in the next round.',
      fullDescription:
        'The game review helps identify the pattern after a round ends: whether the issue was pace, attention, or a specific task type. Instead of focusing only on points, the learner should leave with one concrete improvement for the next attempt.',
      hints: [
        'Do not judge the round from one number alone. Check whether the same kind of error repeats.',
        'After a weaker round, pick one specific area to improve instead of changing everything at once.',
        'If the problem is basic knowledge, return to the lesson or use an easier level.',
      ],
      followUpActions: [
        action('game-review-retry', 'Try again', 'Game'),
        action('game-review-lessons', 'Back to lessons', 'Lessons'),
      ],
      triggerPhrases: ['game review', 'game result', 'what next after the game', 'how do i read this result'],
    },
    'game-summary': {
      title: 'Game summary',
      shortDescription:
        'The game summary shows what already works and what still needs one more round.',
      fullDescription:
        'The game summary gathers accuracy, pace, and the overall outcome of the session. The key question is whether the learner repeats the same errors, is stabilising, or is ready for the next step.',
      hints: [
        'If accuracy drops, slow the pace down first.',
        'If the result is stable, only then increase the difficulty or the speed.',
        'Turn one conclusion into one next step: repeat or move on.',
      ],
      followUpActions: [action('game-summary-retry', 'Try again', 'Game')],
      triggerPhrases: ['game summary', 'game result', 'what does this result mean'],
    },
    'test-overview': {
      title: 'Test screen',
      shortDescription: 'The test checks what the learner can already do independently.',
      fullDescription:
        'The test screen checks independent understanding and readiness to solve tasks. It is more about calm reading and thinking than about speed.',
      hints: [
        'Read the full instruction and all answers first.',
        'Try to solve the task alone before opening a review.',
        'If you get stuck, return to the task text and mark the key numbers or words.',
      ],
      relatedTests: ['Lesson review', 'Topic-understanding check'],
      triggerPhrases: ['test screen', 'how this test works', 'what this test is for', 'test'],
    },
    'test-empty-state': {
      title: 'Empty test set',
      shortDescription:
        'This state means the selected set does not have published questions yet.',
      fullDescription:
        'An empty test set appears when the set exists but there are no published questions in it yet. It is not a learner mistake. The best next step is to return to another test, lesson, or game.',
      hints: [
        'If you expected questions here, choose another set or come back later.',
        'This is a good moment to move to a lesson or a short game instead of waiting without a goal.',
      ],
      followUpActions: [
        action('test-empty-state-lessons', 'Back to lessons', 'Lessons'),
        action('test-empty-state-game', 'Go to game', 'Game'),
      ],
      triggerPhrases: ['empty test', 'no questions in the test', 'what does this empty state mean', 'why is the test empty'],
    },
    'test-summary': {
      title: 'Test summary',
      shortDescription:
        'The test summary shows the result, but most importantly the direction of the next step.',
      fullDescription:
        'The test summary combines the result of the whole attempt and helps show where the learner is already strong and where review is still needed. The main value is not the final percentage, but the next sensible step.',
      hints: [
        'Treat mistakes as a pointer to what to review, not as a failure.',
        'After a weaker test, the best move is a short review of one concrete topic.',
        'After a strong result, try a harder range or the next test.',
      ],
      followUpActions: [action('test-summary-lessons', 'Back to lessons', 'Lessons')],
      triggerPhrases: ['test summary', 'test result', 'what does this result mean'],
    },
    'test-question': {
      title: 'Test question',
      shortDescription: 'This is the place for calm reading and an independent attempt.',
      fullDescription:
        'A test question shows one task together with answers or space for a solution. The learner should first read carefully, notice the data, and only then choose an answer or solution path.',
      hints: [
        'Read the question from start to finish once more before choosing an answer.',
        'Notice the numbers, units, and words that change the meaning of the task.',
        'If there are multiple choices, cross out the options that definitely do not fit first.',
      ],
      triggerPhrases: ['test question', 'how should i approach this question', 'what does this question section do'],
    },
    'test-selection': {
      title: 'Selected answer in the test',
      shortDescription: 'This card shows the answer currently selected before the result is checked.',
      fullDescription:
        'A selected answer in the test is only a temporary choice before the correct result is revealed. The tutor should help the learner examine what the choice means and what still needs to be checked before submitting.',
      hints: [
        'Read the question again and compare it only with the selected answer.',
        'Check whether the chosen option really answers what the task asks, not just what looks familiar.',
        'If you are unsure, compare your choice with one alternative instead of guessing immediately.',
      ],
      triggerPhrases: ['selected answer', 'chosen answer', 'what does my choice mean', 'do i understand this answer'],
    },
    'test-review': {
      title: 'Post-test review',
      shortDescription: 'The review helps explain the mistake and extract one next conclusion.',
      fullDescription:
        'The post-test review explains what worked, where the mistake appeared, and which one step can improve the next attempt. Its value is understanding the reasoning behind the correct answer.',
      hints: [
        'Compare your reasoning with the review first.',
        'Remember one concrete mistake you want to avoid next time.',
        'If the review points back to a lesson, reopen that lesson and check one example.',
      ],
      followUpActions: [action('test-review-lessons', 'Review the topic', 'Lessons')],
      triggerPhrases: ['review', 'answer review', 'explain this mistake', 'what does this review show'],
    },
    'profile-overview': {
      title: 'Learner profile',
      shortDescription:
        'The learner profile gathers progress, recommendations, and work history in one place.',
      fullDescription:
        'The learner profile shows learning over a longer time horizon. It is a panel for reading progress, choosing next priorities, and noticing what is getting stronger.',
      hints: [
        'Start with the overall picture before moving into detailed cards.',
        'Use the profile to decide whether a lesson review or another game attempt makes more sense next.',
        'Choose one card, act on it, and then return here for the next step.',
      ],
      followUpActions: [
        action('profile-overview-lessons', 'Back to lessons', 'Lessons'),
        action('profile-overview-game', 'Go to game', 'Game'),
      ],
      triggerPhrases: ['learner profile', 'how do i read this profile', 'what does this profile show'],
    },
    'profile-recommendations': {
      title: 'Recommendations for the learner',
      shortDescription:
        'This section suggests the next step that best matches the learner’s current progress.',
      fullDescription:
        'Recommendations organise the next moves: which lesson, which game, or which return path will help the most now. They are meant to point to one sensible priority instead of many competing options.',
      hints: [
        'Choose one recommendation and finish it before opening another one.',
        'If the recommendation matches a recent weaker result, start with it.',
        'After completing it, return here to decide on the next step.',
      ],
      followUpActions: [action('profile-recommendations-open', 'Open recommendations', 'LearnerProfile')],
      triggerPhrases: ['recommendations', 'what next for the learner', 'which next step should i choose'],
    },
    'profile-assignments': {
      title: 'Learner assignments',
      shortDescription:
        'This card shows assigned work and helps decide what should be done now.',
      fullDescription:
        'The assignments section on the learner profile gathers active obligations and priorities. It helps show what has been assigned, what is urgent, and where the next session should begin.',
      hints: [
        'Start with the task marked as most urgent or connected with the latest weaker result.',
        'After one task is completed, return to the profile and see whether the priority changed.',
      ],
      followUpActions: [action('profile-assignments-open-game', 'Go to game', 'Game')],
      triggerPhrases: ['learner assignments', 'what is assigned', 'profile priority tasks'],
    },
    'parent-dashboard-overview': {
      title: 'Parent dashboard',
      shortDescription:
        'The parent dashboard gathers learner oversight: progress, results, tasks, monitoring, and settings.',
      fullDescription:
        'The parent dashboard is for reading the learning picture and setting the next priorities, not for solving tasks. It helps the parent check what is happening and decide on the next useful move.',
      hints: [
        'First choose the tab that matches the question: results, progress, tasks, monitoring, or AI Tutor.',
        'Turn one concrete conclusion into one action for the learner.',
        'Before reading details, make sure the correct learner is selected.',
      ],
      followUpActions: [
        action('parent-dashboard-overview-profile', 'View learner profile', 'LearnerProfile'),
        action('parent-dashboard-overview-lessons', 'Go to lessons', 'Lessons'),
      ],
      triggerPhrases: ['parent dashboard', 'how this dashboard works', 'what can i check here'],
    },
    'parent-dashboard-tabs': {
      title: 'Parent dashboard tabs',
      shortDescription:
        'These tabs split the parent dashboard into results, progress, tasks, monitoring, and AI Tutor support.',
      fullDescription:
        'The tabs organise the parent dashboard by purpose. Instead of reading everything at once, the parent can open only the kind of information needed right now.',
      hints: [
        'Choose a tab based on the question you want to answer.',
        'After switching tabs, compare conclusions across sections, but do not mix everything at once.',
      ],
      followUpActions: [action('parent-dashboard-tabs-profile', 'Open learner profile', 'LearnerProfile')],
      triggerPhrases: ['parent tabs', 'how these tabs work', 'what is in this tab'],
    },
    'parent-dashboard-assignments': {
      title: 'Learner assignments in the parent dashboard',
      shortDescription:
        'This tab shows the learner’s assigned tasks and helps set priorities.',
      fullDescription:
        'The assignments tab in the parent dashboard is for planning the learner’s near-term work. It shows what is active, what needs to be closed soon, and which area should come first now.',
      hints: [
        'Keep one main thing to do instead of many parallel priorities.',
        'If a task does not fit the learner’s current level, check the profile before pushing it further.',
        'After a task is completed, return here and confirm that the priorities still make sense.',
      ],
      followUpActions: [action('parent-dashboard-assignments-game', 'Go to game', 'Game')],
      triggerPhrases: ['learner assignments in parent dashboard', 'what is assigned', 'learner priorities'],
    },
    'parent-dashboard-ai-tutor': {
      title: 'AI Tutor tab for the parent',
      shortDescription:
        'This section turns learner data into simpler language and helps decide on the next step.',
      fullDescription:
        'The AI Tutor tab for the parent does not replace the data; it interprets it. It is the right place for questions about learner progress, priorities, and the logic behind the next move when numbers alone are not enough.',
      hints: [
        'Start with one concrete question you want answered.',
        'The best results come from combining this tab with progress, results, or task data.',
      ],
      followUpActions: [action('parent-dashboard-ai-tutor-profile', 'View learner profile', 'LearnerProfile')],
      triggerPhrases: ['ai tutor for the parent', 'how do i use this tab', 'what can i ask here'],
    },
  },
  de: {
    'auth-overview': {
      title: 'Anmelde- und Kontoerstellungsseite',
      shortDescription:
        'Diese gemeinsame Einstiegsseite erlaubt dem Lernenden die Anmeldung und dem Elternteil die Anmeldung oder Kontoerstellung.',
      fullDescription:
        'Diese Seite deckt zwei Wege ab: Der Lernende meldet sich mit Nickname und Passwort an, waehrend sich das Elternteil mit E-Mail und Passwort anmeldet oder ein neues Konto erstellt. Der Tutor sollte erklaeren, welcher Weg gerade aktiv ist und wann zwischen Anmeldung und Kontoerstellung gewechselt werden muss.',
      hints: [
        'Pruefe zuerst, ob sich der Lernende oder das Elternteil anmelden moechte.',
        'Wenn das Elternteil noch kein Konto hat, wechsle zur Kontoerstellung statt ein Passwort zu erraten.',
        'Wenn bereits ein Konto vorhanden ist, stelle sicher, dass das Formular im Anmeldemodus ist.',
      ],
      triggerPhrases: ['anmeldeseite', 'wie funktioniert die anmeldung', 'wie erstelle ich ein elternkonto', 'was kann ich hier tun'],
    },
    'auth-login-form': {
      title: 'Kangur-Anmeldeformular',
      shortDescription:
        'Dieses Formular sammelt die Daten, die der Lernende oder das Elternteil fuer den Zugang zur App braucht.',
      fullDescription:
        'Das Anmeldeformular wechselt zwischen normaler Anmeldung und der Erstellung eines Elternkontos. Je nach Modus zeigt es andere Felder und Aktionen, deshalb sollte der Tutor nicht nur erklaeren, wo etwas eingetragen wird, sondern auch welcher Modus gerade aktiv ist.',
      hints: [
        'Wenn das Formular Felder fuer die Kontoerstellung zeigt, sollte das Elternteil E-Mail und ein neues Passwort eingeben statt Lernerdaten.',
        'Wenn sich der Lernende mit einem Nickname anmeldet, muss dieser exakt ohne Leerzeichen eingetragen werden.',
        'Wenn ein Fehler erscheint, pruefe, ob das Formular im richtigen Modus ist: Anmeldung oder Kontoerstellung.',
      ],
      triggerPhrases: ['anmeldeformular', 'login-bereich', 'wie fuelle ich dieses formular aus', 'was bedeutet dieses formular'],
    },
    'auth-login-identifier-field': {
      title: 'Feld fuer die Anmeldekennung',
      shortDescription:
        'Dieses Feld erwartet je nach Person die E-Mail des Elternteils oder den Nickname des Lernenden.',
      fullDescription:
        'Das Kennungsfeld ist der erste Schritt der Anmeldung. Fuer das Elternteil erwartet es eine E-Mail-Adresse, fuer den Lernenden einen Nickname. Der Tutor sollte helfen, diese beiden Faelle zu unterscheiden und daran erinnern, dass die richtige Kennungsart wichtig ist.',
      hints: [
        'Das Elternteil gibt eine vollstaendige E-Mail-Adresse mit @ ein.',
        'Der Lernende gibt den Nickname genau so ein, wie er in Kangur erstellt wurde.',
        'Fuege am Anfang oder Ende keine Leerzeichen oder Zusatzzeichen hinzu.',
      ],
      triggerPhrases: ['anmeldefeld', 'was trage ich hier ein', 'e-mail oder nickname', 'anmeldekennung'],
    },
    'auth-create-account-action': {
      title: 'Aktion zum Konto erstellen',
      shortDescription:
        'Diese Schaltflaeche fuehrt das Elternteil zur Kontoerstellung statt zur normalen Anmeldung.',
      fullDescription:
        'Diese Aktion ist fuer ein Elternteil gedacht, das noch keine Zugangsdaten hat. Nach dem Klick wechselt das Formular zur Registrierung und fuehrt durch die Kontoerstellung und die Bestaetigung der E-Mail-Adresse.',
      hints: [
        'Nutze diese Aktion, wenn das Elternteil zum ersten Mal einsteigt und noch kein Passwort hat.',
        'Nach der Kontoerstellung ist meist eine E-Mail-Bestaetigung noetig, bevor die Anmeldung funktioniert.',
        'Pruefe das Postfach, wenn die Bestaetigung nicht sofort erscheint.',
      ],
      triggerPhrases: ['konto erstellen', 'wie erstelle ich ein konto', 'warum diese schaltflaeche', 'elternkonto erstellen'],
    },
    'auth-login-action': {
      title: 'Anmeldeaktion',
      shortDescription:
        'Diese Schaltflaeche oeffnet den Zugang zu einem bestehenden Lernenden- oder Elternkonto.',
      fullDescription:
        'Die Anmeldeaktion ist fuer Personen gedacht, die bereits Zugangsdaten haben. Der Tutor sollte erklaeren, dass dies der richtige Weg fuer ein bestehendes Konto ist und nicht fuer ein Elternteil, das den ersten Zugang erst erstellt.',
      hints: [
        'Waehle Anmeldung, wenn das Konto bereits existiert und nur die Daten eingegeben werden muessen.',
        'Wenn das Elternteil noch kein Konto hat, nutze stattdessen die Aktion zur Kontoerstellung.',
        'Wenn das Formular noch Registrierungsfelder zeigt, schalte zur Anmeldung zurueck.',
      ],
      triggerPhrases: ['anmelden', 'wie komme ich in mein konto', 'warum diese anmeldeschaltflaeche', 'ich habe schon ein konto'],
    },
    'lesson-overview': {
      title: 'Lektionsbildschirm',
      shortDescription: 'Hier arbeitet sich der Lernende Schritt fuer Schritt durch ein Thema.',
      fullDescription:
        'Der Lektionsbildschirm fuehrt den Lernenden durch ein Mathematik- oder Logikthema. Hier sollte das Thema zuerst verstanden werden, bevor es in schnelles Training oder einen Test geht.',
      hints: [
        'Lies zuerst Titel und Beschreibung der Lektion.',
        'Gehe das Material der Reihe nach durch, statt zwischen Bloecken zu springen.',
        'Wechsle erst dann zur Uebung, wenn die Grundidee klar ist.',
      ],
      relatedGames: ['Schnelles Training', 'Wiederholung nach der Lektion'],
      relatedTests: ['Test nach der Lektion'],
      followUpActions: [
        action('lesson-open-library', 'Lektionen oeffnen', 'Lessons'),
        action('lesson-open-training', 'Zum Spiel gehen', 'Game'),
      ],
      triggerPhrases: ['lektionsbildschirm', 'was kann ich hier tun', 'wie funktioniert diese lektion', 'wofuer ist diese lektion'],
    },
    'lesson-document': {
      title: 'Hauptinhalt der Lektion',
      shortDescription: 'Das ist das Kernmaterial mit Erklaerungen, Bildern und Beispielen.',
      fullDescription:
        'Der Hauptinhalt der Lektion erklaert das Thema mit Beispielen, Abbildungen und Loesungsschritten. Er sollte in Ruhe gelesen werden, bevor der Lernende zu schnelleren Antworten in Spiel oder Test wechselt.',
      hints: [
        'Lies immer nur einen Block und halte nach jedem Beispiel kurz an.',
        'Wenn es eine Zeichnung gibt, verbinde sie mit dem Text daneben.',
        'Versuche nach jedem Abschnitt, die Idee mit eigenen Worten zu erklaeren.',
      ],
      followUpActions: [action('lesson-document-open', 'Weiterlesen', 'Lessons')],
      triggerPhrases: ['hauptinhalt', 'unterrichtsmaterial', 'erklaere diesen abschnitt', 'lektionsdokument'],
    },
    'lesson-library': {
      title: 'Lektionsbibliothek',
      shortDescription: 'Das ist die Themenliste, in der die naechste Lektion gewaehlt wird.',
      fullDescription:
        'Die Lektionsbibliothek sammelt aktive Themen und zeigt, welche gerade am wichtigsten sind. Die Karten helfen dem Lernenden oder dem Elternteil, einen sinnvollen Startpunkt zu waehlen statt zufaellig zu entscheiden.',
      hints: [
        'Beginne mit dem Thema mit der hoechsten Prioritaet oder der schwaechsten Beherrschung.',
        'Waehle eine Lektion, die zu dem passt, was zuletzt geuebt wurde.',
      ],
      followUpActions: [action('lesson-library-open', 'Thema waehlen', 'Lessons')],
      triggerPhrases: ['lektionsbibliothek', 'lektionsliste', 'welche lektion soll ich waehlen', 'lektionskarten'],
    },
    'lesson-empty-state': {
      title: 'Kein Lektionsinhalt verfuegbar',
      shortDescription:
        'Diese Meldung bedeutet, dass an dieser Stelle noch kein aktiver Lektionsinhalt verfuegbar ist.',
      fullDescription:
        'Der leere Lektionszustand bedeutet nicht, dass der Lernende etwas falsch gemacht hat. Er zeigt nur, dass es hier noch keine aktiven Lektionen gibt oder das Dokument noch nicht gespeichert wurde. Der beste naechste Schritt ist dann die Rueckkehr zur Liste oder zu einer anderen Aktivitaet.',
      hints: [
        'Pruefe, ob in der Lektionsliste andere aktive Themen vorhanden sind.',
        'Wenn das Dokument leer ist, gehe zu einer anderen Lektion oder zu einer Uebungsrunde zurueck.',
      ],
      followUpActions: [
        action('lesson-empty-state-open-list', 'Zur Liste zurueck', 'Lessons'),
        action('lesson-empty-state-open-game', 'Zum Spiel gehen', 'Game'),
      ],
      triggerPhrases: ['leere lektion', 'kein lektionsinhalt', 'warum ist hier nichts', 'keine aktiven lektionen'],
    },
    'lesson-navigation': {
      title: 'Lektionsnavigation',
      shortDescription:
        'Dieser Bereich hilft beim Wechsel zur vorherigen oder naechsten Lektion ohne Rueckkehr zur Gesamtliste.',
      fullDescription:
        'Die Lektionsnavigation steuert die Bewegung durch das Material. Sie hilft dabei zu entscheiden, ob der Lernende weitergehen oder noch etwas beim aktuellen Thema bleiben sollte.',
      hints: [
        'Gehe erst weiter, wenn die aktuelle Lektion schon recht klar ist.',
        'Wenn das Thema noch unsicher ist, bleibe bei dieser Lektion oder kehre zum Dokument zurueck.',
      ],
      followUpActions: [action('lesson-navigation-open', 'Lektionen durchsuchen', 'Lessons')],
      triggerPhrases: ['lektionsnavigation', 'vorherige lektion', 'naechste lektion', 'wie gehe ich weiter'],
    },
    'shared-progress': {
      title: 'Fortschritt',
      shortDescription: 'Der Fortschritt zeigt, wie regelmaessig und wie wirksam der Lernende arbeitet.',
      fullDescription:
        'Der Fortschrittsbereich verbindet Regelmaessigkeit, Genauigkeit, Tempo und verdiente Punkte. Sein Hauptwert liegt nicht nur in der Punktzahl, sondern darin, ob der Lernende zum Material zurueckkehrt und einen stabilen Rhythmus aufbaut.',
      hints: [
        'Achte nicht nur auf Punkte, sondern auch auf Regelmaessigkeit.',
        'Wenn der Fortschritt langsamer wird, waehle lieber eine kurze Wiederholung als eine zufaellige neue Aktivitaet.',
        'Kurze regelmaessige Sitzungen bringen oft stabileren Fortschritt als ein einzelner langer Versuch.',
      ],
      followUpActions: [
        action('progress-profile', 'Profil oeffnen', 'LearnerProfile'),
        action('progress-lessons', 'Zurueck zu den Lektionen', 'Lessons'),
      ],
      triggerPhrases: ['fortschritt', 'wie laeuft es', 'was zeigt der fortschritt', 'fortschrittswerte'],
    },
    'shared-leaderboard': {
      title: 'Bestenliste',
      shortDescription: 'Die Bestenliste zeigt Platzierungen und Ergebnisse im Vergleich mit anderen Versuchen.',
      fullDescription:
        'Die Bestenliste kann leicht motivieren, sollte aber nicht zum Hauptziel des Lernens werden. Am nuetzlichsten ist sie, wenn sie dem Lernenden hilft, die eigene Verbesserung zu sehen und nicht nur den Vergleich mit anderen.',
      hints: [
        'Vergleiche zuerst das aktuelle Ergebnis mit deinem eigenen frueheren Fortschritt.',
        'Eine ruhige regelmaessige Serie ist meist hilfreicher als ein einzelner schneller Versuch nur fuer die Platzierung.',
        'Nutze die Rangliste als Signal, nicht als Urteil.',
      ],
      followUpActions: [action('leaderboard-profile', 'Profil ansehen', 'LearnerProfile')],
      triggerPhrases: ['bestenliste', 'rangliste', 'platzierung', 'wie funktioniert die rangliste'],
    },
    'shared-home-actions': {
      title: 'Schnellaktionen',
      shortDescription: 'Das sind Abkuerzungen zu den wichtigsten Aktivitaeten in Kangur.',
      fullDescription:
        'Schnellaktionen fuehren direkt zu Lektionen, Grajmy, Duellen oder Kangur Matematyczny. So koennen Lernende oder Eltern sofort den passenden naechsten Schritt oeffnen, ohne auf dem ganzen Bildschirm zu suchen.',
      hints: [
        'Nutze diesen Bereich, wenn du nicht weisst, womit du beginnen sollst.',
        'Waehle Lektionen fuer Erklaerungen und ein Spiel fuer praktische Uebung.',
        'Wenn es eine Tagesmission oder eine Prioritaetsaufgabe gibt, beginne zuerst damit.',
      ],
      followUpActions: [
        action('home-actions-lessons', 'Zu den Lektionen', 'Lessons'),
        action('home-actions-game', 'Zum Spiel', 'Game'),
      ],
      triggerPhrases: ['schnellaktionen', 'abkuerzungen', 'wo soll ich anfangen', 'was soll ich oeffnen'],
    },
    'shared-home-quest': {
      title: 'Tagesmission',
      shortDescription: 'Die Tagesmission schlaegt ein kleines konkretes Ziel fuer jetzt vor.',
      fullDescription:
        'Die Tagesmission reduziert die Auswahl auf ein sinnvolles Ziel. Statt vieler Optionen bekommt der Lernende eine klare Richtung auf Basis des juengsten Fortschritts und der Aufgaben.',
      hints: [
        'Betrachte die Mission als ein kleines Ziel und nicht als lange Aufgabenliste.',
        'Nach der Mission kannst du den Fortschritt pruefen oder eine leichte Uebungsrunde machen.',
        'Wenn die Mission unklar ist, oeffne sie und pruefe den konkreten Schritt.',
      ],
      followUpActions: [
        action('home-quest-lessons', 'In Lektionen erledigen', 'Lessons'),
        action('home-quest-game', 'Im Spiel erledigen', 'Game'),
      ],
      triggerPhrases: ['tagesmission', 'mission', 'ziel fuer heute', 'was macht diese mission'],
    },
    'shared-priority-assignments': {
      title: 'Prioritaetsaufgaben',
      shortDescription: 'Das sind die wichtigsten Dinge, die jetzt erledigt werden sollten.',
      fullDescription:
        'Prioritaetsaufgaben ordnen, was zuerst erledigt werden soll. Sie kommen oft vom Elternteil oder einer Betreuungsperson, damit der Lernende nicht raten muss, was im Moment am meisten hilft.',
      hints: [
        'Beginne mit der ersten Aufgabe statt mit der scheinbar leichtesten.',
        'Wenn die Aufgabe zu einer Lektion fuehrt, verstehe zuerst das Thema und gehe erst danach ins Spiel.',
        'Wenn die Aufgabe unklar ist, kehre zur Lektionsbeschreibung zurueck oder frage das Elternteil nach dem Ziel.',
      ],
      followUpActions: [action('priority-assignments-open', 'Zu den Lektionen', 'Lessons')],
      triggerPhrases: ['prioritaetsaufgaben', 'prioritaeten', 'was soll ich zuerst machen'],
    },
    'game-overview': {
      title: 'Spielbildschirm',
      shortDescription: 'Das Spiel dient dem schnellen Ueben und Festigen.',
      fullDescription:
        'Der Spielbildschirm ist der Ort fuer aktives Ueben. Hier baut der Lernende Tempo, Genauigkeit und Wiederholung auf. Spiele ersetzen keine Lektionen, sondern festigen bereits Gelerntes.',
      hints: [
        'Achte zuerst auf richtige Antworten und erst danach auf Geschwindigkeit.',
        'Nach ein paar schwaecheren Versuchen kehre zu einer Lektion oder zu einem leichteren Training zurueck.',
        'Kurze regelmaessige Sitzungen helfen meist mehr als ein einziger sehr langer Versuch.',
      ],
      relatedGames: ['Addition', 'Subtraktion', 'Multiplikation', 'Division'],
      relatedTests: ['Kontrolle nach dem Training'],
      followUpActions: [
        action('game-open', 'Spiel starten', 'Game'),
        action('game-lessons', 'Zurueck zu den Lektionen', 'Lessons'),
      ],
      triggerPhrases: ['spielbildschirm', 'wie funktioniert dieses spiel', 'wofuer ist dieses spiel', 'spiel'],
    },
    'game-training-setup': {
      title: 'Training einrichten',
      shortDescription:
        'Hier wird eine Trainingsrunde eingerichtet: Niveau, Kategorien und Anzahl der Fragen.',
      fullDescription:
        'Die Trainingseinrichtung bereitet eine Uebungsrunde vor. Der Lernende waehlt Schwierigkeit, Themenbereich und Anzahl der Fragen, damit die Sitzung zum aktuellen Fokus passt.',
      hints: [
        'Waehle ein Niveau, auf dem noch sauber gearbeitet werden kann.',
        'Begrenze die Kategorien auf das, was jetzt am meisten geuebt werden muss.',
        'Eine kuerzere Serie ist am Anfang oft besser als eine zu lange Runde.',
      ],
      followUpActions: [action('game-training-setup-open', 'Training konfigurieren', 'Game')],
      triggerPhrases: ['training einrichten', 'gemischtes training', 'trainingseinstellungen', 'wie viele fragen'],
    },
    'game-operation-selector': {
      title: 'Spieltyp waehlen',
      shortDescription:
        'Hier waehlt der Lernende die Spielart oder die schnelle Uebung, die am besten zum Ziel passt.',
      fullDescription:
        'Die Spieltyp-Auswahl hilft zu entscheiden, ob als naechstes Rechenuebung, Kalender, Figuren oder eine andere schnelle Aktivitaet sinnvoll ist. Sie soll den Lernenden in die Uebungsart fuehren, die am besten zum aktuellen Thema passt.',
      hints: [
        'Waehle eine Aktivitaet, die zu der zuletzt geuebten Lektion passt.',
        'Wenn Grundwissen wiederholt werden soll, beginne lieber mit einem einfacheren Spiel als mit dem Wettbewerbsmodus.',
        'Bleibe bei einem Uebungsbereich und mische nicht zu viele Themen in einer Sitzung.',
      ],
      followUpActions: [action('game-operation-selector-open', 'Spiel waehlen', 'Game')],
      triggerPhrases: ['spieltyp', 'welches spiel soll ich waehlen', 'spielauswahl', 'operationsauswahl'],
    },
    'game-kangur-setup': {
      title: 'Sitzung fuer Kangur Matematyczny einrichten',
      shortDescription:
        'Hier waehlt der Lernende die Wettbewerbsedition und den Aufgabensatz vor dem Start.',
      fullDescription:
        'Die Einrichtung fuer Kangur Matematyczny bereitet eine wettbewerbsnaehere Sitzung vor. Sie ist sinnvoll, wenn ruhiges Lesen und mehrstufiges Denken geuebt werden sollen.',
      hints: [
        'Waehle den Modus, der zum aktuellen Niveau des Lernenden passt.',
        'Wenn der Lernende gerade erst zu dieser Art Aufgaben zurueckkehrt, beginne mit einem kuerzeren Satz.',
      ],
      followUpActions: [action('game-kangur-setup-open', 'Sitzung vorbereiten', 'Game')],
      triggerPhrases: ['kangur einrichten', 'wettbewerbsedition', 'aufgabensatz', 'kangur matematyczny einrichtung'],
    },
    'game-assignment': {
      title: 'Trainingsaufgabe',
      shortDescription: 'Diese Karte zeigt, welche Uebungsrunde gerade am wichtigsten ist.',
      fullDescription:
        'Eine Trainingsaufgabe verbindet den Lernplan mit einer konkreten Spielrunde. Sie zeigt die naechste nuetzliche Praxis statt einer zufaelligen Auswahl.',
      hints: [
        'Beginne mit der aktiven Aufgabe oder mit der obersten Aufgabe in der Liste.',
        'Wenn die Aufgabe nach mehreren Versuchen schwer bleibt, kehre zur Lektion mit demselben Thema zurueck.',
      ],
      followUpActions: [
        action('game-assignment-open', 'Aufgabe starten', 'Game'),
        action('game-assignment-lessons', 'Zurueck zu den Lektionen', 'Lessons'),
      ],
      triggerPhrases: ['trainingsaufgabe', 'aktive aufgabe', 'zugewiesene aufgabe', 'was soll ich jetzt ueben'],
    },
    'game-question': {
      title: 'Frage im Spiel',
      shortDescription:
        'Das ist die aktuelle Aufgabe, bei der der Denkweg wichtiger ist als reine Geschwindigkeit.',
      fullDescription:
        'Eine Spielfrage zeigt einen aktiven Versuch. Der Lernende sollte zuerst die Aufgabe lesen, die Art der Aufgabe erkennen und erst dann antworten. Der Tutor kann die Aufmerksamkeit lenken, sollte aber nicht die fertige Loesung ersetzen.',
      hints: [
        'Benenne zuerst die Art der Aufgabe: Addition, Subtraktion, Multiplikation oder eine andere Aktivitaet.',
        'Wenn Zeitdruck entsteht, verlangsame kurz und pruefe, was genau gefragt ist.',
        'Erst nach dem Verstehen der Aufgabe sollte gerechnet oder eine Antwort gewaehlt werden.',
      ],
      relatedGames: ['Addition', 'Subtraktion', 'Multiplikation', 'Division'],
      triggerPhrases: ['spielfrage', 'aktuelle frage', 'wie gehe ich an diese frage heran', 'was macht diese frage'],
    },
    'game-review': {
      title: 'Auswertung nach dem Spiel',
      shortDescription:
        'Hier sieht der Lernende, was gut lief und was in der naechsten Runde verbessert werden sollte.',
      fullDescription:
        'Die Spielauswertung hilft, nach einer Runde das Muster zu erkennen: ob das Problem Tempo, Unaufmerksamkeit oder eine bestimmte Aufgabenart war. Statt nur auf Punkte zu schauen, sollte ein klarer Verbesserungsimpuls fuer den naechsten Versuch bleiben.',
      hints: [
        'Beurteile die Runde nicht nur nach einer Zahl. Pruefe, ob sich dieselbe Fehlerart wiederholt.',
        'Nach einer schwaecheren Runde waehle einen konkreten Bereich zur Verbesserung statt alles gleichzeitig zu aendern.',
        'Wenn das Problem Grundwissen ist, kehre zur Lektion oder zu einem leichteren Niveau zurueck.',
      ],
      followUpActions: [
        action('game-review-retry', 'Noch einmal versuchen', 'Game'),
        action('game-review-lessons', 'Zurueck zu den Lektionen', 'Lessons'),
      ],
      triggerPhrases: ['spielauswertung', 'spielergebnis', 'wie geht es nach dem spiel weiter', 'wie lese ich dieses ergebnis'],
    },
    'game-summary': {
      title: 'Spielzusammenfassung',
      shortDescription: 'Die Spielzusammenfassung zeigt, was schon klappt und was noch eine Runde braucht.',
      fullDescription:
        'Die Spielzusammenfassung sammelt Genauigkeit, Tempo und das Gesamtergebnis der Sitzung. Die wichtigste Frage ist, ob sich Fehler wiederholen, ob der Lernende stabiler wird oder ob der naechste Schritt schon sinnvoll ist.',
      hints: [
        'Wenn die Genauigkeit sinkt, verlangsamt zuerst das Tempo.',
        'Wenn das Ergebnis stabil ist, erhoehe erst dann Schwierigkeit oder Geschwindigkeit.',
        'Mache aus einem Befund einen naechsten Schritt: wiederholen oder weitergehen.',
      ],
      followUpActions: [action('game-summary-retry', 'Noch einmal versuchen', 'Game')],
      triggerPhrases: ['spielzusammenfassung', 'spielergebnis', 'was bedeutet dieses ergebnis'],
    },
    'test-overview': {
      title: 'Testbildschirm',
      shortDescription: 'Der Test prueft, was der Lernende bereits selbststaendig kann.',
      fullDescription:
        'Der Testbildschirm prueft das selbststaendige Verstehen und die Bereitschaft, Aufgaben zu loesen. Es geht hier eher um ruhiges Lesen und Denken als um Geschwindigkeit.',
      hints: [
        'Lies zuerst die ganze Aufgabe und alle Antworten.',
        'Versuche die Aufgabe selbst zu loesen, bevor du eine Auswertung oeffnest.',
        'Wenn du feststeckst, gehe zum Aufgabentext zurueck und markiere wichtige Zahlen oder Woerter.',
      ],
      relatedTests: ['Wiederholung nach der Lektion', 'Verstaendniskontrolle zum Thema'],
      triggerPhrases: ['testbildschirm', 'wie funktioniert dieser test', 'wofuer ist dieser test', 'test'],
    },
    'test-empty-state': {
      title: 'Leerer Testsatz',
      shortDescription: 'Dieser Zustand bedeutet, dass der ausgewaehlte Satz noch keine veroeffentlichten Fragen hat.',
      fullDescription:
        'Ein leerer Testsatz erscheint, wenn der Satz existiert, aber noch keine veroeffentlichten Fragen enthaelt. Das ist kein Fehler des Lernenden. Der beste naechste Schritt ist dann die Rueckkehr zu einem anderen Test, einer Lektion oder einem Spiel.',
      hints: [
        'Wenn du hier Fragen erwartet hast, waehle einen anderen Satz oder komme spaeter zurueck.',
        'Das ist ein guter Moment, um zu einer Lektion oder einem kurzen Spiel zu wechseln statt ohne Ziel zu warten.',
      ],
      followUpActions: [
        action('test-empty-state-lessons', 'Zurueck zu den Lektionen', 'Lessons'),
        action('test-empty-state-game', 'Zum Spiel gehen', 'Game'),
      ],
      triggerPhrases: ['leerer test', 'keine fragen im test', 'was bedeutet dieser leere zustand', 'warum ist der test leer'],
    },
    'test-summary': {
      title: 'Testzusammenfassung',
      shortDescription:
        'Die Testzusammenfassung zeigt das Ergebnis, aber vor allem die Richtung fuer den naechsten Schritt.',
      fullDescription:
        'Die Testzusammenfassung verbindet das Ergebnis des gesamten Versuchs mit der Frage, wo der Lernende schon stark ist und wo noch Wiederholung noetig bleibt. Entscheidend ist nicht nur der Endprozentsatz, sondern der sinnvollste naechste Schritt.',
      hints: [
        'Betrachte Fehler als Hinweis auf den naechsten Wiederholungsbereich, nicht als Niederlage.',
        'Nach einem schwaecheren Test ist eine kurze Wiederholung eines konkreten Themas meist der beste Schritt.',
        'Nach einem starken Ergebnis kann ein schwierigerer Bereich oder der naechste Test sinnvoll sein.',
      ],
      followUpActions: [action('test-summary-lessons', 'Zurueck zu den Lektionen', 'Lessons')],
      triggerPhrases: ['testzusammenfassung', 'testergebnis', 'was bedeutet dieses ergebnis'],
    },
    'test-question': {
      title: 'Testfrage',
      shortDescription: 'Hier geht es um ruhiges Lesen und einen selbststaendigen Versuch.',
      fullDescription:
        'Eine Testfrage zeigt eine Aufgabe mit Antworten oder Platz fuer eine Loesung. Der Lernende sollte zuerst ruhig lesen, die Daten erkennen und erst dann eine Antwort oder einen Loesungsweg waehlen.',
      hints: [
        'Lies die Frage noch einmal komplett, bevor du eine Antwort waehlst.',
        'Achte auf Zahlen, Einheiten und Woerter, die die Bedeutung veraendern.',
        'Wenn es Antwortoptionen gibt, streiche zuerst die aus, die sicher nicht passen.',
      ],
      triggerPhrases: ['testfrage', 'wie gehe ich an diese frage heran', 'was macht dieser fragenbereich'],
    },
    'test-selection': {
      title: 'Ausgewaehlte Antwort im Test',
      shortDescription: 'Diese Karte zeigt die aktuell markierte Antwort vor der Ergebnispruefung.',
      fullDescription:
        'Eine ausgewaehlte Antwort im Test ist nur eine vorlaeufige Wahl, bevor das richtige Ergebnis sichtbar wird. Der Tutor sollte helfen zu pruefen, was diese Wahl bedeutet und was vor dem Abschicken noch kontrolliert werden muss.',
      hints: [
        'Lies die Frage noch einmal und vergleiche sie nur mit der markierten Antwort.',
        'Pruefe, ob die gewaehlte Option wirklich auf die gestellte Frage antwortet und nicht nur vertraut aussieht.',
        'Wenn du unsicher bist, vergleiche deine Wahl mit einer Alternative statt sofort zu raten.',
      ],
      triggerPhrases: ['ausgewaehlte antwort', 'markierte antwort', 'was bedeutet meine auswahl', 'verstehe ich diese antwort richtig'],
    },
    'test-review': {
      title: 'Auswertung nach dem Test',
      shortDescription: 'Die Auswertung hilft, den Fehler zu verstehen und einen naechsten Schluss zu ziehen.',
      fullDescription:
        'Die Auswertung nach dem Test erklaert, was funktioniert hat, wo der Fehler lag und welcher eine Schritt den naechsten Versuch verbessern kann. Ihr Wert liegt im Verstehen der Begruendung hinter der richtigen Antwort.',
      hints: [
        'Vergleiche zuerst deinen Denkweg mit der Auswertung.',
        'Merke dir einen konkreten Fehler, den du beim naechsten Mal vermeiden willst.',
        'Wenn die Auswertung auf eine Lektion verweist, oeffne diese Lektion noch einmal und pruefe ein Beispiel.',
      ],
      followUpActions: [action('test-review-lessons', 'Thema wiederholen', 'Lessons')],
      triggerPhrases: ['auswertung', 'antwortauswertung', 'erklaere diesen fehler', 'was zeigt diese auswertung'],
    },
    'profile-overview': {
      title: 'Lernendenprofil',
      shortDescription:
        'Das Lernendenprofil sammelt Fortschritt, Empfehlungen und Arbeitsverlauf an einem Ort.',
      fullDescription:
        'Das Lernendenprofil zeigt das Lernen ueber einen laengeren Zeitraum. Es ist ein Bereich, um Fortschritt zu lesen, naechste Prioritaeten zu waehlen und zu sehen, was staerker wird.',
      hints: [
        'Beginne mit dem Gesamtbild, bevor du in einzelne Karten gehst.',
        'Nutze das Profil, um zu entscheiden, ob eine Wiederholung oder ein weiterer Spielversuch sinnvoller ist.',
        'Waehle eine Karte, handle danach und kehre dann hierher zurueck.',
      ],
      followUpActions: [
        action('profile-overview-lessons', 'Zurueck zu den Lektionen', 'Lessons'),
        action('profile-overview-game', 'Zum Spiel gehen', 'Game'),
      ],
      triggerPhrases: ['lernendenprofil', 'wie lese ich dieses profil', 'was zeigt dieses profil'],
    },
    'profile-recommendations': {
      title: 'Empfehlungen fuer den Lernenden',
      shortDescription:
        'Dieser Bereich schlaegt den naechsten Schritt vor, der am besten zum aktuellen Fortschritt passt.',
      fullDescription:
        'Empfehlungen ordnen die naechsten Schritte: welche Lektion, welches Spiel oder welcher Rueckweg jetzt den groessten Nutzen bringt. Sie sollen auf eine sinnvolle Prioritaet zeigen statt auf viele konkurrierende Optionen.',
      hints: [
        'Waehle eine Empfehlung und bringe sie zu Ende, bevor du eine weitere oeffnest.',
        'Wenn die Empfehlung zu einem juengsten schwachen Ergebnis passt, beginne genau damit.',
        'Kehre danach hierher zurueck und entscheide ueber den naechsten Schritt.',
      ],
      followUpActions: [action('profile-recommendations-open', 'Empfehlungen oeffnen', 'LearnerProfile')],
      triggerPhrases: ['empfehlungen', 'was kommt als naechstes fuer den lernenden', 'welchen naechsten schritt soll ich waehlen'],
    },
    'profile-assignments': {
      title: 'Aufgaben des Lernenden',
      shortDescription:
        'Diese Karte zeigt zugewiesene Arbeit und hilft zu entscheiden, was jetzt erledigt werden sollte.',
      fullDescription:
        'Der Aufgabenbereich im Lernendenprofil sammelt aktive Pflichten und Prioritaeten. Er hilft zu sehen, was zugewiesen wurde, was dringend ist und womit die naechste Sitzung beginnen sollte.',
      hints: [
        'Beginne mit der Aufgabe, die als dringend markiert ist oder mit dem juengsten schwachen Ergebnis zusammenhaengt.',
        'Nach einer erledigten Aufgabe kehre zum Profil zurueck und pruefe, ob sich die Prioritaet geaendert hat.',
      ],
      followUpActions: [action('profile-assignments-open-game', 'Zum Spiel gehen', 'Game')],
      triggerPhrases: ['aufgaben des lernenden', 'was ist zugewiesen', 'prioritaetsaufgaben im profil'],
    },
    'parent-dashboard-overview': {
      title: 'Elterndashboard',
      shortDescription:
        'Das Elterndashboard sammelt den Ueberblick ueber den Lernenden: Fortschritt, Ergebnisse, Aufgaben, Monitoring und Einstellungen.',
      fullDescription:
        'Das Elterndashboard dient dazu, das Lernbild zu lesen und die naechsten Prioritaeten festzulegen, nicht zum Loesen von Aufgaben. Es hilft dem Elternteil zu pruefen, was passiert und welcher Schritt als naechstes sinnvoll ist.',
      hints: [
        'Waehle zuerst den Tab, der zur Frage passt: Ergebnisse, Fortschritt, Aufgaben, Monitoring oder KI-Tutor.',
        'Mache aus einem konkreten Schluss eine konkrete Aktion fuer den Lernenden.',
        'Pruefe vor den Details, ob der richtige Lernende ausgewaehlt ist.',
      ],
      followUpActions: [
        action('parent-dashboard-overview-profile', 'Lernendenprofil ansehen', 'LearnerProfile'),
        action('parent-dashboard-overview-lessons', 'Zu den Lektionen', 'Lessons'),
      ],
      triggerPhrases: ['elterndashboard', 'wie funktioniert dieses dashboard', 'was kann ich hier pruefen'],
    },
    'parent-dashboard-tabs': {
      title: 'Tabs im Elterndashboard',
      shortDescription:
        'Diese Tabs teilen das Elterndashboard in Ergebnisse, Fortschritt, Aufgaben, Monitoring und KI-Tutor-Unterstuetzung auf.',
      fullDescription:
        'Die Tabs ordnen das Elterndashboard nach Zweck. Statt alles auf einmal zu lesen, kann das Elternteil nur die Informationen oeffnen, die im Moment gebraucht werden.',
      hints: [
        'Waehle einen Tab passend zu der Frage, die du beantworten willst.',
        'Vergleiche nach dem Wechseln die Schluesse zwischen den Bereichen, aber mische nicht alles gleichzeitig.',
      ],
      followUpActions: [action('parent-dashboard-tabs-profile', 'Lernendenprofil oeffnen', 'LearnerProfile')],
      triggerPhrases: ['eltern-tabs', 'wie funktionieren diese tabs', 'was ist in diesem tab'],
    },
    'parent-dashboard-assignments': {
      title: 'Aufgaben des Lernenden im Elterndashboard',
      shortDescription:
        'Dieser Tab zeigt die zugewiesenen Aufgaben des Lernenden und hilft bei der Priorisierung.',
      fullDescription:
        'Der Aufgabentab im Elterndashboard dient dazu, die kurzfristige Arbeit des Lernenden zu planen. Er zeigt, was aktiv ist, was bald abgeschlossen werden sollte und welcher Bereich jetzt Vorrang haben sollte.',
      hints: [
        'Halte lieber eine Hauptaufgabe statt vieler paralleler Prioritaeten.',
        'Wenn eine Aufgabe nicht zum aktuellen Niveau passt, pruefe zuerst das Profil des Lernenden.',
        'Nach Abschluss einer Aufgabe kehre hierher zurueck und bestaetige, dass die Prioritaeten noch stimmen.',
      ],
      followUpActions: [action('parent-dashboard-assignments-game', 'Zum Spiel gehen', 'Game')],
      triggerPhrases: ['aufgaben des lernenden im elterndashboard', 'was ist zugewiesen', 'prioritaeten fuer den lernenden'],
    },
    'parent-dashboard-ai-tutor': {
      title: 'KI-Tutor-Tab fuer Eltern',
      shortDescription:
        'Dieser Bereich uebersetzt Lerndaten in einfachere Sprache und hilft bei der Entscheidung ueber den naechsten Schritt.',
      fullDescription:
        'Der KI-Tutor-Tab fuer Eltern ersetzt die Daten nicht, sondern interpretiert sie. Er ist der richtige Ort fuer Fragen zu Fortschritt, Prioritaeten und zur Logik des naechsten Schritts, wenn Zahlen allein nicht reichen.',
      hints: [
        'Beginne mit einer konkreten Frage, auf die du eine Antwort willst.',
        'Die besten Ergebnisse entstehen, wenn dieser Tab mit Fortschritts-, Ergebnis- oder Aufgabendaten kombiniert wird.',
      ],
      followUpActions: [action('parent-dashboard-ai-tutor-profile', 'Lernendenprofil ansehen', 'LearnerProfile')],
      triggerPhrases: ['ki-tutor fuer eltern', 'wie nutze ich diesen tab', 'was kann ich hier fragen'],
    },
  },
};

export const getKangurAiTutorNativeGuideLocaleOverlay = (
  locale: string
): KangurAiTutorNativeGuideLocaleOverlay => {
  const normalizedLocale = normalizeSiteLocale(locale);

  return {
    locale: normalizedLocale,
    entries: GUIDE_COPY_BY_LOCALE[normalizedLocale] ?? {},
  };
};

export const buildKangurAiTutorNativeGuideLocaleScaffold = (input: {
  locale: string;
  sourceStore: KangurAiTutorNativeGuideStore;
  existingStore?: Partial<KangurAiTutorNativeGuideStore> | null;
}): KangurAiTutorNativeGuideStore => {
  const locale = normalizeSiteLocale(input.locale);
  const sourceStore = parseKangurAiTutorNativeGuideStore({
    ...cloneValue(input.sourceStore),
    locale,
  });
  const currentStore = input.existingStore
    ? mergeKangurAiTutorNativeGuideStore(sourceStore, input.existingStore)
    : sourceStore;
  const overlay = getKangurAiTutorNativeGuideLocaleOverlay(locale);
  const sourceEntriesById = new Map(sourceStore.entries.map((entry) => [entry.id, entry] as const));

  const entries = currentStore.entries.map((entry) => {
    const entryOverlay = overlay.entries[entry.id];
    if (!entryOverlay) {
      return entry;
    }

    const sourceEntry = sourceEntriesById.get(entry.id) ?? entry;
    return applyOverlayWhenStillSource(sourceEntry, entry, entryOverlay) as KangurAiTutorNativeGuideEntry;
  });

  return parseKangurAiTutorNativeGuideStore({
    ...currentStore,
    locale,
    entries,
  });
};
