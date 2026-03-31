import { FrontendCmsRouteLoadingFallback } from '@/features/kangur/public';

export default function Loading(): React.JSX.Element {
  return <FrontendCmsRouteLoadingFallback pathname={null} variant='preview' />;
}
