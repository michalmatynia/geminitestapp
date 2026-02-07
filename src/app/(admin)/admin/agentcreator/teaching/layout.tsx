import { JSX, ReactNode } from 'react';

import { AgentTeachingProvider } from '@/features/ai/agentcreator/teaching/context/AgentTeachingContext';

export default function AgentTeachingLayout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <AgentTeachingProvider>
      {children}
    </AgentTeachingProvider>
  );
}
