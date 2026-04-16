/*
 * StudiQ loading fallback
 *
 * Purpose: Provide a consistent loading fallback for Kangur frontend routes.
 * Accessibility notes:
 * - Keep the loading UI non-interactive and ensure it does not trap keyboard
 *   focus. Screen readers should be able to skip this element once content
 *   appears.
 */
import { FrontendRouteLoadingFallback } from '@/features/kangur/public';

export default function Loading(): React.JSX.Element {
  return <FrontendRouteLoadingFallback />;
}
