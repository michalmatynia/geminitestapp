"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface RichTextBlockProps {
  content: {
    heading?: string;
    text?: string;
    buttonText?: string;
    buttonLink?: string;
  };
  onChange: (content: any) => void;
}

export default function RichTextBlock({ content, onChange }: RichTextBlockProps) {
  return (
    <div className="p-4 border border-gray-700 rounded-lg">
      <h4 className="font-bold mb-2">Rich Text</h4>
      <div className="space-y-4">
        <div>
          <label className="block mb-1">Heading</label>
          <Input
            value={content.heading || ""}
            onChange={(e) => onChange({ ...content, heading: e.target.value })}
          />
        </div>
        <div>
          <label className="block mb-1">Text</label>
          <Textarea
            value={content.text || ""}
            onChange={(e) => onChange({ ...content, text: e.target.value })}
          />
        </div>
        <div>
          <label className="block mb-1">Button Text</label>
          <Input
            value={content.buttonText || ""}
            onChange={(e) => onChange({ ...content, buttonText: e.target.value })}
          />
        </div>
        <div>
          <label className="block mb-1">Button Link</label>
          <Input
            value={content.buttonLink || ""}
            onChange={(e) => onChange({ ...content, buttonLink: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
