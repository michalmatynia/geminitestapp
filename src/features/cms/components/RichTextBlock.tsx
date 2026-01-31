"use client";




export interface RichTextContent {
  heading?: string;
  text?: string;
  buttonText?: string;
  buttonLink?: string;
}

interface RichTextBlockProps {
  content: RichTextContent;
  onChange: (content: RichTextContent) => void;
}

export default function RichTextBlock({ content, onChange }: RichTextBlockProps): React.JSX.Element {
  return (
    <div className="p-4 border rounded-lg">
      <h4 className="font-bold mb-2">Rich Text</h4>
      <div className="space-y-4">
        <div>
          <Label className="block mb-1">Heading</Label>
          <Input
            value={content.heading || ""}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...content, heading: e.target.value })}
          />
        </div>
        <div>
          <Label className="block mb-1">Text</Label>
          <Textarea
            value={content.text || ""}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange({ ...content, text: e.target.value })}
          />
        </div>
        <div>
          <Label className="block mb-1">Button Text</Label>
          <Input
            value={content.buttonText || ""}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...content, buttonText: e.target.value })}
          />
        </div>
        <div>
          <Label className="block mb-1">Button Link</Label>
          <Input
            value={content.buttonLink || ""}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...content, buttonLink: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
import { Input, Textarea, Label } from "@/shared/ui";
