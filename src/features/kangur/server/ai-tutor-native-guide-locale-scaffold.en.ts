import { action, type GuideEntryOverlay } from './ai-tutor-native-guide-locale-scaffold.shared';

export const ENGLISH_KANGUR_AI_TUTOR_NATIVE_GUIDE_COPY: Record<string, GuideEntryOverlay> = {
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
};
