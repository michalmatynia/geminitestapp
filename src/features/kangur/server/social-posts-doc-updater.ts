import 'server-only';

import fs from 'fs/promises';

import { configurationError, operationFailedError } from '@/shared/errors/app-error';
import { resolveBrainExecutionConfigForCapability } from '@/shared/lib/ai-brain/server';
import { runBrainChatCompletion } from '@/shared/lib/ai-brain/server-runtime-client';
import {
  type KangurSocialDocUpdate,
  type KangurSocialDocUpdatePlan,
  type KangurSocialDocUpdateFilePlan,
  type KangurSocialDocUpdateItemPlan,
} from '@/shared/contracts/kangur-social-posts';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';
import { resolveKangurDocAbsolutePath } from './social-posts-docs';

const MAX_DIFF_LINES = 400;

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
  if (lines.length <= MAX_DIFF_LINES) {
    return { diff: lines.join('\n'), truncated: false };
  }
  const truncatedLines = lines.slice(0, MAX_DIFF_LINES);
  truncatedLines.push('… diff truncated …');
  return { diff: truncatedLines.join('\n'), truncated: true };
};

const buildDocPatchSystemPrompt = (basePrompt: string): string => {
  const lines = [
    basePrompt.trim(),
    'You are a documentation maintainer for StudiQ.',
    'Your task is to merge proposed updates into the existing documentation file.',
    'The user will provide the current file content and a list of proposed updates.',
    'Proposed updates include a section title (optional), proposed text, and a reason for the change.',
    'Output the ENTIRE updated file content in Markdown format.',
    'Preserve as much of the original file as possible, only applying the requested changes.',
    'If an update mentions a section that does not exist, find the most appropriate place to insert it or create the section.',
    'Ensure consistent formatting and tone.',
    'Return ONLY the updated file content, no explanations or additional commentary.',
  ].filter(Boolean);
  return lines.join('\n');
};

const buildDocPatchUserPrompt = (content: string, updates: KangurSocialDocUpdate[]): string => {
  const lines = [
    'Current file content:',
    '```markdown',
    content,
    '```',
    '',
    'Proposed updates:',
    ...updates.map((update, index) => {
      const parts = [`Update ${index + 1}:`];
      if (update.section) parts.push(`Section: ${update.section}`);
      parts.push(`Proposed text: ${update.proposedText}`);
      if (update.reason) parts.push(`Reason: ${update.reason}`);
      return parts.join('\n');
    }),
  ];
  return lines.join('\n');
};

async function patchDocFile(
  docPath: string,
  absolutePath: string,
  updates: KangurSocialDocUpdate[]
): Promise<KangurSocialDocUpdateFilePlan> {
  const startedAt = Date.now();
  let before = '';
  try {
    before = await fs.readFile(absolutePath, 'utf8');
  } catch (_error) {
    throw operationFailedError(`Failed to read documentation file at ${docPath}.`);
  }

  const brainConfig = await resolveBrainExecutionConfigForCapability(
    'kangur_social.doc_patching',
    {
      defaultTemperature: 0.1,
      defaultMaxTokens: 4000,
      runtimeKind: 'chat',
    }
  );

  const modelId = brainConfig.modelId.trim();
  if (!modelId) {
    throw configurationError(
      'StudiQ Social Doc Patching model is missing. Configure it in AI Brain.'
    );
  }

  const res = await runBrainChatCompletion({
    modelId,
    temperature: brainConfig.temperature,
    maxTokens: brainConfig.maxTokens,
    messages: [
      { role: 'system', content: buildDocPatchSystemPrompt(brainConfig.systemPrompt ?? '') },
      { role: 'user', content: buildDocPatchUserPrompt(before, updates) },
    ],
  });

  let after = res.text.trim();
  // Strip potential markdown code block wrappers if Brain included them
  if (after.startsWith('```markdown\n')) {
    after = after.slice('```markdown\n'.length);
  }
  if (after.endsWith('\n```')) {
    after = after.slice(0, -'\n```'.length);
  } else if (after.endsWith('```')) {
    after = after.slice(0, -'```'.length);
  }

  const { diff, truncated } = buildUnifiedDiff(before, after);

  await fs.writeFile(absolutePath, after, 'utf8');

  void ErrorSystem.logInfo('Documentation file patched', {
    service: 'kangur.social-posts.doc-updater',
    action: 'patchFile',
    docPath,
    durationMs: Date.now() - startedAt,
    modelId,
    updateCount: updates.length,
  });

  return {
    docPath,
    applied: true,
    diff,
    truncated,
    before,
    after,
  };
}

export async function applyKangurSocialDocUpdates(
  updates: KangurSocialDocUpdate[]
): Promise<KangurSocialDocUpdatePlan> {
  const startedAt = Date.now();
  const itemPlans: KangurSocialDocUpdateItemPlan[] = [];
  const filePlans: KangurSocialDocUpdateFilePlan[] = [];

  const updatesByFile = new Map<string, KangurSocialDocUpdate[]>();
  for (const update of updates) {
    const list = updatesByFile.get(update.docPath) ?? [];
    list.push(update);
    updatesByFile.set(update.docPath, list);
  }

  for (const [docPath, fileUpdates] of updatesByFile.entries()) {
    const absolutePath = resolveKangurDocAbsolutePath(docPath);
    if (!absolutePath) {
      fileUpdates.forEach((u) => {
        itemPlans.push({
          ...u,
          applied: false,
          skipReason: 'Invalid documentation path.',
        });
      });
      continue;
    }

    try {
      const filePlan = await patchDocFile(docPath, absolutePath, fileUpdates);
      filePlans.push(filePlan);
      fileUpdates.forEach((u) => {
        itemPlans.push({
          ...u,
          applied: true,
        });
      });
    } catch (error) {
      void ErrorSystem.captureException(error);
      fileUpdates.forEach((u) => {
        itemPlans.push({
          ...u,
          applied: false,
          skipReason: error instanceof Error ? error.message : 'Unknown error.',
        });
      });
    }
  }

  void ErrorSystem.logInfo('Kangur social doc updates applied', {
    service: 'kangur.social-posts.doc-updater',
    action: 'applyUpdates',
    durationMs: Date.now() - startedAt,
    totalUpdates: updates.length,
    appliedFiles: filePlans.length,
    appliedUpdates: itemPlans.filter((p) => p.applied).length,
  });

  return {
    items: itemPlans,
    files: filePlans,
  };
}
