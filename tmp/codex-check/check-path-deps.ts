import fs from 'node:fs';
import { inspectPathDependencies } from '@/features/ai/ai-paths/lib';
const cfg = JSON.parse(fs.readFileSync('tmp/codex-check/path_65mv2p_after_fix.json','utf8'));
const nodes = cfg?.path ? JSON.parse(fs.readFileSync('tmp/codex-check/path_65mv2p_config_live_after.json','utf8'))?.nodes : [];
