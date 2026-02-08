import Link from 'next/link';
import { JSX } from 'react';

export default function AgentTeachingLandingPage(): JSX.Element {
  return (
    <div className='container mx-auto py-10'>
      <div className='rounded-lg bg-gray-950 p-6 shadow-lg'>
        <h1 className='text-3xl font-bold text-white'>Learner Agents</h1>
        <p className='mt-2 text-sm text-gray-400'>
          Build knowledge bases (embeddings) and connect them to learner agents.
        </p>
        <div className='mt-6 grid gap-4 md:grid-cols-3'>
          <Link
            href='/admin/agentcreator/teaching/agents'
            className='rounded-md border border-gray-800 bg-gray-900 p-4 transition hover:border-gray-600'
          >
            <h2 className='text-lg font-semibold text-white'>Learner Agents</h2>
            <p className='mt-1 text-sm text-gray-400'>
              Create agents and connect them to embedding collections.
            </p>
          </Link>
          <Link
            href='/admin/agentcreator/teaching/collections'
            className='rounded-md border border-gray-800 bg-gray-900 p-4 transition hover:border-gray-600'
          >
            <h2 className='text-lg font-semibold text-white'>Embedding School</h2>
            <p className='mt-1 text-sm text-gray-400'>
              Store text + embedding vectors and manage documents.
            </p>
          </Link>
          <Link
            href='/admin/agentcreator/teaching/chat'
            className='rounded-md border border-gray-800 bg-gray-900 p-4 transition hover:border-gray-600'
          >
            <h2 className='text-lg font-semibold text-white'>Chat</h2>
            <p className='mt-1 text-sm text-gray-400'>
              Chat with a learner agent and inspect retrieved sources.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
