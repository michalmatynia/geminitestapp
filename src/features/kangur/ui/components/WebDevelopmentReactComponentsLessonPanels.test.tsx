/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { activitySlides } from '@/features/kangur/ui/components/WebDevelopmentReactComponentsLesson.data.activity';
import { fragmentSlides } from '@/features/kangur/ui/components/WebDevelopmentReactComponentsLesson.data.fragment';
import { strictModeSlides } from '@/features/kangur/ui/components/WebDevelopmentReactComponentsLesson.data.strict-mode';

describe('WebDevelopmentReactComponents lesson panels', () => {
  it('keeps Activity supporting notes inside the visual support area', () => {
    render(<>{activitySlides[0]?.content}</>);

    const supportingItem = screen.getByText('Co się dzieje w ukryciu?');

    expect(supportingItem.closest('.kangur-lesson-visual-supporting')).toBeTruthy();
    expect(supportingItem.closest('.kangur-lesson-inset')).toBeNull();
  });

  it('keeps Fragment caveats inside the visual support area', () => {
    render(<>{fragmentSlides[2]?.content}</>);

    const supportingItem = screen.getByText('Caveat');

    expect(supportingItem.closest('.kangur-lesson-visual-supporting')).toBeTruthy();
    expect(supportingItem.closest('.kangur-lesson-callout')).toBeNull();
  });

  it('keeps StrictMode setup notes inside the visual support area', () => {
    render(<>{strictModeSlides[0]?.content}</>);

    const supportingItem = screen.getByText('Co włącza StrictMode?');

    expect(supportingItem.closest('.kangur-lesson-visual-supporting')).toBeTruthy();
    expect(supportingItem.closest('.kangur-lesson-inset')).toBeNull();
  });
});
