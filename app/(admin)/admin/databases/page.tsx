"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/data-table";
import { columns, DatabaseInfo } from "@/components/database-columns";
import { Button } from "@/components/ui/button";

async function getBackups(): Promise<DatabaseInfo[]> {
  const res = await fetch("/api/databases/backups");
  if (!res.ok) {
    throw new Error("Failed to fetch backups");
  }
  return res.json() as Promise<DatabaseInfo[]>;
}

export default function DatabasesPage() {
  const [data, setData] = useState<DatabaseInfo[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    void getBackups().then(setData);
  }, [refreshTrigger]);

  const handleSave = async () => {
    try {
      const res = await fetch("/api/databases/backup", {
        method: "POST",
      });
      if (res.ok) {
        alert("Database backed up successfully.");
        setRefreshTrigger((prev) => prev + 1);
      } else {
        alert("Failed to back up database.");
      }
    } catch (error) {
      console.error("Error backing up database:", error);
      alert("An error occurred during backup.");
    }
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Databases</h1>
        <Button onClick={() => { void handleSave(); }}>Save</Button>
      </div>
      <div className="rounded-lg bg-gray-950 p-6 shadow-lg">
        <DataTable columns={columns} data={data} />
      </div>
    </div>
  );
}