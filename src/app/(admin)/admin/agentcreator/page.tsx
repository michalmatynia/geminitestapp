import Link from "next/link";

export default function AgentCreatorPage() {
  return (
    <div className="container mx-auto py-10">
      <div className="rounded-lg bg-gray-950 p-6 shadow-lg">
        <h1 className="text-3xl font-bold text-white">Agent Creator</h1>
        <p className="mt-2 text-sm text-gray-400">
          Configure and monitor multi-step agent runs.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Link
            href="/admin/agentcreator/runs"
            className="rounded-md border border-gray-800 bg-gray-900 p-4 transition hover:border-gray-600"
          >
            <h2 className="text-lg font-semibold text-white">Agent Runs</h2>
            <p className="mt-1 text-sm text-gray-400">
              Review agent execution logs, snapshots, and plan details.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
