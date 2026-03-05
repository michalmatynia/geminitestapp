import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const root = process.cwd();
const defaultTrackerPath = 'docs/migrations/stabilization-window-2026-04-17.md';
const gateCommand = ['npm', 'run', 'canonical:stabilization:check'];

const args = process.argv.slice(2);
const argMap = new Map();
for (const arg of args) {
  if (!arg.startsWith('--')) continue;
  const [key, value] = arg.split('=');
  argMap.set(key, value ?? 'true');
}

const trackerPath = argMap.get('--tracker') ?? defaultTrackerPath;
const targetDate = argMap.get('--date') ?? formatLocalDate(new Date());

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function runGate() {
  return new Promise((resolve) => {
    const child = spawn(gateCommand[0], gateCommand.slice(1), {
      cwd: root,
      env: {
        ...process.env,
        FORCE_COLOR: '0',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let output = '';

    const append = (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stdout.write(text);
    };

    child.stdout?.on('data', append);
    child.stderr?.on('data', append);

    child.on('close', (code, signal) => {
      resolve({
        code: typeof code === 'number' ? code : 1,
        signal,
        output,
      });
    });

    child.on('error', (error) => {
      const stack = error instanceof Error ? error.stack ?? error.message : String(error);
      output += `\n${stack}`;
      resolve({
        code: 1,
        signal: null,
        output,
      });
    });
  });
}

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parseStatusCell = ({ status, detail }) => {
  if (detail) return `${status} (${detail})`;
  return status;
};

const parseGateSummary = (output, gatePassed) => {
  const canonicalPassed = /\[canonical:check:sitewide\]\s+passed/i.test(output);
  const aiPassed = /\[ai-paths:check:canonical\]\s+passed/i.test(output);
  const obsPassed = /\[observability:v2:passed\]/i.test(output);

  const canonicalMatch = output.match(
    /\[canonical:check:sitewide\][\s\S]*?validated\s+(\d+)\s+runtime source file\(s\)\s+and\s+(\d+)\s+docs artifact\(s\)/i
  );
  const aiMatch = output.match(/\[ai-paths:check:canonical\][\s\S]*?scanned\s+(\d+)\s+source file\(s\)\s+under src\//i);
  const obsMatch = output.match(/\[observability:v2:(?:passed|failed)\][^\n]*legacyCompatViolations=(\d+)[^\n]*runtimeErrors=(\d+)/i);
  const generatedAtMatch = output.match(/"generatedAt"\s*:\s*"([^"]+)"/);

  const canonicalStatus = canonicalPassed ? 'pass' : 'fail';
  const aiStatus = aiPassed ? 'pass' : canonicalPassed ? 'fail' : 'not-run';
  const obsStatus = obsPassed ? 'pass' : canonicalPassed && aiPassed ? 'fail' : 'not-run';

  const canonicalCell = parseStatusCell({
    status: canonicalStatus,
    detail: canonicalMatch
      ? `\`${canonicalMatch[1]}\` runtime files, \`${canonicalMatch[2]}\` docs`
      : null,
  });

  const aiCell = parseStatusCell({
    status: aiStatus,
    detail: aiMatch ? `\`${aiMatch[1]}\` source files` : null,
  });

  const obsCell = parseStatusCell({
    status: obsStatus,
    detail: obsMatch ? `\`legacyCompatViolations=${obsMatch[1]}\`, \`runtimeErrors=${obsMatch[2]}\`` : null,
  });

  const refreshedAt = generatedAtMatch?.[1] ?? new Date().toISOString();
  const notes = gatePassed
    ? `Consolidated gate \`npm run canonical:stabilization:check\` passed (refreshed at \`${refreshedAt}\`).`
    : 'Consolidated gate `npm run canonical:stabilization:check` failed.';

  return { canonicalCell, aiCell, obsCell, notes };
};

const upsertRow = (markdown, date, row) => {
  const rowPattern = new RegExp(`^\\|\\s*${escapeRegExp(date)}\\s*\\|.*$`, 'm');
  if (rowPattern.test(markdown)) {
    return markdown.replace(rowPattern, row);
  }

  const completionHeading = '\n## Completion Rule';
  if (markdown.includes(completionHeading)) {
    return markdown.replace(completionHeading, `${row}\n${completionHeading}`);
  }

  return `${markdown.trimEnd()}\n${row}\n`;
};

async function main() {
  const gateResult = await runGate();
  const gatePassed = gateResult.code === 0;
  const summary = parseGateSummary(gateResult.output, gatePassed);

  const row = `| ${targetDate} | ${summary.canonicalCell} | ${summary.aiCell} | ${summary.obsCell} | ${summary.notes} |`;
  const absoluteTrackerPath = path.join(root, trackerPath);
  const current = await fs.readFile(absoluteTrackerPath, 'utf8');
  const next = upsertRow(current, targetDate, row);
  await fs.writeFile(absoluteTrackerPath, next, 'utf8');

  console.log(`\n[stabilization:track] tracker updated: ${trackerPath} (${targetDate})`);

  if (!gatePassed) {
    process.exitCode = gateResult.code || 1;
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(`[stabilization:track] failed: ${message}`);
  process.exit(1);
});
