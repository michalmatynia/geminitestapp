/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useKangurRoutingMock, settingsStoreGetMock, useKangurProgressStateMock } = vi.hoisted(
  () => ({
    useKangurRoutingMock: vi.fn(),
    settingsStoreGetMock: vi.fn(),
    useKangurProgressStateMock: vi.fn(),
  })
);

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', () => ({
  useKangurRouting: useKangurRoutingMock,
}));

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => ({
    get: settingsStoreGetMock,
  }),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurProgressState', () => ({
  useKangurProgressState: useKangurProgressStateMock,
}));

import Lessons from '@/features/kangur/ui/pages/Lessons';

const lessonsSettingsValue = JSON.stringify([
  {
    id: 'kangur-lesson-clock',
    componentId: 'clock',
    title: 'Nauka zegara',
    description: 'Odczytuj godziny',
    emoji: '🕐',
    color: 'from-indigo-400 to-purple-500',
    activeBg: 'bg-indigo-500',
    sortOrder: 1000,
    enabled: true,
  },
  {
    id: 'kangur-lesson-geometry-shapes',
    componentId: 'geometry_shapes',
    title: 'Figury geometryczne',
    description: 'Poznaj figury',
    emoji: '🔷',
    color: 'from-fuchsia-500 to-violet-500',
    activeBg: 'bg-fuchsia-500',
    sortOrder: 2000,
    enabled: true,
  },
  {
    id: 'kangur-lesson-calendar',
    componentId: 'calendar',
    title: 'Nauka kalendarza',
    description: 'Dni i miesiące',
    emoji: '📅',
    color: 'from-green-400 to-teal-500',
    activeBg: 'bg-green-500',
    sortOrder: 3000,
    enabled: true,
  },
]);

describe('Lessons page mastery list', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useKangurRoutingMock.mockReturnValue({ basePath: '/kangur' });
    settingsStoreGetMock.mockReturnValue(lessonsSettingsValue);
    useKangurProgressStateMock.mockReturnValue({
      lessonMastery: {
        clock: {
          attempts: 2,
          completions: 2,
          masteryPercent: 92,
          bestScorePercent: 100,
          lastScorePercent: 84,
          lastCompletedAt: '2026-03-06T10:00:00.000Z',
        },
        geometry_shapes: {
          attempts: 1,
          completions: 1,
          masteryPercent: 45,
          bestScorePercent: 45,
          lastScorePercent: 45,
          lastCompletedAt: '2026-03-06T11:00:00.000Z',
        },
      },
    });
  });

  it('shows mastery badges and summaries for each lesson card', async () => {
    render(<Lessons />);

    expect(await screen.findByRole('heading', { name: '📚 Lekcje' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Wróć do poprzedniej strony' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Wszystkie' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Strona główna' }).closest('div')?.className).toContain(
      'sticky'
    );
    expect(screen.getByRole('link', { name: 'Strona główna' }).closest('div')?.className).toContain(
      'top-0'
    );
    expect(screen.getByText('Opanowane 92%')).toBeInTheDocument();
    expect(screen.getByText('Powtórz 45%')).toBeInTheDocument();
    expect(screen.getByText('Nowa')).toBeInTheDocument();
    expect(screen.getByText('Ukończono 2× · najlepszy wynik 100%')).toBeInTheDocument();
    expect(screen.getByText('Ukończono 1× · ostatni wynik 45%')).toBeInTheDocument();
    expect(screen.getByText('Brak zapisanej praktyki')).toBeInTheDocument();
  });

  it('sticks the header flush to the top inside the admin shell too', async () => {
    useKangurRoutingMock.mockReturnValue({ basePath: '/admin/kangur' });

    render(<Lessons />);

    await screen.findByRole('heading', { name: '📚 Lekcje' });
    expect(screen.getByRole('link', { name: 'Strona główna' }).closest('div')?.className).toContain(
      'sticky'
    );
    expect(screen.getByRole('link', { name: 'Strona główna' }).closest('div')?.className).toContain(
      'top-0'
    );
  });
});
