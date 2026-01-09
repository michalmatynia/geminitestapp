"use client";

import { Button } from "@/components/ui/button";
import RichTextBlock from "./RichTextBlock";

interface Page {
  id: string;
  name: string;
  components: any[];
}

interface CmsSideMenuProps {
  page: Page;
  setPage: React.Dispatch<React.SetStateAction<Page | null>>;
}

export default function CmsSideMenu({ page, setPage }: CmsSideMenuProps) {
  const addComponent = (type: string) => {
    const newComponent = {
      type,
      content: {},
    };
    setPage({ ...page, components: [...page.components, newComponent] });
  };

  const handleContentChange = (index: number, content: any) => {
    const newComponents = [...page.components];
    newComponents[index].content = content;
    setPage({ ...page, components: newComponents });
  };

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
          {page.components.map((component, index) => {
            if (component.type === "RichText") {
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
