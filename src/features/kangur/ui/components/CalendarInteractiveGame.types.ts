import type { KangurAccent } from '@/features/kangur/ui/design/tokens';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export type CalendarInteractiveSectionId = 'dni' | 'miesiace' | 'data';
export type CalendarInteractiveTaskPoolId = CalendarInteractiveSectionId | 'mixed';

export type ClickWeekdayNameTask = {
  type: 'click_weekday_name';
  targetIdx: number;
  label: string;
};

export type ClickDateTask = {
  type: 'click_date';
  targetDay: number;
  month: number;
  year: number;
  label: string;
};

export type DragSeasonTask = {
  type: 'drag_season';
  monthName: string;
  correctSeason: Season;
  label: string;
};

export type FlipMonthTask = {
  type: 'flip_month';
  targetMonth: number;
  label: string;
};

export type ClickAllWeekendsTask = {
  type: 'click_all_weekends';
  targets: number[];
  dayIdx: 5 | 6;
  label: string;
};

export type Task =
  | ClickWeekdayNameTask
  | ClickDateTask
  | DragSeasonTask
  | FlipMonthTask
  | ClickAllWeekendsTask;

export type TaskType = Task['type'];

export type CalendarInteractiveSectionContent = {
  accent: KangurAccent;
};

export type CalendarInteractiveGameProps = {
  calendarSection?: CalendarInteractiveTaskPoolId;
  onFinish?: () => void;
  section?: CalendarInteractiveTaskPoolId;
  stage?: {
    onFinish: () => void;
    section?: CalendarInteractiveTaskPoolId;
  };
};
