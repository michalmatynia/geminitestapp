import { type JSX, type ReactNode } from 'react';

import { AgentTeachingProvider } from '@/features/ai/public';

export default function AgentTeachingLayout({ children }: { children: ReactNode }): JSX.Element {
  return <AgentTeachingProvider>{children}</AgentTeachingProvider>;
}
