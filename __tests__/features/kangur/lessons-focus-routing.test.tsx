/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useKangurRoutingMock, settingsStoreGetMock } = vi.hoisted(() => ({
  useKangurRoutingMock: vi.fn(),
  settingsStoreGetMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', () => ({
  useKangurRouting: useKangurRoutingMock,
}));

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => ({
    get: settingsStoreGetMock,
  }),
}));

vi.mock('@/features/kangur/ui/components/lessons', () => {
  const lesson =
    (label: string) =>
    ({ onBack }: { onBack: () => void }) => (
      <div data-testid={`lesson-${label}`}>
        {label}
        <button onClick={onBack}>back</button>
      </div>
    );

  return {
    AddingLesson: lesson('adding'),
    CalendarLesson: lesson('calendar'),
    ClockLesson: lesson('clock'),
    DivisionLesson: lesson('division'),
    GeometryBasicsLesson: lesson('geometry_basics'),
    GeometryPerimeterLesson: lesson('geometry_perimeter'),
    GeometryShapesLesson: lesson('geometry_shapes'),
    GeometrySymmetryLesson: lesson('geometry_symmetry'),
    MultiplicationLesson: lesson('multiplication'),
    SubtractingLesson: lesson('subtracting'),
  };
});

import Lessons from '@/features/kangur/ui/pages/Lessons';

const lessonsSettingsValue = JSON.stringify([
  {
    id: 'kangur-lesson-adding',
    componentId: 'adding',
    title: 'Dodawanie',
    description: 'Opis',
    emoji: '➕',
    color: 'from-orange-400 to-yellow-400',
    activeBg: 'bg-orange-400',
    sortOrder: 1000,
    enabled: true,
  },
  {
    id: 'kangur-lesson-division',
    componentId: 'division',
    title: 'Dzielenie',
    description: 'Opis',
    emoji: '➗',
    color: 'from-blue-500 to-teal-400',
    activeBg: 'bg-blue-500',
    sortOrder: 2000,
    enabled: true,
  },
]);

describe('Lessons page focus query support', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useKangurRoutingMock.mockReturnValue({ basePath: '/kangur' });
    settingsStoreGetMock.mockReturnValue(lessonsSettingsValue);
  });

  it('auto-opens the focused lesson when focus query maps to operation', async () => {
    window.history.replaceState({}, '', '/kangur/lessons?focus=division');

    render(<Lessons />);

    expect(await screen.findByTestId('lesson-division')).toBeInTheDocument();
    expect(window.location.search).toBe('');
  });

  it('keeps lessons list view when focus query does not map to a lesson', async () => {
    window.history.replaceState({}, '', '/kangur/lessons?focus=unknown');

    render(<Lessons />);

    expect(await screen.findByRole('heading', { name: '📚 Lekcje' })).toBeInTheDocument();
    expect(screen.queryByTestId('lesson-division')).not.toBeInTheDocument();
    expect(window.location.search).toBe('?focus=unknown');
  });
});
