'use client';

import type {
  KangurAiTutorFocusKind,
  KangurAiTutorPromptMode,
} from '@/shared/contracts/kangur-ai-tutor';
import type { KangurAiTutorContent } from '@/shared/contracts/kangur-ai-tutor-content';

import { KANGUR_AI_TUTOR_UI_ROOT_SELECTOR } from './KangurAiTutorUiBoundary.shared';

import type { ActiveTutorFocus } from './KangurAiTutorWidget.shared';
import type { TutorSurface } from './KangurAiTutorWidget.types';

export const FLOATING_TUTOR_AVATAR_RIM_COLOR = '#78350f';
export const HOME_ONBOARDING_ELIGIBLE_CONTENT_ID = 'game:home';
export const CONTEXTLESS_TUTOR_EMPTY_STATE_MESSAGE =
  'Otworz lekcje, gre albo test, a pomoge Ci w konkretnym zadaniu.';
export const CONTEXTLESS_TUTOR_DISABLED_PLACEHOLDER =
  'Przejdz do lekcji, gry albo testu, aby zadac pytanie.';
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
  } catch {
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

  const surfaceLabel =
    input.surface === 'test'
      ? input.tutorContent.panelChrome.surfaceLabels.test
      : input.surface === 'game'
        ? input.tutorContent.panelChrome.surfaceLabels.game
        : input.tutorContent.panelChrome.surfaceLabels.lesson;
  const targetLabel = input.title?.trim()
    ? `${surfaceLabel}: ${input.title.trim()}`
    : input.contentId?.trim()
      ? `${surfaceLabel}: ${input.contentId.trim()}`
      : input.surface === 'test'
        ? input.tutorContent.panelChrome.contextFallbackTargets.test
        : input.surface === 'game'
          ? input.tutorContent.panelChrome.contextFallbackTargets.game
          : input.tutorContent.panelChrome.contextFallbackTargets.lesson;
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
    } catch {
      // Ignore stale browser ranges and fall back to anchor/focus nodes.
    }
  }

  return nodes.some((node) => isNodeWithinTutorUi(node));
};
