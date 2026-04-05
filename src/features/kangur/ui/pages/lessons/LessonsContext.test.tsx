// @vitest-environment jsdom

import React from 'react';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LessonsProvider, useLessons } from './LessonsContext';

const mocks = vi.hoisted(() => ({
  useLessonsLogic: vi.fn(),
}));

vi.mock('./Lessons.hooks', () => ({
  useLessonsLogic: () => mocks.useLessonsLogic(),
}));

describe('LessonsContext', () => {
  beforeEach(() => {
    mocks.useLessonsLogic.mockReturnValue({
      activeLessonId: 'lesson-1',
      focusToken: 'intro',
      selectLesson: vi.fn(),
    });
  });

  it('throws outside the provider', () => {
    expect(() => renderHook(() => useLessons())).toThrow(
      'useLessons must be used within LessonsProvider'
    );
  });

  it('returns lessons logic inside the provider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <LessonsProvider>{children}</LessonsProvider>
    );

    const { result } = renderHook(() => useLessons(), { wrapper });

    expect(result.current).toMatchObject({
      activeLessonId: 'lesson-1',
      focusToken: 'intro',
    });
    expect(result.current.selectLesson).toBeTypeOf('function');
  });
});
