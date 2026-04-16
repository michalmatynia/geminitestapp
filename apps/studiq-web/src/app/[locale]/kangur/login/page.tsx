import KangurAliasPlaceholder from '@/components/KangurAliasPlaceholder';

import type { JSX } from 'react';

export default function LocalizedKangurLoginPage(): JSX.Element {
  return (
    <KangurAliasPlaceholder
      title='Learner sign in'
      description='Login form wires to /api/kangur/auth/learner-signin via @kangur/api-client in the next phase.'
    />
  );
}
