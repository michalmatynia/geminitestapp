import 'server-only';

import fs from 'fs/promises';

import type {
  KangurSocialDocUpdate,
  KangurSocialDocUpdateFilePlan,
  KangurSocialDocUpdateItemPlan,
  KangurSocialDocUpdatePlan,
  KangurSocialPost,
} from '@/shared/contracts/kangur-social-posts';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';

import { resolveKangurDocAbsolutePath } from './social-posts-docs';

const MAX_DIFF_LINES = 400;
const FALLBACK_HEADING = '## Visual update notes';

const normalizeKey = (value: string): string => value.trim().toLowerCase();

const splitLines = (value: string): string[] => value.split(/\r?\n/);

const buildUnifiedDiff = (before: string, after: string): { diff: string; truncated: boolean } => {
  if (before === after) return { diff: '', truncated: false };
  const beforeLines = splitLines(before);
  const afterLines = splitLines(after);
  const rows = beforeLines.length;
  const cols = afterLines.length;
  const dp: number[][] = [];
  for (let row = 0; row <= rows; row += 1) {
    const rowValues: number[] = [];
    for (let col = 0; col <= cols; col += 1) {
      rowValues.push(0);
    }
    dp.push(rowValues);
  }

  for (let i = 1; i <= rows; i += 1) {
    for (let j = 1; j <= cols; j += 1) {
      if (beforeLines[i - 1] === afterLines[j - 1]) {
        dp[i]![j] = dp[i - 1]![j - 1]! + 1;
      } else {
        dp[i]![j] = Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!);
      }
    }
  }

  const ops: Array<{ type: ' ' | '+' | '-'; line: string }> = [];
  let i = rows;
  let j = cols;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && beforeLines[i - 1] === afterLines[j - 1]) {
      ops.push({ type: ' ', line: beforeLines[i - 1]! });
      i -= 1;
      j -= 1;
    } else if (j > 0 && (i === 0 || dp[i]![j - 1]! >= dp[i - 1]![j]!)) {
      ops.push({ type: '+', line: afterLines[j - 1]! });
      j -= 1;
    } else if (i > 0) {
      ops.push({ type: '-', line: beforeLines[i - 1]! });
      i -= 1;
    }
  }

  const lines = ops.reverse().map((op) => `${op.type}${op.line}`);
  const diffText = lines.join('\n');
  if (lines.length <= MAX_DIFF_LINES) {
    return { diff: diffText, truncated: false };
  }
  const truncatedLines = lines.slice(0, MAX_DIFF_LINES);
  truncatedLines.push('… diff truncated …');
  return { diff: truncatedLines.join('\n'), truncated: true };
};

const findSectionRange = (
  content: string,
  section: string
): { start: number; end: number } | null => {
  const normalizedTarget = normalizeKey(section);
  if (!normalizedTarget) return null;
  const headingRegex = /^#{1,6}\s+(.+)$/gm;
  const headings: Array<{ title: string; start: number; contentStart: number }> = [];
  let match: RegExpExecArray | null;
  while ((match = headingRegex.exec(content)) !== null) {
    const lineEnd = content.indexOf('\n', match.index);
    headings.push({
      title: match[1]?.trim() ?? '',
      start: match.index,
      contentStart: lineEnd >= 0 ? lineEnd + 1 : content.length,
    });
  }

  const matchIndex = headings.findIndex((heading) =>
    normalizeKey(heading.title).includes(normalizedTarget)
  );
  if (matchIndex < 0) return null;
  const start = headings[matchIndex]?.contentStart ?? 0;
  const end =
    matchIndex + 1 < headings.length
      ? headings[matchIndex + 1]?.start ?? content.length
      : content.length;
  return { start, end };
};

const appendToFallbackSection = (content: string, section: string | null, text: string): string => {
  const hasFallback = content.includes(FALLBACK_HEADING);
  let nextContent = content.trimEnd();
  if (!hasFallback) {
    nextContent = `${nextContent}\n\n${FALLBACK_HEADING}\n`;
  }
  if (section?.trim()) {
    nextContent = `${nextContent}\n### ${section.trim()}\n`;
  }
  return `${nextContent}\n${text.trim()}\n`;
};

