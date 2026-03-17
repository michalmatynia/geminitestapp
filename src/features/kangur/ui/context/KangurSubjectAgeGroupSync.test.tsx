/**
 * @vitest-environment jsdom
 */

import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { KangurSubjectAgeGroupSync } from './KangurSubjectAgeGroupSync';

const { useKangurAgeGroupFocusMock, useKangurSubjectFocusMock } = vi.hoisted(() => ({
  useKangurAgeGroupFocusMock: vi.fn(),
  useKangurSubjectFocusMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/context/KangurAgeGroupFocusContext', () => ({
  useKangurAgeGroupFocus: () => useKangurAgeGroupFocusMock(),
}));

vi.mock('@/features/kangur/ui/context/KangurSubjectFocusContext', () => ({
  useKangurSubjectFocus: () => useKangurSubjectFocusMock(),
}));

describe('KangurSubjectAgeGroupSync', () => {
  beforeEach(() => {
    useKangurAgeGroupFocusMock.mockReset();
    useKangurSubjectFocusMock.mockReset();
  });

  it('falls back to the default subject when the current one is not available for the new age group', async () => {
    const setSubject = vi.fn();
    useKangurAgeGroupFocusMock.mockReturnValue({
      ageGroup: 'six_year_old',
      setAgeGroup: vi.fn(),
      ageGroupKey: null,
    });
    useKangurSubjectFocusMock.mockReturnValue({
      subject: 'maths',
      setSubject,
      subjectKey: null,
    });

    render(<KangurSubjectAgeGroupSync />);

    await waitFor(() => {
      expect(setSubject).toHaveBeenCalledWith('alphabet');
    });
  });

  it('keeps the subject when it already supports the selected age group', async () => {
    const setSubject = vi.fn();
    useKangurAgeGroupFocusMock.mockReturnValue({
      ageGroup: 'ten_year_old',
      setAgeGroup: vi.fn(),
      ageGroupKey: null,
    });
    useKangurSubjectFocusMock.mockReturnValue({
      subject: 'maths',
      setSubject,
      subjectKey: null,
    });

    render(<KangurSubjectAgeGroupSync />);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(setSubject).not.toHaveBeenCalled();
  });

  it('switches to the grown-up default when changing to the grown-ups age group', async () => {
    const setSubject = vi.fn();
    useKangurAgeGroupFocusMock.mockReturnValue({
      ageGroup: 'grown_ups',
      setAgeGroup: vi.fn(),
      ageGroupKey: null,
    });
    useKangurSubjectFocusMock.mockReturnValue({
      subject: 'maths',
      setSubject,
      subjectKey: null,
    });

    render(<KangurSubjectAgeGroupSync />);

    await waitFor(() => {
      expect(setSubject).toHaveBeenCalledWith('web_development');
    });
  });
});
