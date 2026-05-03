import { type PlaywrightCaptureRoute } from '@/shared/contracts/playwright';

import { KANGUR_BASE_PATH, KANGUR_PAGE_TO_SLUG } from '@/features/kangur/config/routing';

export type KangurSocialCapturePreset = PlaywrightCaptureRoute;

const buildPath = (slug: string): string => `${KANGUR_BASE_PATH}/${slug}`;
const buildGameScreenPath = (screen: string): string =>
  `${buildPath(KANGUR_PAGE_TO_SLUG['Game'] ?? 'game')}?quickStart=screen&screen=${encodeURIComponent(screen)}`;

export const KANGUR_SOCIAL_CAPTURE_PRESETS: KangurSocialCapturePreset[] = [
  {
    id: 'game',
    title: 'Kangur Game Home',
    path: buildPath(KANGUR_PAGE_TO_SLUG['Game'] ?? 'game'),
    description: 'Learner home and quick-start hub.',
    selector: null,
    waitForMs: null,
    waitForSelectorMs: null,
  },
  {
    id: 'clock-quiz',
    title: 'Clock Quiz',
    path: buildGameScreenPath('clock_quiz'),
    description: 'Direct launch into the clock-training minigame.',
    selector: '[data-testid="kangur-clock-quiz-top-section"]',
    waitForMs: 3500,
    waitForSelectorMs: 20000,
  },
  {
    id: 'calendar-quiz',
    title: 'Calendar Training',
    path: buildGameScreenPath('calendar_quiz'),
    description: 'Direct launch into the calendar-training minigame.',
    selector: '[data-testid="kangur-calendar-training-top-section"]',
    waitForMs: 3500,
    waitForSelectorMs: 20000,
  },
  {
    id: 'geometry-quiz',
    title: 'Geometry Drawing',
    path: buildGameScreenPath('geometry_quiz'),
    description: 'Direct launch into the geometry-drawing minigame.',
    selector: '[data-testid="kangur-geometry-training-top-section"]',
    waitForMs: 3500,
    waitForSelectorMs: 20000,
  },
  {
    id: 'lessons',
    title: 'Lessons Library',
    path: buildPath(KANGUR_PAGE_TO_SLUG['Lessons'] ?? 'lessons'),
    description: 'Lesson catalog and progress overview.',
    selector: null,
    waitForMs: null,
    waitForSelectorMs: null,
  },
  {
    id: 'tests',
    title: 'Tests & Exams',
    path: buildPath(KANGUR_PAGE_TO_SLUG['Tests'] ?? 'tests'),
    description: 'Kangur test suites and exam prep.',
    selector: null,
    waitForMs: null,
    waitForSelectorMs: null,
  },
  {
    id: 'profile',
    title: 'Learner Profile',
    path: buildPath(KANGUR_PAGE_TO_SLUG['LearnerProfile'] ?? 'profile'),
    description: 'Progress, streaks, and recommendations.',
    selector: null,
    waitForMs: null,
    waitForSelectorMs: null,
  },
  {
    id: 'parent-dashboard',
    title: 'Parent Dashboard',
    path: buildPath(KANGUR_PAGE_TO_SLUG['ParentDashboard'] ?? 'parent-dashboard'),
    description: 'Parent monitoring and assignments.',
    selector: null,
    waitForMs: null,
    waitForSelectorMs: null,
  },
  {
    id: 'duels',
    title: 'Duels Lobby',
    path: buildPath(KANGUR_PAGE_TO_SLUG['Duels'] ?? 'duels'),
    description: 'Multiplayer lobby and duels entry.',
    selector: null,
    waitForMs: null,
    waitForSelectorMs: null,
  },
  {
    id: 'social-updates',
    title: 'Social Updates',
    path: buildPath(KANGUR_PAGE_TO_SLUG['SocialUpdates'] ?? 'social-updates'),
    description: 'Latest Kangur update stream.',
    selector: null,
    waitForMs: null,
    waitForSelectorMs: null,
  },
];
