"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import RichTextBlock from "./RichTextBlock";

interface Page {
  id: string;
  name: string;
  components: any[];
}

interface CmsSideMenuProps {
  page: Page | null;
  setPage: React.Dispatch<React.SetStateAction<Page | null>>;
}

export default function CmsSideMenu({ page, setPage }: CmsSideMenuProps) {
  const addComponent = (type: string) => {
    const newComponent = {
      type,
      content: {},
    };

    setPage((prev) => {
      if (!prev) return prev; // nothing to update yet
      return {
        ...prev,
        components: [...(prev.components ?? []), newComponent],
      };
    });
  };

  const handleContentChange = (index: number, content: any) => {
    setPage((prev) => {
      if (!prev) return prev;
      const nextComponents = [...(prev.components ?? [])];

      if (!nextComponents[index]) return prev; // out of range safety
      nextComponents[index] = {
        ...nextComponents[index],
        content,
      };

      return {
        ...prev,
        components: nextComponents,
      };
    });
  };

  if (!page) {
    return (
      <aside className="w-80 bg-gray-800 p-4">
        <h2 className="text-xl font-bold mb-4">Loading page…</h2>
        <p className="text-sm text-gray-300">
          Select a page or wait for data to load.
        </p>
      </aside>
    );
  }

  return (
    <aside className="w-80 bg-gray-800 p-4">
      <h2 className="text-xl font-bold mb-4">Editing: {page.name}</h2>

      <div className="space-y-4">
        <div>
          <h3 className="font-bold mb-2">Header</h3>
          {/* Header components will be listed here */}
        </div>

        <div>
          <h3 className="font-bold mb-2">Template</h3>

          {page.components?.map((component, index) => {
            if (component?.type === "RichText") {
              return (
                <RichTextBlock
                  key={index}
                  content={component.content}
                  onChange={(content) => handleContentChange(index, content)}
                />
              );
            }
            return null;
          })}

          <Button onClick={() => addComponent("RichText")}>Add Section</Button>
        </div>

        <div>
          <h3 className="font-bold mb-2">Footer</h3>
          {/* Footer components will be listed here */}
        </div>
      </div>
    </aside>
  );
}
