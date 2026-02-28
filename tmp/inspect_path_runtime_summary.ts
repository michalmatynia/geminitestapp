import 'dotenv/config';
import { listAiPathsSettings } from '@/features/ai/ai-paths/server/settings-store';

const pathId = process.argv[2] ?? 'path_65mv2p';

async function main(): Promise<void> {
  const rows = await listAiPathsSettings();
  const rec = rows.find((r) => r.key === `ai_paths_config_${pathId}`);
  if (!rec) {
    console.log(JSON.stringify({ error: 'path_not_found', pathId }, null, 2));
    return;
  }

  const cfg = JSON.parse(rec.value) as Record<string, unknown>;
  const runtimeState =
    cfg.runtimeState && typeof cfg.runtimeState === 'object'
      ? (cfg.runtimeState as Record<string, unknown>)
      : null;
  if (!runtimeState) {
    console.log(JSON.stringify({ pathId, name: cfg.name ?? null, runtimeState: null }, null, 2));
    return;
  }

  const outputs =
    runtimeState.outputs && typeof runtimeState.outputs === 'object'
      ? (runtimeState.outputs as Record<string, Record<string, unknown>>)
      : {};
  const outputStatuses = Object.entries(outputs).map(([nodeId, value]) => {
    const status = value && typeof value === 'object' ? value['status'] : null;
    return { nodeId, status: typeof status === 'string' ? status : null };
  });

  const history =
    runtimeState.history && typeof runtimeState.history === 'object'
      ? (runtimeState.history as Record<string, Array<Record<string, unknown>>>)
      : {};
  const historySummary = Object.entries(history).map(([nodeId, entries]) => {
    const last = Array.isArray(entries) && entries.length > 0 ? entries[entries.length - 1] : null;
    const lastStatus = last && typeof last.status === 'string' ? last.status : null;
    const lastSkipReason = last && typeof last.skipReason === 'string' ? last.skipReason : null;
    return {
      nodeId,
      entries: Array.isArray(entries) ? entries.length : 0,
      lastStatus,
      lastSkipReason,
    };
  });

  console.log(
    JSON.stringify(
      {
        pathId,
        name: cfg.name ?? null,
        lastRunAt: cfg.lastRunAt ?? null,
        runCount: cfg.runCount ?? null,
        runId: runtimeState.runId ?? null,
        runStartedAt: runtimeState.runStartedAt ?? null,
        outputStatuses,
        historySummary,
      },
      null,
      2
    )
  );
}

void main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
