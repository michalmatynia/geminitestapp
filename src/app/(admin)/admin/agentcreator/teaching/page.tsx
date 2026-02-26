import Link from 'next/link';
import { JSX } from 'react';

import {
  PageLayout,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/shared/ui';

export default function AgentTeachingLandingPage(): JSX.Element {
  const cards = [
    {
      href: '/admin/agentcreator/teaching/agents',
      title: 'Learner Agents',
      description: 'Create agents and connect them to embedding collections.',
    },
    {
      href: '/admin/agentcreator/teaching/collections',
      title: 'Embedding School',
      description: 'Store text + embedding vectors and manage documents.',
    },
    {
      href: '/admin/agentcreator/teaching/chat',
      title: 'Chat',
      description: 'Chat with a learner agent and inspect retrieved sources.',
    },
  ];

  return (
    <PageLayout
      title='Learner Agents'
      description='Build knowledge bases (embeddings) and connect them to learner agents.'
    >
      <div className='grid gap-4 md:grid-cols-3'>
        {cards.map((card) => (
          <Link key={card.href} href={card.href}>
            <Card className='h-full transition hover:border-gray-600 hover:bg-white/5'>
              <CardHeader>
                <CardTitle className='text-lg'>{card.title}</CardTitle>
                <CardDescription>{card.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </PageLayout>
  );
}
