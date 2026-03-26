'use client';

import type { KangurCalendarInteractiveStageSection } from '@/shared/contracts/kangur-games';

import CalendarInteractiveGame from './CalendarInteractiveGame';

type CalendarInteractiveStageGameProps = {
  calendarSection?: KangurCalendarInteractiveStageSection;
  onFinish: () => void;
};

export default function CalendarInteractiveStageGame({
  calendarSection = 'dni',
  onFinish,
}: CalendarInteractiveStageGameProps): React.JSX.Element {
  return <CalendarInteractiveGame key={calendarSection} onFinish={onFinish} section={calendarSection} />;
}
