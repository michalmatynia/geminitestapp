import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const DOC_PATH = 'docs/kangur/recent-feature-updates.md';
const AUTO_START = '<!-- AUTO-GENERATED:RECENT_FEATURES_START -->';
const AUTO_END = '<!-- AUTO-GENERATED:RECENT_FEATURES_END -->';
const DEFAULT_WINDOW_DAYS = 14;
const MAX_TOP_PATHS = 8;
const MAX_COMMITS = 8;

const toIsoDate = (value: Date): string => value.toISOString().slice(0, 10);

const addDays = (value: Date, days: number): Date => {
  const next = new Date(value.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const parseArgValue = (flag: string): string | null => {
  const direct = process.argv.find((arg) => arg.startsWith(`${flag}=`));
  if (direct) {
    return direct.split('=')[1] ?? null;
  }
  const idx = process.argv.findIndex((arg) => arg === flag);
  if (idx >= 0 && process.argv[idx + 1]) {
    return process.argv[idx + 1] ?? null;
  }
  return null;
};

const resolveWindowDays = (): number => {
  const raw = parseArgValue('--window-days');
  if (!raw) return DEFAULT_WINDOW_DAYS;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_WINDOW_DAYS;
  return Math.floor(parsed);
};

const replaceFrontmatterValue = (content: string, key: string, value: string): string => {
  const pattern = new RegExp(`(${key}:\\s*')([^']*)(')`, 'm');
  if (!pattern.test(content)) {
    return content;
  }
  return content.replace(pattern, `$1${value}$3`);
};

const replaceWindowLine = (content: string, start: string, end: string): string => {
  const line = `This summary covers changes merged between ${start} and ${end} (inclusive).`;
  const pattern = /This summary covers changes merged between .*?\./;
  if (!pattern.test(content)) {
    return content;
  }
  return content.replace(pattern, line);
};

const bucketPath = (filepath: string): string => {
  const parts = filepath.split('/');
  if (parts[0] === 'src' && parts[1] === 'features' && parts[2] === 'kangur') {
    return parts.slice(0, 4).join('/');
  }
  if (parts[0] === 'src' && parts[1] === 'app' && parts[2] === 'api' && parts[3] === 'kangur') {
    return parts.slice(0, 5).join('/');
  }
  if (parts[0] === 'docs' && parts[1] === 'kangur') {
    return parts.slice(0, 2).join('/');
  }
  return parts.slice(0, 3).join('/');
};

const runGitLog = (since: string): string => {
  try {
    return execFileSync(
      'git',
      [
        'log',
        `--since=${since}`,
        '--date=short',
        '--name-only',
        '--pretty=format:%h|%ad|%s',
        '--',
        'src/features/kangur',
        'src/app/api/kangur',
        'docs/kangur',
      ],
      { encoding: 'utf8' }
    ).trim();
  } catch (error) {
    console.error('Failed to run git log.', error);
    return '';
  }
};

const parseGitLog = (raw: string): Array<{ hash: string; date: string; subject: string; files: string[] }> => {
  if (!raw) return [];
  const blocks = raw.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  return blocks
    .map((block) => {
      const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
      const header = lines[0] ?? '';
      const [hash, date, ...rest] = header.split('|');
      const subject = rest.join('|').trim();
      const files = lines.slice(1).filter(Boolean);
      if (!hash || !date) return null;
      return { hash, date, subject, files };
    })
    .filter((entry): entry is { hash: string; date: string; subject: string; files: string[] } => Boolean(entry));
};

const buildAutoBlock = (input: {
  start: string;
  end: string;
  generatedAt: string;
  commits: Array<{ hash: string; date: string; subject: string; files: string[] }>;
}): string => {
  const uniqueFiles = new Set<string>();
  const pathBuckets = new Map<string, Set<string>>();

  input.commits.forEach((commit) => {
    commit.files.forEach((file) => {
      uniqueFiles.add(file);
      const bucket = bucketPath(file);
      const bucketSet = pathBuckets.get(bucket) ?? new Set<string>();
      bucketSet.add(file);
      pathBuckets.set(bucket, bucketSet);
    });
  });

  const topPaths = [...pathBuckets.entries()]
    .map(([bucket, files]) => ({ bucket, count: files.size }))
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_TOP_PATHS)
    .map((entry) => entry);

  const lines: string[] = [
    AUTO_START,
    `Generated at ${input.generatedAt} UTC.`,
    '',
    `Window (UTC): ${input.start} to ${input.end}.`,
    `Commits scanned: ${input.commits.length}.`,
    `Files touched: ${uniqueFiles.size}.`,
    '',
  ];

  if (topPaths.length > 0) {
    lines.push('Top paths:');
    topPaths.forEach((entry) => {
      lines.push(`- Top path: \`${entry.bucket}\` (${entry.count} files)`);
    });
    lines.push('');
  }

  if (input.commits.length > 0) {
    lines.push('Latest commits:');
    input.commits.slice(0, MAX_COMMITS).forEach((commit) => {
      const subject = commit.subject ? ` ${commit.subject}` : '';
      lines.push(`- Commit: \`${commit.hash}\` (${commit.date})${subject}`);
    });
    lines.push('');
  } else {
    lines.push('No commits detected for the current window.');
    lines.push('');
  }

  lines.push(AUTO_END);

  return lines.join('\n');
};

const replaceAutoSection = (content: string, block: string): string => {
  const startIndex = content.indexOf(AUTO_START);
  const endIndex = content.indexOf(AUTO_END);
  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    return `${content.trimEnd()}\n\n${block}\n`;
  }

  const before = content.slice(0, startIndex).trimEnd();
  const after = content.slice(endIndex + AUTO_END.length).trimStart();
  return `${before}\n\n${block}\n\n${after}`;
};

const run = async (): Promise<void> => {
  const windowDays = resolveWindowDays();
  const now = new Date();
  const end = toIsoDate(now);
  const start = toIsoDate(addDays(now, -(windowDays - 1)));

  const absolutePath = path.resolve(process.cwd(), DOC_PATH);
  const raw = await fs.readFile(absolutePath, 'utf8');

  let next = replaceFrontmatterValue(raw, 'last_reviewed', end);
  next = replaceWindowLine(next, start, end);

  const gitLog = runGitLog(start);
  const commits = parseGitLog(gitLog);
  const autoBlock = buildAutoBlock({
    start,
    end,
    generatedAt: now.toISOString(),
    commits,
  });
  next = replaceAutoSection(next, autoBlock);

  await fs.writeFile(absolutePath, next, 'utf8');
  console.log(`Refreshed ${DOC_PATH} for window ${start} to ${end}.`);
};

run().catch((error) => {
  console.error('Failed to refresh recent features doc.', error);
  process.exitCode = 1;
});
