import { LoadingState } from '@/shared/ui/navigation-and-layout.public';

export default function Loading(): React.JSX.Element {
  return <LoadingState message='Loading database preview...' />;
}
