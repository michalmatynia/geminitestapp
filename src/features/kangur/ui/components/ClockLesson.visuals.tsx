import { KANGUR_CLOCK_THEME_COLORS } from './clock-theme';

type AnalogClockProps = {
  hours: number;
  minutes: number;
  label?: string;
  highlightHour?: boolean;
  highlightMinute?: boolean;
  showHourHand?: boolean;
  showMinuteHand?: boolean;
};

type ResolvedAnalogClockProps = {
  highlightHour: boolean;
  highlightMinute: boolean;
  hours: number;
  label?: string;
  minutes: number;
  showHourHand: boolean;
  showMinuteHand: boolean;
};

const CLOCK_ANGLE_OFFSET_DEGREES = -90;

const isClockElement = (
  element: React.JSX.Element | null
): element is React.JSX.Element => element !== null;

const resolveClockPolarCoordinate = ({
  angleDegrees,
  radius,
}: {
  angleDegrees: number;
  radius: number;
}): { x: number; y: number } => {
  const angle = angleDegrees * (Math.PI / 180);
  return {
    x: 100 + radius * Math.cos(angle),
    y: 100 + radius * Math.sin(angle),
  };
};

function ClockHourMarks(): React.JSX.Element[] {
  return Array.from({ length: 12 }, (_, i) => {
    const angleDegrees = i * 30 + CLOCK_ANGLE_OFFSET_DEGREES;
    const start = resolveClockPolarCoordinate({ angleDegrees, radius: 80 });
    const end = resolveClockPolarCoordinate({ angleDegrees, radius: 90 });

    return (
      <line
        key={i}
        x1={start.x}
        y1={start.y}
        x2={end.x}
        y2={end.y}
        stroke={KANGUR_CLOCK_THEME_COLORS.majorTick}
        strokeWidth='3'
        strokeLinecap='round'
      />
    );
  });
}

function ClockMinuteMarks(): React.JSX.Element[] {
  return Array.from({ length: 60 }, (_, i) => {
    if (i % 5 === 0) {
      return null;
    }

    const angleDegrees = i * 6 + CLOCK_ANGLE_OFFSET_DEGREES;
    const start = resolveClockPolarCoordinate({ angleDegrees, radius: 85 });
    const end = resolveClockPolarCoordinate({ angleDegrees, radius: 90 });

    return (
      <line
        key={i}
        x1={start.x}
        y1={start.y}
        x2={end.x}
        y2={end.y}
        stroke={KANGUR_CLOCK_THEME_COLORS.minorTick}
        strokeWidth='1'
      />
    );
  }).filter(isClockElement);
}

function ClockNumbers(): React.JSX.Element[] {
  return [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((n, i) => {
    const angleDegrees = i * 30 + CLOCK_ANGLE_OFFSET_DEGREES;
    const position = resolveClockPolarCoordinate({ angleDegrees, radius: 66 });

    return (
      <text
        key={n}
        x={position.x}
        y={position.y}
        textAnchor='middle'
        dominantBaseline='central'
        fontSize='14'
        fontWeight='bold'
        fill={KANGUR_CLOCK_THEME_COLORS.numeral}
      >
        {n}
      </text>
    );
  });
}

function ClockHand({
  angleDegrees,
  dataTestId,
  length,
  stroke,
  strokeWidth,
}: {
  angleDegrees: number;
  dataTestId: string;
  length: number;
  stroke: string;
  strokeWidth: number;
}): React.JSX.Element {
  const end = resolveClockPolarCoordinate({
    angleDegrees: angleDegrees + CLOCK_ANGLE_OFFSET_DEGREES,
    radius: length,
  });

  return (
    <line
      data-testid={dataTestId}
      x1='100'
      y1='100'
      x2={end.x}
      y2={end.y}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap='round'
    />
  );
}

function ClockLabel({ label }: { label?: string }): React.JSX.Element | null {
  if (!label) {
    return null;
  }

  return (
    <div className='text-sm font-semibold' style={{ color: KANGUR_CLOCK_THEME_COLORS.label }}>
      {label}
    </div>
  );
}

const resolveAnalogClockProps = (props: AnalogClockProps): ResolvedAnalogClockProps => ({
  highlightHour: props.highlightHour ?? false,
  highlightMinute: props.highlightMinute ?? false,
  hours: props.hours,
  label: props.label,
  minutes: props.minutes,
  showHourHand: props.showHourHand ?? true,
  showMinuteHand: props.showMinuteHand ?? true,
});

const resolveClockHourHandStroke = (highlightHour: boolean): string =>
  highlightHour
    ? KANGUR_CLOCK_THEME_COLORS.highlightHourHand
    : KANGUR_CLOCK_THEME_COLORS.lessonHourHand;

const resolveClockMinuteHandStroke = (highlightMinute: boolean): string =>
  highlightMinute
    ? KANGUR_CLOCK_THEME_COLORS.highlightMinuteHand
    : KANGUR_CLOCK_THEME_COLORS.lessonMinuteHand;

const resolveClockHourHandStrokeWidth = (highlightHour: boolean): number =>
  highlightHour ? 8 : 6;

const resolveClockMinuteHandStrokeWidth = (highlightMinute: boolean): number =>
  highlightMinute ? 6 : 4;

function ClockHands({
  highlightHour,
  highlightMinute,
  hourAngle,
  minuteAngle,
  showHourHand,
  showMinuteHand,
}: {
  highlightHour: boolean;
  highlightMinute: boolean;
  hourAngle: number;
  minuteAngle: number;
  showHourHand: boolean;
  showMinuteHand: boolean;
}): React.JSX.Element[] {
  return [
    showHourHand ? (
      <ClockHand
        key='hour'
        angleDegrees={hourAngle}
        dataTestId='clock-lesson-hour-hand'
        length={48}
        stroke={resolveClockHourHandStroke(highlightHour)}
        strokeWidth={resolveClockHourHandStrokeWidth(highlightHour)}
      />
    ) : null,
    showMinuteHand ? (
      <ClockHand
        key='minute'
        angleDegrees={minuteAngle}
        dataTestId='clock-lesson-minute-hand'
        length={68}
        stroke={resolveClockMinuteHandStroke(highlightMinute)}
        strokeWidth={resolveClockMinuteHandStrokeWidth(highlightMinute)}
      />
    ) : null,
  ].filter(isClockElement);
}

export function AnalogClock(props: AnalogClockProps): React.JSX.Element {
  const {
    hours,
    minutes,
    label,
    highlightHour,
    highlightMinute,
    showHourHand,
    showMinuteHand,
  } = resolveAnalogClockProps(props);
  const hourAngle = ((hours % 12) + minutes / 60) * 30;
  const minuteAngle = minutes * 6;

  return (
    <div className='flex flex-col items-center gap-2'>
      <svg viewBox='0 0 200 200' width='180' height='180' className='drop-shadow-lg'>
        <circle
          cx='100'
          cy='100'
          r='95'
          fill={KANGUR_CLOCK_THEME_COLORS.faceFill}
          stroke={KANGUR_CLOCK_THEME_COLORS.faceStroke}
          strokeWidth='4'
        />
        <ClockHourMarks />
        <ClockMinuteMarks />
        <ClockNumbers />
        <ClockHands
          highlightHour={highlightHour}
          highlightMinute={highlightMinute}
          hourAngle={hourAngle}
          minuteAngle={minuteAngle}
          showHourHand={showHourHand}
          showMinuteHand={showMinuteHand}
        />
        <circle cx='100' cy='100' r='6' fill={KANGUR_CLOCK_THEME_COLORS.center} />
      </svg>
      <ClockLabel label={label} />
    </div>
  );
}
