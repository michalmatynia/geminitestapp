/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_KANGUR_AI_TUTOR_CONTENT } from '@/shared/contracts/kangur-ai-tutor-content';

import { KANGUR_AI_TUTOR_UI_ROOT_ATTRIBUTE } from './KangurAiTutorUiBoundary.shared';
import {
  getContextSwitchNotice,
  getTutorContextFallbackTarget,
  getTutorSurfaceLabel,
  isSelectionWithinTutorUi,
  isTargetWithinTutorUi,
} from './KangurAiTutorWidget.coordinator.helpers';

const mockSelection = (node: Node, text: string): void => {
  vi.spyOn(window, 'getSelection').mockReturnValue({
    anchorNode: node,
    focusNode: node,
    getRangeAt: () =>
      ({
        commonAncestorContainer: node,
      }) as Range,
    isCollapsed: false,
    rangeCount: 1,
    toString: () => text,
  } as unknown as Selection);
};

describe('KangurAiTutorWidget.coordinator helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('treats selections inside tutor roots as tutor-ui selections', () => {
    const tutorRoot = document.createElement('div');
    tutorRoot.setAttribute(KANGUR_AI_TUTOR_UI_ROOT_ATTRIBUTE, 'true');
    const textNode = document.createTextNode('Wyjaśnienie tutora');
    tutorRoot.append(textNode);
    document.body.append(tutorRoot);

    mockSelection(textNode, 'Wyjaśnienie tutora');

    expect(isSelectionWithinTutorUi()).toBe(true);
  });

  it('ignores page selections outside tutor roots', () => {
    const pageRoot = document.createElement('div');
    const textNode = document.createTextNode('Tekst lekcji');
    pageRoot.append(textNode);
    document.body.append(pageRoot);

    mockSelection(textNode, 'Tekst lekcji');

    expect(isSelectionWithinTutorUi()).toBe(false);
  });

  it('treats event targets inside tutor roots as tutor-ui targets', () => {
    const tutorRoot = document.createElement('div');
    tutorRoot.setAttribute(KANGUR_AI_TUTOR_UI_ROOT_ATTRIBUTE, 'true');
    const button = document.createElement('button');
    tutorRoot.append(button);
    document.body.append(tutorRoot);

    expect(isTargetWithinTutorUi(button)).toBe(true);
  });

  it('uses localized tutor surface labels for profile, parent dashboard, and auth surfaces', () => {
    const tutorContent = {
      ...DEFAULT_KANGUR_AI_TUTOR_CONTENT,
      panelChrome: {
        ...DEFAULT_KANGUR_AI_TUTOR_CONTENT.panelChrome,
        surfaceLabels: {
          ...DEFAULT_KANGUR_AI_TUTOR_CONTENT.panelChrome.surfaceLabels,
          profile: 'Профіль',
          parent_dashboard: 'Панель для батьків',
          auth: 'Вхід',
        },
      },
    };

    expect(getTutorSurfaceLabel('profile', tutorContent)).toBe('Профіль');
    expect(getTutorSurfaceLabel('parent_dashboard', tutorContent)).toBe('Панель для батьків');
    expect(getTutorSurfaceLabel('auth', tutorContent)).toBe('Вхід');
  });

  it('uses localized tutor context fallback targets for profile, parent dashboard, and auth surfaces', () => {
    const tutorContent = {
      ...DEFAULT_KANGUR_AI_TUTOR_CONTENT,
      panelChrome: {
        ...DEFAULT_KANGUR_AI_TUTOR_CONTENT.panelChrome,
        contextFallbackTargets: {
          ...DEFAULT_KANGUR_AI_TUTOR_CONTENT.panelChrome.contextFallbackTargets,
          profile: 'Нова панель профілю',
          parent_dashboard: 'Нова батьківська панель',
          auth: 'Екран входу',
        },
      },
    };

    expect(getTutorContextFallbackTarget('profile', tutorContent)).toBe('Нова панель профілю');
    expect(getTutorContextFallbackTarget('parent_dashboard', tutorContent)).toBe(
      'Нова батьківська панель'
    );
    expect(getTutorContextFallbackTarget('auth', tutorContent)).toBe('Екран входу');
  });

  it('builds a localized context switch notice for auth surfaces without a title', () => {
    const tutorContent = {
      ...DEFAULT_KANGUR_AI_TUTOR_CONTENT,
      panelChrome: {
        ...DEFAULT_KANGUR_AI_TUTOR_CONTENT.panelChrome,
        surfaceLabels: {
          ...DEFAULT_KANGUR_AI_TUTOR_CONTENT.panelChrome.surfaceLabels,
          auth: 'Вхід',
        },
        contextFallbackTargets: {
          ...DEFAULT_KANGUR_AI_TUTOR_CONTENT.panelChrome.contextFallbackTargets,
          auth: 'Екран входу',
        },
      },
      contextSwitch: {
        ...DEFAULT_KANGUR_AI_TUTOR_CONTENT.contextSwitch,
        title: 'Нове місце допомоги',
      },
    };

    expect(
      getContextSwitchNotice({
        tutorContent,
        surface: 'auth',
        title: null,
        contentId: null,
        questionProgressLabel: null,
        questionId: null,
        assignmentSummary: null,
        assignmentId: null,
      })
    ).toEqual({
      title: 'Нове місце допомоги',
      target: 'Екран входу',
      detail: null,
    });
  });
});
