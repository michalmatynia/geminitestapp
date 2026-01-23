"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DraftList } from "./components/DraftList";
import { DraftCreator } from "./components/DraftCreator";

export default function DraftsPage() {
  const [activeTab, setActiveTab] = useState("list");
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleEdit = (id: string) => {
    setEditingDraftId(id);
    setActiveTab("creator");
  };

  const handleCreateNew = () => {
    setEditingDraftId(null);
    setActiveTab("creator");
  };

  const handleSaveSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
    setEditingDraftId(null);
    setActiveTab("list");
  };

  const handleCancelEdit = () => {
    setEditingDraftId(null);
    setActiveTab("list");
  };

  return (
    <div className="container mx-auto py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white">Product Drafts</h1>
        <p className="mt-2 text-sm text-gray-400">
          Create reusable templates for products with pre-filled values
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="list">Draft List</TabsTrigger>
          <TabsTrigger value="creator">
            {editingDraftId ? "Edit Draft" : "Create Draft"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-0">
          <DraftList
            onEdit={handleEdit}
            onCreateNew={handleCreateNew}
            refreshTrigger={refreshTrigger}
          />
        </TabsContent>

        <TabsContent value="creator" className="mt-0">
          <DraftCreator
            draftId={editingDraftId}
            onSaveSuccess={handleSaveSuccess}
            onCancel={handleCancelEdit}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
