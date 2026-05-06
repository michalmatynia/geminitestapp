import { useLocalSearchParams } from 'expo-router';
import {
  buildKangurHomeDebugProofViewModel,
  resolveKangurHomeDebugProofOperation,
  type KangurHomeDebugProofViewModel,
} from '../homeDebugProof';
import { type KangurScore } from '@kangur/contracts/kangur';
import { type KangurMobileOperationPerformance } from '../../scores/mobileScoreSummary';

export const createHomeDebugProofViewModel = (input: {
  isEnabled: boolean;
  isLoading: boolean;
  locale: 'pl' | 'en' | 'de';
  operation: string | null;
  recentResults: KangurScore[];
  strongestOperation: KangurMobileOperationPerformance | null;
  weakestOperation: KangurMobileOperationPerformance | null;
}): KangurHomeDebugProofViewModel | null =>
  input.operation !== null && input.operation !== ''
    ? buildKangurHomeDebugProofViewModel(input)
    : null;

function LiveHomeDebugProofOperationState({
  children,
}: {
  children: (debugProofOperation: string | null) => React.ReactNode;
}): React.JSX.Element {
  const params = useLocalSearchParams<{
    debugProofOperation?: string | string[];
  }>();

  return <>{children(resolveKangurHomeDebugProofOperation(params.debugProofOperation))}</>;
}

export function HomeDebugProofOperationState({
  children,
}: {
  children: (debugProofOperation: string | null) => React.ReactNode;
}): React.JSX.Element {
  if (!__DEV__) {
    return <>{children(null)}</>;
  }

  return <LiveHomeDebugProofOperationState>{children}</LiveHomeDebugProofOperationState>;
}
