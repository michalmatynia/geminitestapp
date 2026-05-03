const normalizeTechnologyKey = (value: string): string =>
  value
    .replace(/\u00a0/g, ' ')
    .toLowerCase()
    .replace(/\.js\b/g, ' js')
    .replace(/c\+\+/g, 'cplusplus')
    .replace(/c#/g, 'csharp')
    .replace(/\.net/g, 'dotnet')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const TECHNOLOGY_ICON_STYLES: Record<string, { background: string; foreground: string; label?: string }> = {
  angular: { background: '#dd0031', foreground: '#ffffff', label: 'A' },
  basecom: { background: '#1d4ed8', foreground: '#ffffff', label: 'B' },
  bitbucket: { background: '#0052cc', foreground: '#ffffff', label: 'Bb' },
  bullmq: { background: '#dc2626', foreground: '#ffffff', label: 'BQ' },
  css: { background: '#1572b6', foreground: '#ffffff', label: 'CSS' },
  css3: { background: '#1572b6', foreground: '#ffffff', label: 'CSS' },
  docker: { background: '#2496ed', foreground: '#ffffff', label: 'D' },
  dotnet: { background: '#512bd4', foreground: '#ffffff', label: '.N' },
  expo: { background: '#000020', foreground: '#ffffff', label: 'E' },
  gemini: { background: '#8e75b2', foreground: '#ffffff', label: 'G' },
  git: { background: '#f05032', foreground: '#ffffff', label: 'Git' },
  github: { background: '#181717', foreground: '#ffffff', label: 'GH' },
  gpt: { background: '#10a37f', foreground: '#ffffff', label: 'GPT' },
  html: { background: '#e34f26', foreground: '#ffffff', label: 'HTML' },
  html5: { background: '#e34f26', foreground: '#ffffff', label: 'HTML' },
  java: { background: '#b91c1c', foreground: '#ffffff', label: 'J' },
  javascript: { background: '#f7df1e', foreground: '#111827', label: 'JS' },
  kubernetes: { background: '#326ce5', foreground: '#ffffff', label: 'K8s' },
  laravel: { background: '#ff2d20', foreground: '#ffffff', label: 'L' },
  mongodb: { background: '#47a248', foreground: '#ffffff', label: 'MDB' },
  mysql: { background: '#4479a1', foreground: '#ffffff', label: 'SQL' },
  next: { background: '#000000', foreground: '#ffffff', label: 'N' },
  'next js': { background: '#000000', foreground: '#ffffff', label: 'N' },
  node: { background: '#5fa04e', foreground: '#ffffff', label: 'Node' },
  'node js': { background: '#5fa04e', foreground: '#ffffff', label: 'Node' },
  ollama: { background: '#111827', foreground: '#ffffff', label: 'O' },
  openai: { background: '#111827', foreground: '#ffffff', label: 'AI' },
  php: { background: '#777bb4', foreground: '#ffffff', label: 'PHP' },
  playwright: { background: '#2ead33', foreground: '#ffffff', label: 'PW' },
  postgresql: { background: '#4169e1', foreground: '#ffffff', label: 'PG' },
  radix: { background: '#111827', foreground: '#ffffff', label: 'R' },
  'radix ui': { background: '#111827', foreground: '#ffffff', label: 'R' },
  react: { background: '#61dafb', foreground: '#111827', label: 'R' },
  'react native': { background: '#61dafb', foreground: '#111827', label: 'RN' },
  redis: { background: '#dc382d', foreground: '#ffffff', label: 'R' },
  rest: { background: '#0f766e', foreground: '#ffffff', label: 'API' },
  'rest api': { background: '#0f766e', foreground: '#ffffff', label: 'API' },
  'rest apis': { background: '#0f766e', foreground: '#ffffff', label: 'API' },
  sass: { background: '#cc6699', foreground: '#ffffff', label: 'Sass' },
  scss: { background: '#cc6699', foreground: '#ffffff', label: 'SCSS' },
  storybook: { background: '#ff4785', foreground: '#ffffff', label: 'SB' },
  symfony: { background: '#000000', foreground: '#ffffff', label: 'Sf' },
  tailwind: { background: '#06b6d4', foreground: '#ffffff', label: 'TW' },
  'tailwind css': { background: '#06b6d4', foreground: '#ffffff', label: 'TW' },
  tanstack: { background: '#ff4154', foreground: '#ffffff', label: 'TQ' },
  'tanstack query': { background: '#ff4154', foreground: '#ffffff', label: 'TQ' },
  typescript: { background: '#3178c6', foreground: '#ffffff', label: 'TS' },
  vitest: { background: '#6e9f18', foreground: '#ffffff', label: 'V' },
};

const TECHNOLOGY_DISPLAY_LABELS: Record<string, string> = {
  basecom: 'Base.com',
  bitbucket: 'Bitbucket',
  bullmq: 'BullMQ',
  css: 'CSS',
  css3: 'CSS3',
  dotnet: '.NET',
  gemini: 'Gemini',
  git: 'Git',
  github: 'GitHub',
  gpt: 'GPT',
  html: 'HTML',
  html5: 'HTML5',
  javascript: 'JavaScript',
  kubernetes: 'Kubernetes',
  mongodb: 'MongoDB',
  mysql: 'MySQL',
  next: 'Next.js',
  'next js': 'Next.js',
  node: 'Node.js',
  'node js': 'Node.js',
  openai: 'OpenAI',
  php: 'PHP',
  postgresql: 'PostgreSQL',
  radix: 'Radix UI',
  'radix ui': 'Radix UI',
  react: 'React',
  'react native': 'React Native',
  rest: 'REST API',
  'rest api': 'REST API',
  'rest apis': 'REST APIs',
  scss: 'SCSS',
  tailwind: 'Tailwind CSS',
  'tailwind css': 'Tailwind CSS',
  tanstack: 'TanStack Query',
  'tanstack query': 'TanStack Query',
  typescript: 'TypeScript',
};

const initialsForLabel = (label: string): string => {
  const words = label
    .replace(/[^a-zA-Z0-9+#. ]/g, ' ')
    .split(/\s+/)
    .map((word: string): string => word.trim())
    .filter(Boolean);
  if (words.length === 0) return 'T';
  const firstWord = words[0] ?? '';
  if (words.length === 1) return firstWord.slice(0, 2).toUpperCase();
  const secondWord = words[1] ?? '';
  return `${firstWord[0] ?? ''}${secondWord[0] ?? ''}`.toUpperCase();
};

const generatedTechnologyIconDataUrl = (
  label: string,
  style?: { background: string; foreground: string; label?: string }
): string => {
  const initials = style?.label ?? initialsForLabel(label);
  const background = style?.background ?? '#0f172a';
  const foreground = style?.foreground ?? '#f8fafc';
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">',
    `<rect width="48" height="48" rx="12" fill="${background}"/>`,
    `<text x="24" y="30" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="${initials.length > 2 ? 12 : 16}" font-weight="700" fill="${foreground}">`,
    initials,
    '</text>',
    '</svg>',
  ].join('');
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const normalizeFilemakerTechnologyIconKey = normalizeTechnologyKey;

export const resolveFilemakerTechnologyIconMatchLabel = (label: string): string | null => {
  const normalized = normalizeTechnologyKey(label);
  if (normalized.length === 0) return null;
  const padded = ` ${normalized} `;
  const match = Object.keys(TECHNOLOGY_ICON_STYLES)
    .sort((left: string, right: string): number => right.length - left.length)
    .find((key: string): boolean => normalized === key || padded.includes(` ${key} `));
  return match ?? null;
};

export const resolveFilemakerTechnologyDisplayLabel = (label: string): string => {
  const matchedKey = resolveFilemakerTechnologyIconMatchLabel(label);
  if (matchedKey === null) return label.trim();
  return TECHNOLOGY_DISPLAY_LABELS[matchedKey] ?? matchedKey;
};

export const hasFilemakerTechnologyIconDefinition = (label: string): boolean =>
  resolveFilemakerTechnologyIconMatchLabel(label) !== null;

export const resolveFilemakerTechnologyIconUrl = (
  label: string,
  configuredIconUrl?: string | null
): string => {
  const configured = configuredIconUrl?.trim() ?? '';
  if (configured.length > 0) return configured;
  const normalized = normalizeTechnologyKey(label);
  const matchedKey = resolveFilemakerTechnologyIconMatchLabel(label) ?? normalized;
  return generatedTechnologyIconDataUrl(label, TECHNOLOGY_ICON_STYLES[matchedKey]);
};
