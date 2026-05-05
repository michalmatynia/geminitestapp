import { normalizeCaptureWordToken } from '../utils';

export const isLikelyCapturePersonNameLine = (line: string): boolean => {
  const tokens = line
    .split(/\s+/).map((t) => normalizeCaptureWordToken(t)).filter((t) => t.length > 0);
  if (tokens.length < 2 || tokens.length > 4) return false;
  return true;
};
