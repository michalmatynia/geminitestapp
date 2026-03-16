export const DRAWING_LENIENCY = 0.2;

export const loosenMin = (value: number): number => value * (1 - DRAWING_LENIENCY);

export const loosenMax = (value: number): number => value * (1 + DRAWING_LENIENCY);

export const loosenMinInt = (value: number): number =>
  Math.max(1, Math.round(loosenMin(value)));
