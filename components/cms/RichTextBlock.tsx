"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

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
          <Label className="block mb-1">Heading</Label>
          <Input
            value={content.heading || ""}
            onChange={(e) => onChange({ ...content, heading: e.target.value })}
          />
        </div>
        <div>
          <Label className="block mb-1">Text</Label>
          <Textarea
            value={content.text || ""}
            onChange={(e) => onChange({ ...content, text: e.target.value })}
          />
        </div>
        <div>
          <Label className="block mb-1">Button Text</Label>
          <Input
            value={content.buttonText || ""}
            onChange={(e) => onChange({ ...content, buttonText: e.target.value })}
          />
        </div>
        <div>
          <Label className="block mb-1">Button Link</Label>
          <Input
            value={content.buttonLink || ""}
            onChange={(e) => onChange({ ...content, buttonLink: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
