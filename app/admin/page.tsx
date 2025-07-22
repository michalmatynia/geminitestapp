"use client";

import * as Collapsible from "@radix-ui/react-collapsible";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { getConnectionLogs } from "@/lib/api";
import { ConnectionLogType } from "@/lib/types";

interface WebSocketData {
  type: string;
  count: number;
}

export default function AdminDashboard() {
  const [connections, setConnections] = useState(0);
  const [logs, setLogs] = useState<ConnectionLogType[]>([]);
  const [liveConnectionsOpen, setLiveConnectionsOpen] = useState(true);
  const [recentActivityOpen, setRecentActivityOpen] = useState(true);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:3000");

    ws.onopen = () => {
      console.log("Connected to WebSocket server");
    };

    ws.onmessage = (event) => {
      const data: WebSocketData = JSON.parse(event.data as string) as WebSocketData;
      if (data.type === "connections") {
        setConnections(data.count);
        // Refresh logs when a new connection is made
        void getConnectionLogs().then(setLogs);
      }
    };

    ws.onclose = () => {
      console.log("Disconnected from WebSocket server");
    };

    // Initial fetch of logs
    void getConnectionLogs().then(setLogs);

    return () => {
      ws.close(1000, "User navigated away");
    };
  }, []);

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <div className="space-y-4">
        <Collapsible.Root
          open={liveConnectionsOpen}
          onOpenChange={setLiveConnectionsOpen}
          className="bg-gray-950 rounded-lg shadow-lg"
        >
          <Collapsible.Trigger className="flex items-center justify-between w-full p-6 cursor-pointer">
            <h2 className="text-xl font-bold">
              Live Connections: {connections}
            </h2>
            {liveConnectionsOpen ? (
              <ChevronDownIcon className="size-6" />
            ) : (
              <ChevronRightIcon className="size-6" />
            )}
          </Collapsible.Trigger>
          <Collapsible.Content className="p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>IP Address</TableHead>
                  <TableHead>User Agent</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Connected At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{log.ip}</TableCell>
                    <TableCell>{log.userAgent}</TableCell>
                    <TableCell>{log.language}</TableCell>
                    <TableCell>
                      {new Date(log.connectedAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Collapsible.Content>
        </Collapsible.Root>

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