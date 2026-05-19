import { afterEach, describe, expect, it } from 'vitest';

import { getFederatedObservabilityApplicationIds } from './application-log-databases';

const FEDERATED_APPLICATION_IDS_ENV = 'OBSERVABILITY_FEDERATED_APPLICATION_IDS';
const DISABLED_APPLICATION_IDS_ENV = 'OBSERVABILITY_DISABLED_APPLICATION_IDS';

describe('application-log-databases', () => {
  afterEach(() => {
    delete process.env[FEDERATED_APPLICATION_IDS_ENV];
    delete process.env[DISABLED_APPLICATION_IDS_ENV];
  });

  it('returns all known observability applications by default', () => {
    expect(getFederatedObservabilityApplicationIds()).toEqual([
      'geminitestapp',
      'studiq',
      'cms-builder',
      'stargater',
      'arch',
    ]);
  });

  it('limits unfiltered federated reads to the enabled application ids', () => {
    process.env[FEDERATED_APPLICATION_IDS_ENV] = 'geminitestapp, stargater arch-web unknown';

    expect(getFederatedObservabilityApplicationIds()).toEqual([
      'geminitestapp',
      'stargater',
      'arch',
    ]);
  });

  it('removes disabled application ids when no enabled list is configured', () => {
    process.env[DISABLED_APPLICATION_IDS_ENV] = 'arch cms-builder';

    expect(getFederatedObservabilityApplicationIds()).toEqual([
      'geminitestapp',
      'studiq',
      'stargater',
    ]);
  });

  it('filters configured ids against a route-specific default set', () => {
    process.env[FEDERATED_APPLICATION_IDS_ENV] = 'geminitestapp,arch';

    expect(getFederatedObservabilityApplicationIds(['geminitestapp', 'stargater'])).toEqual([
      'geminitestapp',
    ]);
  });
});
