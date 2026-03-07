const DEFAULT_CAPTION_TEXT = 'Narration transcript unavailable.';

const normalizeCueText = (text: string): string => {
  const normalized = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.replace(/-->/g, '->').trimEnd())
    .join('\n')
    .trim();

  return normalized || DEFAULT_CAPTION_TEXT;
};

export const buildInlineVttTrackSrc = (text: string): string => {
  const payload = `WEBVTT\n\n00:00:00.000 --> 99:59:59.000\n${normalizeCueText(text)}\n`;
  return `data:text/vtt;charset=utf-8,${encodeURIComponent(payload)}`;
};