const insertIntoSection = (content: string, range: { start: number; end: number }, text: string): string => {
  const before = content.slice(0, range.end).trimEnd();
  const after = content.slice(range.end).trimStart();
  const insertion = `\n\n${text.trim()}\n`;
  if (!after) {
    return `${before}${insertion}`;
  }
  return `${before}${insertion}\n${after}`;
};

const applySingleUpdate = (
  content: string,
  update: KangurSocialDocUpdate
): { nextContent: string; applied: boolean; skipReason?: string } => {
  const proposedText = update.proposedText?.trim() ?? '';
  if (!proposedText) {
    return { nextContent: content, applied: false, skipReason: 'empty_proposed_text' };
  }
  if (content.includes(proposedText)) {
    return { nextContent: content, applied: false, skipReason: 'already_present' };
  }
  const section = update.section?.trim() ?? '';
  if (!section) {
    return {
      nextContent: appendToFallbackSection(content, null, proposedText),
      applied: true,
    };
  }
  const range = findSectionRange(content, section);
  if (!range) {
    return {
      nextContent: appendToFallbackSection(content, section, proposedText),
      applied: true,
    };
  }
  return {
    nextContent: insertIntoSection(content, range, proposedText),
    applied: true,
  };
};

const normalizeUpdates = (updates: KangurSocialDocUpdate[]): KangurSocialDocUpdate[] =>
  updates.filter((update) => update.docPath?.trim() && update.proposedText?.trim());

export async function planKangurSocialDocUpdates(
  post: KangurSocialPost,
  options: { apply: boolean }
): Promise<KangurSocialDocUpdatePlan> {
  const updates = normalizeUpdates(post.visualDocUpdates ?? []);
  if (updates.length === 0) {
    return { items: [], files: [] };
  }

  const grouped = updates.reduce<Map<string, KangurSocialDocUpdate[]>>((acc, update) => {
    const key = update.docPath.trim();
    if (!acc.has(key)) acc.set(key, []);
    acc.get(key)!.push(update);
    return acc;
  }, new Map());

  const filePlans: KangurSocialDocUpdateFilePlan[] = [];
  const itemPlans: KangurSocialDocUpdateItemPlan[] = [];

  for (const [docPath, docUpdates] of grouped) {
    const absolutePath = resolveKangurDocAbsolutePath(docPath);
    if (!absolutePath) {
      docUpdates.forEach((update) => {
        itemPlans.push({
          docPath: update.docPath,
          section: update.section ?? null,
          proposedText: update.proposedText,
          applied: false,
          skipReason: 'invalid_doc_path',
        });
      });
      continue;
    }

    let before: string | null = null;
    try {
      before = await fs.readFile(absolutePath, 'utf8');
    } catch (error) {
      void ErrorSystem.captureException(error);
      docUpdates.forEach((update) => {
        itemPlans.push({
          docPath: update.docPath,
          section: update.section ?? null,
          proposedText: update.proposedText,
          applied: false,
          skipReason: 'doc_read_failed',
        });
      });
      continue;
    }

    let nextContent = before;
    const localItemPlans: KangurSocialDocUpdateItemPlan[] = [];
    docUpdates.forEach((update) => {
      const result = applySingleUpdate(nextContent, update);
      nextContent = result.nextContent;
      localItemPlans.push({
        docPath: update.docPath,
        section: update.section ?? null,
        proposedText: update.proposedText,
        applied: result.applied,
        ...(result.skipReason ? { skipReason: result.skipReason } : {}),
      });
    });

    const { diff, truncated } = buildUnifiedDiff(before, nextContent);
    let applied = before !== nextContent;
    let writeFailed = false;

    if (options.apply && applied) {
      try {
        await fs.writeFile(absolutePath, nextContent, 'utf8');
      } catch (error) {
        void ErrorSystem.captureException(error);
        writeFailed = true;
        applied = false;
      }
    }

    if (writeFailed) {
      localItemPlans.forEach((item) => {
        if (!item.applied) return;
        item.applied = false;
        item.skipReason = 'doc_write_failed';
      });
    }

    itemPlans.push(...localItemPlans);

    filePlans.push({
      docPath,
      applied,
      diff,
      truncated,
      before,
      after: nextContent,
    });
  }

  return {
    items: itemPlans,
    files: filePlans,
  };
}
