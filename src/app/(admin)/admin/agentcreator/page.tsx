import Link from 'next/link';
import { JSX } from 'react';

import { Card, CardHeader, CardDescription } from '@/shared/ui/card';
import { PageLayout } from '@/shared/ui/PageLayout';

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
        <div className='grid gap-4 md:grid-cols-3'>
          {cards.map((card) => (
            <Link key={card.href} href={card.href}>
              <Card className='h-full transition hover:border-gray-600 hover:bg-white/5'>
                <CardHeader>
                  <div className='text-lg font-semibold leading-none tracking-tight'>
                    {card.title}
                  </div>
                  <CardDescription>{card.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </PageLayout>
  );
}
