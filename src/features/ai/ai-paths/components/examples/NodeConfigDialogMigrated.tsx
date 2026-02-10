'use client';

import { NodeConfigDialog } from '../node-config-dialog';

export type NodeConfigDialogMigratedProps = Record<string, never>;

export function NodeConfigDialogMigrated(
  _props: NodeConfigDialogMigratedProps
): React.JSX.Element | null {
  return <NodeConfigDialog />;
}
