import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getKangurSubjectFocusRepositoryMock,
  resolveKangurActiveLearnerMock,
  saveSubjectFocusMock,
} = vi.hoisted(() => ({
  getKangurSubjectFocusRepositoryMock: vi.fn(),
  resolveKangurActiveLearnerMock: vi.fn(),
  saveSubjectFocusMock: vi.fn(),
}));

vi.mock('@/features/kangur/server', () => ({
  getKangurSubjectFocusRepository: getKangurSubjectFocusRepositoryMock,
  resolveKangurActiveLearner: resolveKangurActiveLearnerMock,
}));

import { subjectFocusPatchHandler } from '@/app/api/kangur/[[...path]]/routing/routing.learner';

describe('kangur subject focus route handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getKangurSubjectFocusRepositoryMock.mockResolvedValue({
      getSubjectFocus: vi.fn(),
      saveSubjectFocus: saveSubjectFocusMock,
    });
    resolveKangurActiveLearnerMock.mockResolvedValue({
      id: 'learner-1',
    });
  });

  it('accepts JSON bodies through the wrapped PATCH route without re-reading the request stream', async () => {
    saveSubjectFocusMock.mockResolvedValue('english');

    const response = await subjectFocusPatchHandler(
      new NextRequest('http://localhost/api/kangur/subject-focus', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          subject: 'english',
        }),
      })
    );

    expect(saveSubjectFocusMock).toHaveBeenCalledWith('learner-1', 'english');
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ subject: 'english' });
  });
});
