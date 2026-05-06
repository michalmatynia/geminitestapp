import {
  listAmazonSelectorRegistry,
  cloneAmazonSelectorRegistryProfile,
  deleteAmazonSelectorRegistryProfile,
  renameAmazonSelectorRegistryProfile,
  saveAmazonSelectorRegistryEntry,
  deleteAmazonSelectorRegistryEntry,
  syncAmazonSelectorRegistryFromCode,
} from '../amazon-selector-registry';

import {
  listTraderaSelectorRegistry,
  cloneTraderaSelectorRegistryProfile,
  deleteTraderaSelectorRegistryProfile,
  renameTraderaSelectorRegistryProfile,
  saveTraderaSelectorRegistryEntry,
  deleteTraderaSelectorRegistryEntry,
  syncTraderaSelectorRegistryFromCode,
} from '../tradera-selector-registry';

export const registryOrchestrator = {
  amazon: {
    list: listAmazonSelectorRegistry,
    clone: cloneAmazonSelectorRegistryProfile,
    deleteProfile: deleteAmazonSelectorRegistryProfile,
    rename: renameAmazonSelectorRegistryProfile,
    saveEntry: saveAmazonSelectorRegistryEntry,
    deleteEntry: deleteAmazonSelectorRegistryEntry,
    sync: syncAmazonSelectorRegistryFromCode,
  },
  tradera: {
    list: listTraderaSelectorRegistry,
    clone: cloneTraderaSelectorRegistryProfile,
    deleteProfile: deleteTraderaSelectorRegistryProfile,
    rename: renameTraderaSelectorRegistryProfile,
    saveEntry: saveTraderaSelectorRegistryEntry,
    deleteEntry: deleteTraderaSelectorRegistryEntry,
    sync: syncTraderaSelectorRegistryFromCode,
  },
};
