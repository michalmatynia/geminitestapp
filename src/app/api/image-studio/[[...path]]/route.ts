
import type { NextRequest } from 'next/server';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import {
  handleCatchAllRequest,
  getPathSegments,
  type CatchAllRouteDefinition as RouteDefinition,
  type CatchAllRoutePathParams as RouteParams,
  type CatchAllRoutePatternToken as PatternToken,
} from '@/shared/lib/api/catch-all-router';

import * as cardsBackfill from '../cards/backfill/route-handler';
import * as composite from '../composite/route-handler';
import * as maskAi from '../mask/ai/route-handler';
import * as models from '../models/route-handler';
import * as promptExtract from '../prompt-extract/route-handler';
import * as run from '../run/route-handler';
import * as runsIndex from '../runs/route-handler';
import * as runById from '../runs/[runId]/route-handler';
import * as runStream from '../runs/[runId]/stream/route-handler';
import * as sequencesIndex from '../sequences/route-handler';
import * as sequencesRun from '../sequences/run/route-handler';
import * as sequenceById from '../sequences/[runId]/route-handler';
import * as sequenceStream from '../sequences/[runId]/stream/route-handler';
import * as sequenceCancel from '../sequences/[runId]/cancel/route-handler';
import * as slotsBase64 from '../slots/base64/route-handler';
import * as slotById from '../slots/[slotId]/route-handler';
import * as slotAnalysis from '../slots/[slotId]/analysis/route-handler';
import * as slotAutoscale from '../slots/[slotId]/autoscale/route-handler';
import * as slotCenter from '../slots/[slotId]/center/route-handler';
import * as slotCrop from '../slots/[slotId]/crop/route-handler';
import * as slotMasks from '../slots/[slotId]/masks/route-handler';
import * as slotScreenshot from '../slots/[slotId]/screenshot/route-handler';
import * as slotUpscale from '../slots/[slotId]/upscale/route-handler';
import * as projectsIndex from '../projects/route-handler';
import * as projectById from '../projects/[projectId]/route-handler';
import * as projectSlots from '../projects/[projectId]/slots/route-handler';
import * as projectSlotsEnsureFromUpload from '../projects/[projectId]/slots/ensure-from-upload/route-handler';
import * as projectAssets from '../projects/[projectId]/assets/route-handler';
import * as projectAssetsImport from '../projects/[projectId]/assets/import/route-handler';
import * as projectAssetsDelete from '../projects/[projectId]/assets/delete/route-handler';
import * as projectAssetsMove from '../projects/[projectId]/assets/move/route-handler';
import * as projectFolders from '../projects/[projectId]/folders/route-handler';
import * as projectVariantsDelete from '../projects/[projectId]/variants/delete/route-handler';
import * as uiExtractor from '../ui-extractor/route-handler';
import * as validationPatternsLearn from '../validation-patterns/learn/route-handler';

const param = (name: string): PatternToken => ({ param: name });

const ROUTES: RouteDefinition[] = [
  { pattern: ['cards', 'backfill'], module: cardsBackfill },
  { pattern: ['composite'], module: composite },
  { pattern: ['mask', 'ai'], module: maskAi },
  { pattern: ['models'], module: models },
  { pattern: ['prompt-extract'], module: promptExtract },
  { pattern: ['ui-extractor'], module: uiExtractor },
  { pattern: ['run'], module: run },
  { pattern: ['runs'], module: runsIndex },
  { pattern: ['runs', param('runId')], module: runById },
  { pattern: ['runs', param('runId'), 'stream'], module: runStream },
  { pattern: ['sequences'], module: sequencesIndex },
  { pattern: ['sequences', 'run'], module: sequencesRun },
  { pattern: ['sequences', param('runId'), 'stream'], module: sequenceStream },
  { pattern: ['sequences', param('runId'), 'cancel'], module: sequenceCancel },
  { pattern: ['sequences', param('runId')], module: sequenceById },
  { pattern: ['slots', 'base64'], module: slotsBase64 },
  { pattern: ['slots', param('slotId')], module: slotById },
  { pattern: ['slots', param('slotId'), 'analysis'], module: slotAnalysis },
  { pattern: ['slots', param('slotId'), 'autoscale'], module: slotAutoscale },
  { pattern: ['slots', param('slotId'), 'center'], module: slotCenter },
  { pattern: ['slots', param('slotId'), 'crop'], module: slotCrop },
  { pattern: ['slots', param('slotId'), 'masks'], module: slotMasks },
  { pattern: ['slots', param('slotId'), 'screenshot'], module: slotScreenshot },
  { pattern: ['slots', param('slotId'), 'upscale'], module: slotUpscale },
  { pattern: ['projects'], module: projectsIndex },
  { pattern: ['projects', param('projectId')], module: projectById },
  { pattern: ['projects', param('projectId'), 'slots'], module: projectSlots },
  { pattern: ['projects', param('projectId'), 'slots', 'ensure-from-upload'], module: projectSlotsEnsureFromUpload },
  { pattern: ['projects', param('projectId'), 'assets'], module: projectAssets },
  { pattern: ['projects', param('projectId'), 'assets', 'import'], module: projectAssetsImport },
  { pattern: ['projects', param('projectId'), 'assets', 'delete'], module: projectAssetsDelete },
  { pattern: ['projects', param('projectId'), 'assets', 'move'], module: projectAssetsMove },
  { pattern: ['projects', param('projectId'), 'folders'], module: projectFolders },
  { pattern: ['projects', param('projectId'), 'variants', 'delete'], module: projectVariantsDelete },
  { pattern: ['validation-patterns', 'learn'], module: validationPatternsLearn },
];

const BASE_PATH = '/api/image-studio';
const SOURCE_BASE = 'image-studio';

const ROUTER_OPTIONS = {
  successLogging: 'off',
  requireCsrf: false,
  resolveSessionUser: false,
  rateLimitKey: false,
} as const;

export const GET = apiHandlerWithParams<RouteParams>(
  (request: NextRequest) =>
    handleCatchAllRequest('GET', request, getPathSegments(request, BASE_PATH), ROUTES, SOURCE_BASE),
  { ...ROUTER_OPTIONS, source: 'image-studio.[[...path]].GET', requireAuth: true }
);
export const POST = apiHandlerWithParams<RouteParams>(
  (request: NextRequest) =>
    handleCatchAllRequest('POST', request, getPathSegments(request, BASE_PATH), ROUTES, SOURCE_BASE),
  { ...ROUTER_OPTIONS, source: 'image-studio.[[...path]].POST', requireAuth: true }
);
export const PUT = apiHandlerWithParams<RouteParams>(
  (request: NextRequest) =>
    handleCatchAllRequest('PUT', request, getPathSegments(request, BASE_PATH), ROUTES, SOURCE_BASE),
  { ...ROUTER_OPTIONS, source: 'image-studio.[[...path]].PUT', requireAuth: true }
);
export const PATCH = apiHandlerWithParams<RouteParams>(
  (request: NextRequest) =>
    handleCatchAllRequest('PATCH', request, getPathSegments(request, BASE_PATH), ROUTES, SOURCE_BASE),
  { ...ROUTER_OPTIONS, source: 'image-studio.[[...path]].PATCH', requireAuth: true }
);
export const DELETE = apiHandlerWithParams<RouteParams>(
  (request: NextRequest) =>
    handleCatchAllRequest('DELETE', request, getPathSegments(request, BASE_PATH), ROUTES, SOURCE_BASE),
  { ...ROUTER_OPTIONS, source: 'image-studio.[[...path]].DELETE', requireAuth: true }
);
