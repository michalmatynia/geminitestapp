"use client";





import { Input, Label, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui";
import type { AiNode, HttpConfig, NodeConfig } from "@/features/ai-paths/lib";

type HttpNodeConfigSectionProps = {
  selectedNode: AiNode;
  updateSelectedNodeConfig: (patch: Partial<NodeConfig>) => void;
};

export function HttpNodeConfigSection({
  selectedNode,
  updateSelectedNodeConfig,
}: HttpNodeConfigSectionProps): React.JSX.Element | null {
  if (selectedNode.type !== "http") return null;

  const httpConfig: HttpConfig = selectedNode.config?.http ?? {
    url: "",
    method: "GET",
    headers: "{\n  \"Content-Type\": \"application/json\"\n}",
    bodyTemplate: "",
    responseMode: "json",
    responsePath: "",
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs text-gray-400">URL</Label>
        <Input
          className="mt-2 w-full rounded-md border border-border bg-card/70 text-sm text-white"
          value={httpConfig.url}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
            updateSelectedNodeConfig({
              http: { ...httpConfig, url: event.target.value },
            })
          }
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs text-gray-400">Method</Label>
          <Select
            value={httpConfig.method}
            onValueChange={(value: string): void =>
              updateSelectedNodeConfig({
                http: { ...httpConfig, method: value as HttpConfig["method"] },
              })
            }
          >
            <SelectTrigger className="mt-2 w-full border-border bg-card/70 text-sm text-white">
              <SelectValue placeholder="Select method" />
            </SelectTrigger>
            <SelectContent className="border-border bg-gray-900">
              <SelectItem value="GET">GET</SelectItem>
              <SelectItem value="POST">POST</SelectItem>
              <SelectItem value="PUT">PUT</SelectItem>
              <SelectItem value="PATCH">PATCH</SelectItem>
              <SelectItem value="DELETE">DELETE</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-gray-400">Response Mode</Label>
          <Select
            value={httpConfig.responseMode}
            onValueChange={(value: string): void =>
              updateSelectedNodeConfig({
                http: {
                  ...httpConfig,
                  responseMode: value as HttpConfig["responseMode"],
                },
              })
            }
          >
            <SelectTrigger className="mt-2 w-full border-border bg-card/70 text-sm text-white">
              <SelectValue placeholder="Select mode" />
            </SelectTrigger>
            <SelectContent className="border-border bg-gray-900">
              <SelectItem value="json">JSON</SelectItem>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="status">Status only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label className="text-xs text-gray-400">Headers (JSON)</Label>
        <Textarea
          className="mt-2 min-h-[90px] w-full rounded-md border border-border bg-card/70 text-sm text-white"
          value={httpConfig.headers}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
            updateSelectedNodeConfig({
              http: { ...httpConfig, headers: event.target.value },
            })
          }
        />
      </div>
      <div>
        <Label className="text-xs text-gray-400">Body Template</Label>
        <Textarea
          className="mt-2 min-h-[110px] w-full rounded-md border border-border bg-card/70 text-sm text-white"
          value={httpConfig.bodyTemplate}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
            updateSelectedNodeConfig({
              http: { ...httpConfig, bodyTemplate: event.target.value },
            })
          }
        />
      </div>
      <div>
        <Label className="text-xs text-gray-400">Response Path</Label>
        <Input
          className="mt-2 w-full rounded-md border border-border bg-card/70 text-sm text-white"
          value={httpConfig.responsePath}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
            updateSelectedNodeConfig({
              http: { ...httpConfig, responsePath: event.target.value },
            })
          }
        />
        <p className="mt-2 text-[11px] text-gray-500">
          Optional JSON path to extract a field from the response.
        </p>
      </div>
    </div>
  );
}
