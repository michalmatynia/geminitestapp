import { JSX } from 'react';

import { NavigationCard, NavigationCardGrid, PageLayout } from '@/shared/ui';

export default function AgentCreatorPage(): JSX.Element {
  const cards = [
    {
      href: '/admin/agentcreator/teaching',
      title: 'Learner Agents',
      description: 'Build embedding collections and connect them to learner agents.',
    },
    {
      href: '/admin/agentcreator/runs',
      title: 'Agent Runs',
      description: 'Monitor browser automation runs and inspect snapshots.',
    },
    {
      href: '/admin/agentcreator/personas',
      title: 'Agent Personas',
      description: 'Define the reasoning stack for each agent model role.',
    },
  ];

  return (
    <PageLayout title='Agent Creator' description='Configure and monitor multi-step agent runs.'>
      <section aria-labelledby='agent-creator-sections-heading' className='space-y-4'>
        <h2 id='agent-creator-sections-heading' className='text-lg font-semibold tracking-tight'>
          Agent Creator sections
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
