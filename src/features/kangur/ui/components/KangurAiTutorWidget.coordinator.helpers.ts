import type {
  KangurAiTutorFocusKind,
  KangurAiTutorPromptMode,
} from '@/features/kangur/shared/contracts/kangur-ai-tutor';
import type { KangurAiTutorContent } from '@/features/kangur/shared/contracts/kangur-ai-tutor-content';

import { KANGUR_AI_TUTOR_UI_ROOT_SELECTOR } from './KangurAiTutorUiBoundary.shared';

import type { ActiveTutorFocus } from './KangurAiTutorWidget.shared';
import type { TutorSurface } from './KangurAiTutorWidget.types';
import { logClientError } from '@/features/kangur/shared/utils/observability/client-error-logger';


export const HOME_ONBOARDING_ELIGIBLE_CONTENT_ID = 'game:home';
const getTutorUiElement = (value: EventTarget | Node | null): Element | null => {
  if (value instanceof Element) {
    return value;
  }

  if (value instanceof Node) {
    return value.parentElement;
  }

  return null;
};

const isNodeWithinTutorUi = (value: EventTarget | Node | null): boolean =>
  getTutorUiElement(value)?.closest(KANGUR_AI_TUTOR_UI_ROOT_SELECTOR) !== null;

export const getInteractionIntent = (
  promptMode: KangurAiTutorPromptMode,
  focusKind: ActiveTutorFocus['kind'],
  answerRevealed: boolean | undefined
): 'hint' | 'explain' | 'review' | 'next_step' => {
  if (promptMode === 'hint') {
    return 'hint';
  }

  if (promptMode === 'explain' || promptMode === 'selected_text') {
    return answerRevealed && focusKind === 'review' ? 'review' : 'explain';
  }

  return 'next_step';
};

export const normalizeConversationFocusKind = (
  focusKind: ActiveTutorFocus['kind']
): KangurAiTutorFocusKind | undefined => {
  switch (focusKind) {
    case 'selection':
    case 'hero':
    case 'screen':
    case 'library':
    case 'empty_state':
    case 'navigation':
    case 'lesson_header':
    case 'assignment':
    case 'document':
    case 'home_actions':
    case 'home_quest':
    case 'priority_assignments':
    case 'leaderboard':
    case 'progress':
    case 'question':
    case 'review':
    case 'summary':
    case 'login_action':
    case 'create_account_action':
    case 'login_identifier_field':
    case 'login_form':
      return focusKind;
    default:
      return undefined;
  }
};

export const resolveTutorFollowUpLocation = (
  href: string
): { pathname: string; search: string } | null => {
  try {
    const resolved = new URL(
      href,
      typeof window === 'undefined' ? 'https://kangur.local' : window.location.origin
    );

    return {
      pathname: resolved.pathname,
      search: resolved.search,
    };
  } catch (error) {
    logClientError(error);
    return null;
  }
};

export const getCurrentTutorLocation = (): { pathname: string; search: string } | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  return {
    pathname: window.location.pathname,
    search: window.location.search,
  };
};

export const getTutorSurfaceLabel = (
  surface: TutorSurface | null | undefined,
  tutorContent: KangurAiTutorContent
): string => {
  switch (surface) {
    case 'test':
      return tutorContent.panelChrome.surfaceLabels.test;
    case 'game':
      return tutorContent.panelChrome.surfaceLabels.game;
    case 'lesson':
      return tutorContent.panelChrome.surfaceLabels.lesson;
    case 'profile':
      return 'Profil';
    case 'parent_dashboard':
      return 'Panel rodzica';
    case 'auth':
      return 'Logowanie';
    default:
      return tutorContent.panelChrome.surfaceLabels.lesson;
  }
};

export const getTutorContextFallbackTarget = (
  surface: TutorSurface | null | undefined,
  tutorContent: KangurAiTutorContent
): string => {
  switch (surface) {
    case 'test':
      return tutorContent.panelChrome.contextFallbackTargets.test;
    case 'game':
      return tutorContent.panelChrome.contextFallbackTargets.game;
    case 'lesson':
      return tutorContent.panelChrome.contextFallbackTargets.lesson;
    case 'profile':
      return 'Nowy panel profilu';
    case 'parent_dashboard':
      return 'Nowy panel rodzica';
    case 'auth':
      return 'Ekran logowania';
    default:
      return tutorContent.panelChrome.contextFallbackTargets.lesson;
  }
};

export const getContextSwitchNotice = (input: {
  tutorContent: KangurAiTutorContent;
  surface: TutorSurface | null | undefined;
  title?: string | null | undefined;
  contentId: string | null | undefined;
  questionProgressLabel?: string | null | undefined;
  questionId: string | null | undefined;
  assignmentSummary?: string | null | undefined;
  assignmentId: string | null | undefined;
}): {
  title: string;
  target: string;
  detail: string | null;
} | null => {
  if (!input.surface) {
    return null;
  }

  const surfaceLabel = getTutorSurfaceLabel(input.surface, input.tutorContent);
  const targetLabel = input.title?.trim()
    ? `${surfaceLabel}: ${input.title.trim()}`
    : input.contentId?.trim()
      ? `${surfaceLabel}: ${input.contentId.trim()}`
      : getTutorContextFallbackTarget(input.surface, input.tutorContent);
  const detail = input.questionProgressLabel?.trim()
    ? input.questionProgressLabel.trim()
    : input.questionId?.trim()
      ? input.tutorContent.contextSwitch.detailCurrentQuestion
      : input.assignmentSummary?.trim()
        ? input.tutorContent.contextSwitch.detailCurrentAssignment
        : input.assignmentId?.trim()
          ? input.tutorContent.contextSwitch.detailCurrentAssignment
          : null;

  return {
    title: input.tutorContent.contextSwitch.title,
    target: targetLabel,
    detail,
  };
};

export const isTargetWithinTutorUi = (target: EventTarget | null): boolean => {
  return isNodeWithinTutorUi(target);
};

export const isSelectionWithinTutorUi = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
    return false;
  }

  const nodes: Array<Node | null> = [selection.anchorNode, selection.focusNode];
  for (let index = 0; index < selection.rangeCount; index += 1) {
    try {
      nodes.push(selection.getRangeAt(index).commonAncestorContainer);
    } catch (error) {
      logClientError(error);
    
      // Ignore stale browser ranges and fall back to anchor/focus nodes.
    }
  }

  return nodes.some((node) => isNodeWithinTutorUi(node));
};
