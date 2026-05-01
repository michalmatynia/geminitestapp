import 'server-only';

import { createCancelRun } from './runtime-cancel';
import { createLaunchRun } from './runtime-launch';
import { createCampaignRuntimePersistence } from './runtime-persistence';
import { createProcessRun } from './runtime-process';
import type {
  FilemakerCampaignRuntimeDeps,
  FilemakerCampaignRuntimeService,
} from './runtime-types';

export const createCampaignRuntimeService = (
  deps: FilemakerCampaignRuntimeDeps
): FilemakerCampaignRuntimeService => {
  const persistence = createCampaignRuntimePersistence(deps);
  const launchRun = createLaunchRun({ deps, persistence });
  const processRun = createProcessRun({ deps, persistence });
  const cancelRun = createCancelRun({ deps, persistence });

  return {
    ...persistence,
    launchRun,
    processRun,
    cancelRun,
    launchCampaignRun: launchRun,
  };
};
