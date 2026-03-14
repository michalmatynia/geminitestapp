/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { KANGUR_AI_TUTOR_UI_ROOT_ATTRIBUTE } from './KangurAiTutorUiBoundary.shared';
import {
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
});
