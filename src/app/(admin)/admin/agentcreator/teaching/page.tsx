import { JSX } from 'react';

import { NavigationCard, NavigationCardGrid, PageLayout } from '@/shared/ui/navigation-and-layout.public';

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
      <section aria-labelledby='learner-agents-sections-heading' className='space-y-4'>
        <h2 id='learner-agents-sections-heading' className='text-lg font-semibold tracking-tight'>
          Learner Agents sections
        </h2>
        <NavigationCardGrid className='md:grid-cols-3'>
          {cards.map((card) => (
            <NavigationCard
              key={card.href}
              href={card.href}
              title={card.title}
              description={card.description}
              className='hover:border-gray-600 hover:bg-white/5'
            />
          ))}
        </NavigationCardGrid>
      </section>
    </PageLayout>
  );
}
