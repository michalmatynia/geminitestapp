'use client';
import * as Collapsible from '@radix-ui/react-collapsible';
import { ChevronDownIcon, ChevronRightIcon } from 'lucide-react';
import Link from 'next/link';
import { JSX, useState } from 'react';

import { Button } from '@/shared/ui';


export default function AdminDashboard(): JSX.Element {
  const [recentActivityOpen, setRecentActivityOpen] = useState(true);

  // useEffect(() => {
  //   const ws = new WebSocket("ws://localhost:3000");

  //   ws.onopen = () => {
  //     console.log("Connected to WebSocket server");
  //   };

  //   ws.onmessage = (event) => {
  //     const data: WebSocketData = JSON.parse(event.data as string) as WebSocketData;
  //     if (data.type === "connections") {
  //       setConnections(data.count);
  //     }
  //   };

  //   ws.onclose = () => {
  //     console.log("Disconnected from WebSocket server");
  //   };

  //   return () => {
  //     ws.close(1000, "User navigated away");
  //   };
  // }, []);

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <div className="space-y-4">
        <div className="rounded-lg bg-gray-950 p-6">
          <h2 className="text-xl font-bold mb-3">Quick Access</h2>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/admin/image-studio">Image Studio</Link>
            </Button>
          </div>
        </div>
        <Collapsible.Root
          open={recentActivityOpen}
          onOpenChange={setRecentActivityOpen}
          className="bg-gray-950 rounded-lg shadow-lg"
        >
          <Collapsible.Trigger className="flex items-center justify-between w-full p-6 cursor-pointer">
            <h2 className="text-xl font-bold">Recent Activity</h2>
            {recentActivityOpen ? (
              <ChevronDownIcon className="size-6" />
            ) : (
              <ChevronRightIcon className="size-6" />
            )}
          </Collapsible.Trigger>
          <Collapsible.Content className="p-6">
            <p>Placeholder for recent activity...</p>
          </Collapsible.Content>
        </Collapsible.Root>
      </div>
    </div>
  );
}
