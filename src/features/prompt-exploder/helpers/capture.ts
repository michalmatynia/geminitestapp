export const readRegexCaptureGroup = (match: RegExpExecArray, group: number): string => {
  const normalizedGroup = Number.isFinite(group) ? Math.max(0, Math.floor(group)) : 0;
  if (normalizedGroup === 0) {
    return typeof match[0] === 'string' ? match[0] : '';
  }
  const value = match[normalizedGroup];
  return typeof value === 'string' ? value : '';
};
