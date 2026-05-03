export type RobotsRule = {
  allow: boolean;
  pattern: string;
};

export type RobotsGroup = {
  userAgents: string[];
  rules: RobotsRule[];
  crawlDelaySeconds: number | null;
};

export type RobotsTxt = {
  groups: RobotsGroup[];
  sitemaps: string[];
};

const normalizeUserAgent = (value: string): string => value.trim().toLowerCase();

export const parseRobotsTxt = (text: string): RobotsTxt => {
  const groups: RobotsGroup[] = [];
  const sitemaps: string[] = [];
  let current: RobotsGroup | null = null;
  let previousDirective: string | null = null;

  const lines = text.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) continue;
    const colonIndex = line.indexOf(':');
    if (colonIndex < 0) continue;
    const directive = line.slice(0, colonIndex).trim().toLowerCase();
    const value = line.slice(colonIndex + 1).trim();

    if (directive === 'user-agent') {
      if (current && previousDirective !== 'user-agent') {
        groups.push(current);
        current = null;
      }
      if (!current) current = { userAgents: [], rules: [], crawlDelaySeconds: null };
      current.userAgents.push(normalizeUserAgent(value));
      previousDirective = 'user-agent';
      continue;
    }

    if (directive === 'sitemap') {
      sitemaps.push(value);
      previousDirective = directive;
      continue;
    }

    if (!current) {
      current = { userAgents: ['*'], rules: [], crawlDelaySeconds: null };
    }

    if (directive === 'allow' || directive === 'disallow') {
      current.rules.push({ allow: directive === 'allow', pattern: value });
    } else if (directive === 'crawl-delay') {
      const parsed = Number(value);
      if (Number.isFinite(parsed) && parsed >= 0) current.crawlDelaySeconds = parsed;
    }
    previousDirective = directive;
  }
  if (current) groups.push(current);

  return { groups, sitemaps };
};

const escapeForRegex = (value: string): string => value.replace(/[.+?^${}()|[\]\\]/g, '\\$&');

const compilePattern = (pattern: string): RegExp => {
  const trimmed = pattern.trim();
  if (trimmed.length === 0) return /^$/;
  let source = '^';
  for (let i = 0; i < trimmed.length; i += 1) {
    const ch = trimmed[i];
    if (ch === '*') source += '.*';
    else if (ch === '$' && i === trimmed.length - 1) source += '$';
    else source += escapeForRegex(ch!);
  }
  return new RegExp(source);
};

const selectGroup = (robots: RobotsTxt, userAgent: string): RobotsGroup | null => {
  const normalized = userAgent.toLowerCase();
  let best: RobotsGroup | null = null;
  let bestScore = -1;
  for (const group of robots.groups) {
    for (const agent of group.userAgents) {
      if (agent === '*') {
        if (bestScore < 0) {
          best = group;
          bestScore = 0;
        }
        continue;
      }
      if (normalized.includes(agent) && agent.length > bestScore) {
        best = group;
        bestScore = agent.length;
      }
    }
  }
  return best;
};

export const isAllowed = (
  robots: RobotsTxt,
  userAgent: string,
  path: string
): boolean => {
  const group = selectGroup(robots, userAgent);
  if (!group) return true;
  let bestMatch: { allow: boolean; length: number } | null = null;
  for (const rule of group.rules) {
    if (rule.pattern.length === 0) {
      if (!rule.allow) continue;
      if (!bestMatch || bestMatch.length < 0) bestMatch = { allow: true, length: 0 };
      continue;
    }
    const regex = compilePattern(rule.pattern);
    if (regex.test(path)) {
      const score = rule.pattern.length;
      if (!bestMatch || score > bestMatch.length) {
        bestMatch = { allow: rule.allow, length: score };
      }
    }
  }
  return bestMatch ? bestMatch.allow : true;
};

export const crawlDelaySecondsFor = (robots: RobotsTxt, userAgent: string): number | null => {
  const group = selectGroup(robots, userAgent);
  return group?.crawlDelaySeconds ?? null;
};
