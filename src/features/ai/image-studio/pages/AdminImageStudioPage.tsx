"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Input, Label, SectionHeader, SectionPanel, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea, useToast } from "@/shared/ui";
import { cn } from "@/shared/utils";
import { Folder, Image as ImageIcon, MousePointer2, Pentagon, RefreshCcw, Settings, Upload } from "lucide-react";

import type { ImageFileRecord } from "@/shared/types/files";
import { extractParamsFromPrompt, flattenParams, inferParamSpecs, setDeepValue, validateImageStudioParams } from "../utils/prompt-params";
import type { ExtractParamsResult, ParamIssue, ParamLeaf, ParamSpec } from "../utils/prompt-params";
import { useSettingsMap, useUpdateSetting } from "@/shared/hooks/use-settings";
import { serializeSetting } from "@/shared/utils/settings-json";
import { defaultImageStudioSettings, IMAGE_STUDIO_SETTINGS_KEY, parseImageStudioSettings, type ImageStudioSettings } from "../utils/studio-settings";

type ToolMode = "select" | "polygon";

type Point = { x: number; y: number }; // normalized 0..1

type StudioProjectsResponse = { projects: string[] };
type StudioAssetsResponse = { assets: ImageFileRecord[] };

function safeJsonStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function buildAssetTree(projectId: string, assets: ImageFileRecord[]): TreeNode {
  const prefix = `/uploads/studio/${projectId}/`;
  const root: TreeNode = { id: "root", name: projectId || "Project", type: "folder", path: "", children: [] };

  const ensureFolder = (parent: TreeNode, folderName: string, folderPath: string): TreeNode => {
    const existing = parent.children.find((child) => child.type === "folder" && child.name === folderName);
    if (existing) return existing;
    const node: TreeNode = { id: `folder:${folderPath}`, name: folderName, type: "folder", path: folderPath, children: [] };
    parent.children.push(node);
    parent.children.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    return node;
  };

  assets.forEach((asset) => {
    if (!asset.filepath || !asset.filepath.startsWith(prefix)) return;
    const relative = asset.filepath.slice(prefix.length).replace(/^\/+/, "");
    const parts = relative.split("/").filter(Boolean);
    if (parts.length === 0) return;

    let cursor = root;
    for (let index = 0; index < parts.length; index += 1) {
      const part = parts[index]!;
      const isLast = index === parts.length - 1;

      if (isLast) {
        cursor.children.push({
          id: `file:${asset.id}`,
          name: part,
          type: "file",
          path: parts.slice(0, -1).join("/"),
          asset,
          children: [],
        });
        cursor.children.sort((a, b) => {
          if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
      } else {
        const nextFolderPath = parts.slice(0, index + 1).join("/");
        cursor = ensureFolder(cursor, part, nextFolderPath);
      }
    }
  });

  return root;
}

type TreeNode = {
  id: string;
  name: string;
  type: "folder" | "file";
  path: string; // folder path (relative inside project) for folders; parent folder path for files
  asset?: ImageFileRecord;
  children: TreeNode[];
};

function AssetTree({
  projectId,
  assets,
  selectedFolder,
  selectedAssetId,
  onSelectFolder,
  onSelectAsset,
}: {
  projectId: string;
  assets: ImageFileRecord[];
  selectedFolder: string;
  selectedAssetId: string | null;
  onSelectFolder: (folder: string) => void;
  onSelectAsset: (asset: ImageFileRecord) => void;
}): React.JSX.Element {
  const tree = useMemo(() => buildAssetTree(projectId, assets), [projectId, assets]);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(["root"]));

  useEffect(() => {
    setExpanded(new Set(["root"]));
  }, [projectId]);

  const toggle = useCallback((id: string): void => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const renderNode = (node: TreeNode, depth: number): React.JSX.Element | null => {
    if (node.type === "folder") {
      const isOpen = expanded.has(node.id);
      const isSelected = node.path === selectedFolder;
      return (
        <div key={node.id}>
          <button
            type="button"
            className={cn(
              "flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs",
              isSelected ? "bg-muted text-white" : "text-gray-200 hover:bg-muted/60"
            )}
            style={{ paddingLeft: 8 + depth * 10 }}
            onClick={() => onSelectFolder(node.path)}
            onDoubleClick={() => toggle(node.id)}
            title={node.path || "Project root"}
          >
            <span className="w-4 text-gray-400" onClick={(e) => { e.stopPropagation(); toggle(node.id); }}>
              {node.children.some((c) => c.type === "folder") || node.children.some((c) => c.type === "file") ? (
                <span className="inline-flex w-4 justify-center">{isOpen ? "▾" : "▸"}</span>
              ) : (
                <span className="inline-flex w-4 justify-center">•</span>
              )}
            </span>
            <Folder className="size-4 text-gray-400" />
            <span className="truncate">{node.name}</span>
          </button>
          {isOpen ? (
            <div>
              {node.children.map((child) => renderNode(child, depth + 1))}
            </div>
          ) : null}
        </div>
      );
    }

    const asset = node.asset;
    if (!asset) return null;
    const isSelected = asset.id === selectedAssetId;
    return (
      <button
        key={node.id}
        type="button"
        className={cn(
          "flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs",
          isSelected ? "bg-muted text-white" : "text-gray-200 hover:bg-muted/60"
        )}
        style={{ paddingLeft: 18 + depth * 10 }}
        onClick={() => onSelectAsset(asset)}
        title={asset.filepath}
      >
        <ImageIcon className="size-4 text-gray-400" />
        <span className="truncate">{asset.filename || node.name}</span>
      </button>
    );
  };

  return (
    <div className="h-full overflow-auto rounded border border-border bg-card/40 p-2">
      {renderNode(tree, 0)}
    </div>
  );
}

function MaskCanvas({
  src,
  tool,
  points,
  isClosed,
  onChange,
}: {
  src: string | null;
  tool: ToolMode;
  points: Point[];
  isClosed: boolean;
  onChange: (nextPoints: Point[], nextClosed: boolean) => void;
}): React.JSX.Element {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const draw = useCallback((): void => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (points.length === 0) return;
    const toPx = (p: Point): { x: number; y: number } => ({
      x: p.x * canvas.width,
      y: p.y * canvas.height,
    });

    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(56, 189, 248, 0.95)";
    ctx.fillStyle = "rgba(56, 189, 248, 0.15)";

    ctx.beginPath();
    const first = toPx(points[0]!);
    ctx.moveTo(first.x, first.y);
    points.slice(1).forEach((p) => {
      const px = toPx(p);
      ctx.lineTo(px.x, px.y);
    });
    if (isClosed && points.length >= 3) {
      ctx.closePath();
      ctx.fill();
    }
    ctx.stroke();

    points.forEach((p, index) => {
      const px = toPx(p);
      ctx.beginPath();
      ctx.arc(px.x, px.y, index === 0 ? 5 : 4, 0, Math.PI * 2);
      ctx.fillStyle = index === 0 ? "rgba(16, 185, 129, 0.95)" : "rgba(56, 189, 248, 0.95)";
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.stroke();
    });
  }, [points, isClosed]);

  const syncCanvasSize = useCallback((): void => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;
    const rect = img.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    draw();
  }, [draw]);

  useEffect(() => {
    syncCanvasSize();
  }, [syncCanvasSize, src, points.length, isClosed]);

  useEffect(() => {
    const onResize = (): void => syncCanvasSize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [syncCanvasSize]);

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>): void => {
      if (!src) return;
      if (tool !== "polygon") return;
      if (isClosed) return;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      const nextPoint: Point = {
        x: Math.min(1, Math.max(0, x)),
        y: Math.min(1, Math.max(0, y)),
      };

      if (points.length >= 3) {
        const first = points[0]!;
        const dx = (first.x - nextPoint.x) * rect.width;
        const dy = (first.y - nextPoint.y) * rect.height;
        const dist = Math.hypot(dx, dy);
        if (dist < 10) {
          onChange(points, true);
          return;
        }
      }

      onChange([...points, nextPoint], false);
    },
    [src, tool, isClosed, points, onChange]
  );

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded border border-border bg-black/20">
      {src ? (
        <>
          <img
            ref={imgRef}
            src={src}
            alt="Selected asset"
            className="max-h-full max-w-full select-none object-contain"
            onLoad={syncCanvasSize}
            draggable={false}
          />
          <canvas
            ref={canvasRef}
            className={cn(
              "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
              tool === "polygon" ? "cursor-crosshair" : "cursor-default"
            )}
            onClick={handleClick}
          />
        </>
      ) : (
        <div className="text-sm text-gray-400">Select an image asset to preview.</div>
      )}
    </div>
  );
}

export function AdminImageStudioPage(): React.JSX.Element {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const settingsQuery = useSettingsMap();
  const updateSetting = useUpdateSetting();
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [settingsLoaded, setSettingsLoaded] = useState<boolean>(false);
  const [studioSettings, setStudioSettings] = useState<ImageStudioSettings>(defaultImageStudioSettings);
  const [advancedOverridesText, setAdvancedOverridesText] = useState<string>(
    JSON.stringify(defaultImageStudioSettings.targetAi.openai.advanced_overrides ?? {}, null, 2)
  );
  const [advancedOverridesError, setAdvancedOverridesError] = useState<string | null>(null);

  const [projectId, setProjectId] = useState<string>("");
  const [newProjectId, setNewProjectId] = useState<string>("");
  const [selectedFolder, setSelectedFolder] = useState<string>("");
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  const [tool, setTool] = useState<ToolMode>("select");
  const [maskPoints, setMaskPoints] = useState<Point[]>([]);
  const [maskClosed, setMaskClosed] = useState<boolean>(false);

  const [promptText, setPromptText] = useState<string>("");
  const [extractResult, setExtractResult] = useState<ExtractParamsResult | null>(null);
  const [paramsState, setParamsState] = useState<Record<string, unknown> | null>(null);
  const [paramSpecs, setParamSpecs] = useState<Record<string, ParamSpec> | null>(null);
  const [promptSourceAtExtract, setPromptSourceAtExtract] = useState<string | null>(null);

  useEffect(() => {
    if (settingsLoaded) return;
    if (!settingsQuery.data) return;

    const stored = parseImageStudioSettings(settingsQuery.data.get(IMAGE_STUDIO_SETTINGS_KEY));
    const openaiModelFallback = settingsQuery.data.get("openai_model");

    const hydrated: ImageStudioSettings =
      openaiModelFallback && stored.targetAi.openai.model === defaultImageStudioSettings.targetAi.openai.model
        ? {
            ...stored,
            targetAi: {
              ...stored.targetAi,
              openai: {
                ...stored.targetAi.openai,
                model: openaiModelFallback,
              },
            },
          }
        : stored;

    setStudioSettings(hydrated);
    setAdvancedOverridesText(JSON.stringify(hydrated.targetAi.openai.advanced_overrides ?? {}, null, 2));
    setSettingsLoaded(true);
  }, [settingsLoaded, settingsQuery.data]);

  useEffect(() => {
    const saved = localStorage.getItem("imageStudio.projectId") ?? "";
    if (saved) setProjectId(saved);
  }, []);

  useEffect(() => {
    if (!projectId) return;
    localStorage.setItem("imageStudio.projectId", projectId);
  }, [projectId]);

  const projectsQuery = useQuery({
    queryKey: ["image-studio", "projects"],
    queryFn: async (): Promise<string[]> => {
      const res = await fetch("/api/image-studio/projects");
      if (!res.ok) throw new Error("Failed to load projects");
      const data = (await res.json()) as StudioProjectsResponse;
      return Array.isArray(data.projects) ? data.projects : [];
    },
    staleTime: 10_000,
  });

  const createProjectMutation = useMutation({
    mutationFn: async (id: string): Promise<string> => {
      const res = await fetch("/api/image-studio/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: id }),
      });
      const data = (await res.json().catch(() => null)) as { projectId?: string; error?: string } | null;
      if (!res.ok) throw new Error(data?.error || "Failed to create project");
      if (!data?.projectId) throw new Error("Invalid response");
      return data.projectId;
    },
    onSuccess: async (createdId: string): Promise<void> => {
      await queryClient.invalidateQueries({ queryKey: ["image-studio", "projects"] });
      setProjectId(createdId);
      setNewProjectId("");
      toast("Project created.", { variant: "success" });
    },
    onError: (error: unknown): void => {
      toast(error instanceof Error ? error.message : "Failed to create project.", { variant: "error" });
    },
  });

  const assetsQuery = useQuery({
    queryKey: ["image-studio", "assets", projectId],
    enabled: Boolean(projectId),
    queryFn: async (): Promise<ImageFileRecord[]> => {
      const res = await fetch(`/api/image-studio/projects/${encodeURIComponent(projectId)}/assets`);
      if (!res.ok) throw new Error("Failed to load assets");
      const data = (await res.json()) as StudioAssetsResponse;
      return Array.isArray(data.assets) ? data.assets : [];
    },
    staleTime: 5_000,
  });

  const uploadMutation = useMutation({
    mutationFn: async (payload: { files: File[]; folder: string }): Promise<void> => {
      if (!projectId) throw new Error("Select or create a project first.");
      const formData = new FormData();
      payload.files.forEach((file) => formData.append("files", file));
      if (payload.folder) {
        formData.set("folder", payload.folder);
      }
      const res = await fetch(`/api/image-studio/projects/${encodeURIComponent(projectId)}/assets`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "Upload failed");
      }
    },
    onSuccess: async (): Promise<void> => {
      await queryClient.invalidateQueries({ queryKey: ["image-studio", "assets", projectId] });
      await queryClient.invalidateQueries({ queryKey: ["image-studio", "projects"] });
      toast("Upload complete.", { variant: "success" });
    },
    onError: (error: unknown): void => {
      toast(error instanceof Error ? error.message : "Upload failed.", { variant: "error" });
    },
  });

  const assets = assetsQuery.data ?? [];

  const selectedAsset = useMemo(() => {
    if (!selectedAssetId) return null;
    return assets.find((a) => a.id === selectedAssetId) ?? null;
  }, [assets, selectedAssetId]);

  useEffect(() => {
    setMaskPoints([]);
    setMaskClosed(false);
  }, [selectedAssetId]);

  const handleSelectAsset = useCallback((asset: ImageFileRecord): void => {
    setSelectedAssetId(asset.id);
  }, []);

  const handleUploadInput = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
      const list = event.target.files;
      if (!list || list.length === 0) return;
      const files = Array.from(list);
      await uploadMutation.mutateAsync({ files, folder: selectedFolder });
      event.target.value = "";
    },
    [uploadMutation, selectedFolder]
  );

  const runProgrammaticExtraction = useCallback((): void => {
    const result = extractParamsFromPrompt(promptText);
    setExtractResult(result);
    if (!result.ok) {
      setParamsState(null);
      setParamSpecs(null);
      setPromptSourceAtExtract(null);
      toast(result.error, { variant: "error" });
      return;
    }
    setParamsState(result.params);
    setParamSpecs(inferParamSpecs(result.params, result.rawObjectText));
    setPromptSourceAtExtract(promptText);
    toast("Params extracted.", { variant: "success" });
  }, [promptText, toast]);

  const handleAdvancedOverridesChange = useCallback((raw: string): void => {
    setAdvancedOverridesText(raw);
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed === null) {
        setAdvancedOverridesError(null);
        setStudioSettings((prev) => ({
          ...prev,
          targetAi: { ...prev.targetAi, openai: { ...prev.targetAi.openai, advanced_overrides: null } },
        }));
        return;
      }
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        setAdvancedOverridesError("Must be a JSON object (or null).");
        return;
      }
      setAdvancedOverridesError(null);
      setStudioSettings((prev) => ({
        ...prev,
        targetAi: {
          ...prev.targetAi,
          openai: { ...prev.targetAi.openai, advanced_overrides: parsed as Record<string, unknown> },
        },
      }));
    } catch {
      setAdvancedOverridesError("Invalid JSON.");
    }
  }, []);

  const saveStudioSettings = useCallback(async (): Promise<void> => {
    if (advancedOverridesError) {
      toast(`Settings not saved: ${advancedOverridesError}`, { variant: "error" });
      return;
    }

    if (studioSettings.promptExtraction.mode === "gpt" && !studioSettings.promptExtraction.gpt.model.trim()) {
      toast("Prompt extract model is required when prompt extraction mode is GPT.", { variant: "error" });
      return;
    }

    if (!studioSettings.targetAi.openai.model.trim()) {
      toast("Target AI model is required.", { variant: "error" });
      return;
    }

    try {
      await updateSetting.mutateAsync({
        key: IMAGE_STUDIO_SETTINGS_KEY,
        value: serializeSetting(studioSettings),
      });
      toast("Image Studio settings saved.", { variant: "success" });
    } catch (error) {
      console.error("Failed to save Image Studio settings:", error);
      toast("Failed to save Image Studio settings.", { variant: "error" });
    }
  }, [advancedOverridesError, studioSettings, toast, updateSetting]);

  const resetStudioSettings = useCallback((): void => {
    setStudioSettings(defaultImageStudioSettings);
    setAdvancedOverridesText(JSON.stringify(defaultImageStudioSettings.targetAi.openai.advanced_overrides ?? {}, null, 2));
    setAdvancedOverridesError(null);
  }, []);

  const paramLeaves: ParamLeaf[] = useMemo(() => {
    if (!paramsState) return [];
    return flattenParams(paramsState).filter((leaf) => Boolean(leaf.path));
  }, [paramsState]);

  const validationIssues: ParamIssue[] = useMemo(() => {
    if (!paramsState || !paramSpecs) return [];
    return validateImageStudioParams(paramsState, paramSpecs);
  }, [paramsState, paramSpecs]);

  const issuesByPath = useMemo(() => {
    const map: Record<string, ParamIssue[]> = {};
    validationIssues.forEach((issue) => {
      map[issue.path] ??= [];
      map[issue.path]!.push(issue);
    });
    return map;
  }, [validationIssues]);

  const validationSummary = useMemo(() => {
    const errors = validationIssues.filter((i) => i.severity === "error").length;
    const warnings = validationIssues.filter((i) => i.severity === "warning").length;
    return { errors, warnings };
  }, [validationIssues]);

  const generatedPrompt = useMemo(() => {
    if (!extractResult || !extractResult.ok || !paramsState || !promptSourceAtExtract) return "";
    const json = JSON.stringify(paramsState, null, 2);
    return `${promptSourceAtExtract.slice(0, extractResult.objectStart)}${json}${promptSourceAtExtract.slice(extractResult.objectEnd)}`;
  }, [extractResult, paramsState, promptSourceAtExtract]);

  const runPayload = useMemo(() => {
    return {
      projectId: projectId || null,
      asset: selectedAsset ? { id: selectedAsset.id, filepath: selectedAsset.filepath } : null,
      mask: maskPoints.length > 0 ? { type: "polygon", points: maskPoints, closed: maskClosed } : null,
      prompt: generatedPrompt || promptText || null,
      extractedParams: paramsState,
      studioSettings,
    };
  }, [projectId, selectedAsset, maskPoints, maskClosed, generatedPrompt, promptText, paramsState, studioSettings]);

  return (
    <div className="container mx-auto max-w-none space-y-6 py-10">
      <SectionHeader
        title="AI Image Studio (MVP)"
        description="Project-scoped asset browser + polygon mask + prompt params extraction."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                void queryClient.invalidateQueries({ queryKey: ["image-studio"] });
              }}
            >
              <RefreshCcw className="mr-2 size-4" />
              Refresh
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-[56px_300px_1fr_420px] gap-4">
        {/* Toolbar */}
        <SectionPanel className="flex flex-col items-center gap-2 p-2" variant="subtle-compact">
          <Button
            type="button"
            variant={tool === "select" ? "default" : "outline"}
            size="sm"
            className="w-full justify-center"
            onClick={() => setTool("select")}
            title="Select"
          >
            <MousePointer2 className="size-4" />
          </Button>
          <Button
            type="button"
            variant={tool === "polygon" ? "default" : "outline"}
            size="sm"
            className="w-full justify-center"
            onClick={() => setTool("polygon")}
            title="Polygon mask"
          >
            <Pentagon className="size-4" />
          </Button>
          <div className="mt-2 h-px w-full bg-border" />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full justify-center"
            onClick={() => {
              setMaskPoints((prev) => prev.slice(0, -1));
              setMaskClosed(false);
            }}
            disabled={maskPoints.length === 0}
            title="Undo last point"
          >
            Undo
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full justify-center"
            onClick={() => {
              if (maskPoints.length >= 3) setMaskClosed(true);
            }}
            disabled={maskPoints.length < 3 || maskClosed}
            title="Close polygon"
          >
            Close
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full justify-center"
            onClick={() => {
              setMaskPoints([]);
              setMaskClosed(false);
            }}
            title="Clear mask"
          >
            Clear
          </Button>
        </SectionPanel>

        {/* Project + Assets */}
        <SectionPanel className="flex h-[72vh] flex-col gap-3 overflow-hidden" variant="subtle">
          <div className="space-y-2">
            <Label className="text-xs text-gray-400">Project</Label>
            <div className="flex items-center gap-2">
              <Select value={projectId || "__none__"} onValueChange={(value) => setProjectId(value === "__none__" ? "" : value)}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder={projectsQuery.isLoading ? "Loading..." : "Select project"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No project</SelectItem>
                  {(projectsQuery.data ?? []).map((id) => (
                    <SelectItem key={id} value={id}>
                      {id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void projectsQuery.refetch()}
                title="Reload projects"
              >
                <RefreshCcw className="size-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Input
                value={newProjectId}
                onChange={(e) => setNewProjectId(e.target.value)}
                placeholder="New project id (e.g. milkbar-001)"
                className="h-9"
              />
              <Button
                onClick={() => void createProjectMutation.mutateAsync(newProjectId)}
                disabled={!newProjectId.trim() || createProjectMutation.isPending}
              >
                Create
              </Button>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="text-[11px] text-gray-400">
                Folder: <span className="text-gray-200">{selectedFolder || "(root)"}</span>
              </div>
              <label className={cn("inline-flex cursor-pointer items-center gap-2", !projectId && "opacity-50 pointer-events-none")}>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => void handleUploadInput(e)}
                />
                <Button type="button" variant="outline" size="sm" disabled={!projectId || uploadMutation.isPending}>
                  <Upload className="mr-2 size-4" />
                  Upload
                </Button>
              </label>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <AssetTree
              projectId={projectId}
              assets={assets}
              selectedFolder={selectedFolder}
              selectedAssetId={selectedAssetId}
              onSelectFolder={setSelectedFolder}
              onSelectAsset={handleSelectAsset}
            />
          </div>
        </SectionPanel>

        {/* Preview */}
        <SectionPanel className="flex h-[72vh] flex-col gap-3 overflow-hidden" variant="subtle">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-xs text-gray-400">Preview</div>
              <div className="truncate text-sm text-gray-100">{selectedAsset?.filename || "—"}</div>
            </div>
            <div className="text-[11px] text-gray-400">
              Mask: {maskPoints.length} pt{maskPoints.length === 1 ? "" : "s"}
              {maskClosed ? " (closed)" : ""}
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <MaskCanvas
              src={selectedAsset?.filepath ?? null}
              tool={tool}
              points={maskPoints}
              isClosed={maskClosed}
              onChange={(nextPoints, nextClosed) => {
                setMaskPoints(nextPoints);
                setMaskClosed(nextClosed);
              }}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-gray-400">Mask JSON</Label>
            <Textarea
              value={maskPoints.length === 0 ? "" : safeJsonStringify({ type: "polygon", points: maskPoints, closed: maskClosed })}
              readOnly
              className="h-24 font-mono text-[11px]"
              placeholder="Draw a polygon mask to populate this."
            />
          </div>
        </SectionPanel>

        {/* Prompt + Params */}
        <SectionPanel className="flex h-[72vh] flex-col gap-3 overflow-hidden" variant="subtle">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-xs text-gray-400">Prompt</div>
              <div className="text-sm text-gray-100">Programmatic prompt + params extraction</div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSettingsOpen((prev) => !prev)}
                title="Image Studio settings"
              >
                <Settings className="mr-2 size-4" />
                Settings
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!promptText.trim()) return;
                  if (studioSettings.promptExtraction.mode === "programmatic") {
                    runProgrammaticExtraction();
                    return;
                  }
                  toast(
                    `AI extraction is not wired yet. Selected model: ${studioSettings.promptExtraction.gpt.model}. (API key: /admin/settings/ai)`,
                    { variant: "info" }
                  );
                }}
                disabled={!promptText.trim()}
              >
                AI extract
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={runProgrammaticExtraction}
                disabled={!promptText.trim()}
              >
                Extract params
              </Button>
            </div>
          </div>

          {settingsOpen ? (
            <div className="rounded border border-border bg-card/40 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs text-gray-300">Studio Settings</div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetStudioSettings}
                    disabled={updateSetting.isPending}
                  >
                    Reset
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => void saveStudioSettings()}
                    disabled={updateSetting.isPending || Boolean(advancedOverridesError)}
                  >
                    {updateSetting.isPending ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>

              {settingsQuery.isLoading && !settingsLoaded ? (
                <div className="mt-2 text-xs text-gray-500">Loading settings…</div>
              ) : null}

              <div className="mt-3 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs text-gray-400">Prompt Extraction</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <div className="text-[11px] text-gray-500">Mode</div>
                      <Select
                        value={studioSettings.promptExtraction.mode}
                        onValueChange={(value) =>
                          setStudioSettings((prev) => ({
                            ...prev,
                            promptExtraction: {
                              ...prev.promptExtraction,
                              mode: value === "gpt" ? "gpt" : "programmatic",
                            },
                          }))
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="programmatic">Programmatic</SelectItem>
                          <SelectItem value="gpt">GPT (AI)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <div className="text-[11px] text-gray-500">Model</div>
                      <Input
                        value={studioSettings.promptExtraction.gpt.model}
                        onChange={(e) =>
                          setStudioSettings((prev) => ({
                            ...prev,
                            promptExtraction: {
                              ...prev.promptExtraction,
                              gpt: { ...prev.promptExtraction.gpt, model: e.target.value },
                            },
                          }))
                        }
                        className="h-8"
                        placeholder="e.g. gpt-4o-mini"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <div className="text-[11px] text-gray-500">Temperature</div>
                      <Input
                        type="number"
                        value={studioSettings.promptExtraction.gpt.temperature ?? ""}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const next = raw === "" ? null : Number(raw);
                          if (raw !== "" && !Number.isFinite(next)) return;
                          setStudioSettings((prev) => ({
                            ...prev,
                            promptExtraction: {
                              ...prev.promptExtraction,
                              gpt: { ...prev.promptExtraction.gpt, temperature: next },
                            },
                          }));
                        }}
                        className="h-8"
                        min={0}
                        max={2}
                        step={0.1}
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="text-[11px] text-gray-500">Top P</div>
                      <Input
                        type="number"
                        value={studioSettings.promptExtraction.gpt.top_p ?? ""}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const next = raw === "" ? null : Number(raw);
                          if (raw !== "" && !Number.isFinite(next)) return;
                          setStudioSettings((prev) => ({
                            ...prev,
                            promptExtraction: {
                              ...prev.promptExtraction,
                              gpt: { ...prev.promptExtraction.gpt, top_p: next },
                            },
                          }));
                        }}
                        className="h-8"
                        min={0}
                        max={1}
                        step={0.05}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <div className="text-[11px] text-gray-500">Max Output Tokens</div>
                      <Input
                        type="number"
                        value={studioSettings.promptExtraction.gpt.max_output_tokens ?? ""}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const next = raw === "" ? null : Number(raw);
                          if (raw !== "" && (!Number.isFinite(next) || !Number.isInteger(next))) return;
                          setStudioSettings((prev) => ({
                            ...prev,
                            promptExtraction: {
                              ...prev.promptExtraction,
                              gpt: { ...prev.promptExtraction.gpt, max_output_tokens: next },
                            },
                          }));
                        }}
                        className="h-8"
                        min={1}
                        step={1}
                      />
                    </div>
                    <div className="text-[11px] text-gray-500">
                      Stores config only; AI extraction endpoint is next.
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-gray-400">Target AI (OpenAI / GPT)</Label>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <div className="text-[11px] text-gray-500">API</div>
                      <Select
                        value={studioSettings.targetAi.openai.api}
                        onValueChange={(value) =>
                          setStudioSettings((prev) => ({
                            ...prev,
                            targetAi: { ...prev.targetAi, openai: { ...prev.targetAi.openai, api: value === "responses" ? "responses" : "images" } },
                          }))
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="images">Images</SelectItem>
                          <SelectItem value="responses">Responses</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <div className="text-[11px] text-gray-500">Model</div>
                      <Input
                        value={studioSettings.targetAi.openai.model}
                        onChange={(e) =>
                          setStudioSettings((prev) => ({
                            ...prev,
                            targetAi: { ...prev.targetAi, openai: { ...prev.targetAi.openai, model: e.target.value } },
                          }))
                        }
                        className="h-8"
                        placeholder={studioSettings.targetAi.openai.api === "images" ? "e.g. gpt-image-1" : "e.g. gpt-4o-mini"}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <div className="text-[11px] text-gray-500">Temperature</div>
                      <Input
                        type="number"
                        value={studioSettings.targetAi.openai.temperature ?? ""}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const next = raw === "" ? null : Number(raw);
                          if (raw !== "" && !Number.isFinite(next)) return;
                          setStudioSettings((prev) => ({
                            ...prev,
                            targetAi: { ...prev.targetAi, openai: { ...prev.targetAi.openai, temperature: next } },
                          }));
                        }}
                        className="h-8"
                        min={0}
                        max={2}
                        step={0.1}
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="text-[11px] text-gray-500">Top P</div>
                      <Input
                        type="number"
                        value={studioSettings.targetAi.openai.top_p ?? ""}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const next = raw === "" ? null : Number(raw);
                          if (raw !== "" && !Number.isFinite(next)) return;
                          setStudioSettings((prev) => ({
                            ...prev,
                            targetAi: { ...prev.targetAi, openai: { ...prev.targetAi.openai, top_p: next } },
                          }));
                        }}
                        className="h-8"
                        min={0}
                        max={1}
                        step={0.05}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <div className="text-[11px] text-gray-500">Max Output Tokens</div>
                      <Input
                        type="number"
                        value={studioSettings.targetAi.openai.max_output_tokens ?? ""}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const next = raw === "" ? null : Number(raw);
                          if (raw !== "" && (!Number.isFinite(next) || !Number.isInteger(next))) return;
                          setStudioSettings((prev) => ({
                            ...prev,
                            targetAi: { ...prev.targetAi, openai: { ...prev.targetAi.openai, max_output_tokens: next } },
                          }));
                        }}
                        className="h-8"
                        min={1}
                        step={1}
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="text-[11px] text-gray-500">Seed</div>
                      <Input
                        type="number"
                        value={studioSettings.targetAi.openai.seed ?? ""}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const next = raw === "" ? null : Number(raw);
                          if (raw !== "" && (!Number.isFinite(next) || !Number.isInteger(next))) return;
                          setStudioSettings((prev) => ({
                            ...prev,
                            targetAi: { ...prev.targetAi, openai: { ...prev.targetAi.openai, seed: next } },
                          }));
                        }}
                        className="h-8"
                        step={1}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <div className="text-[11px] text-gray-500">Presence Penalty</div>
                      <Input
                        type="number"
                        value={studioSettings.targetAi.openai.presence_penalty ?? ""}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const next = raw === "" ? null : Number(raw);
                          if (raw !== "" && !Number.isFinite(next)) return;
                          setStudioSettings((prev) => ({
                            ...prev,
                            targetAi: { ...prev.targetAi, openai: { ...prev.targetAi.openai, presence_penalty: next } },
                          }));
                        }}
                        className="h-8"
                        min={-2}
                        max={2}
                        step={0.1}
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="text-[11px] text-gray-500">Frequency Penalty</div>
                      <Input
                        type="number"
                        value={studioSettings.targetAi.openai.frequency_penalty ?? ""}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const next = raw === "" ? null : Number(raw);
                          if (raw !== "" && !Number.isFinite(next)) return;
                          setStudioSettings((prev) => ({
                            ...prev,
                            targetAi: { ...prev.targetAi, openai: { ...prev.targetAi.openai, frequency_penalty: next } },
                          }));
                        }}
                        className="h-8"
                        min={-2}
                        max={2}
                        step={0.1}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center gap-2 text-xs text-gray-200">
                      <input
                        type="checkbox"
                        checked={studioSettings.targetAi.openai.stream}
                        onChange={(e) =>
                          setStudioSettings((prev) => ({
                            ...prev,
                            targetAi: { ...prev.targetAi, openai: { ...prev.targetAi.openai, stream: e.target.checked } },
                          }))
                        }
                      />
                      Stream
                    </label>

                    <div className="space-y-1">
                      <div className="text-[11px] text-gray-500">Tool Choice</div>
                      <Select
                        value={studioSettings.targetAi.openai.tool_choice ?? "__null__"}
                        onValueChange={(value) =>
                          setStudioSettings((prev) => ({
                            ...prev,
                            targetAi: {
                              ...prev.targetAi,
                              openai: { ...prev.targetAi.openai, tool_choice: value === "__null__" ? null : value === "none" ? "none" : "auto" },
                            },
                          }))
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__null__">Default</SelectItem>
                          <SelectItem value="auto">auto</SelectItem>
                          <SelectItem value="none">none</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <div className="text-[11px] text-gray-500">Reasoning Effort</div>
                      <Select
                        value={studioSettings.targetAi.openai.reasoning_effort ?? "__null__"}
                        onValueChange={(value) =>
                          setStudioSettings((prev) => ({
                            ...prev,
                            targetAi: {
                              ...prev.targetAi,
                              openai: {
                                ...prev.targetAi.openai,
                                reasoning_effort: value === "__null__" ? null : (value as ImageStudioSettings["targetAi"]["openai"]["reasoning_effort"]),
                              },
                            },
                          }))
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__null__">Default</SelectItem>
                          <SelectItem value="low">low</SelectItem>
                          <SelectItem value="medium">medium</SelectItem>
                          <SelectItem value="high">high</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <div className="text-[11px] text-gray-500">Response Format</div>
                      <Select
                        value={studioSettings.targetAi.openai.response_format ?? "__null__"}
                        onValueChange={(value) =>
                          setStudioSettings((prev) => ({
                            ...prev,
                            targetAi: {
                              ...prev.targetAi,
                              openai: {
                                ...prev.targetAi.openai,
                                response_format: value === "__null__" ? null : value === "json" ? "json" : "text",
                              },
                            },
                          }))
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__null__">Default</SelectItem>
                          <SelectItem value="text">text</SelectItem>
                          <SelectItem value="json">json</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <div className="text-[11px] text-gray-500">User (optional)</div>
                      <Input
                        value={studioSettings.targetAi.openai.user ?? ""}
                        onChange={(e) =>
                          setStudioSettings((prev) => ({
                            ...prev,
                            targetAi: {
                              ...prev.targetAi,
                              openai: { ...prev.targetAi.openai, user: e.target.value.trim() ? e.target.value : null },
                            },
                          }))
                        }
                        className="h-8"
                        placeholder="e.g. user_123"
                      />
                    </div>
                    <div className="text-[11px] text-gray-500">
                      Tip: store your API key at <span className="text-gray-300">/admin/settings/ai</span>.
                    </div>
                  </div>

                  {studioSettings.targetAi.openai.api === "images" ? (
                    <div className="space-y-2 rounded border border-border/60 bg-card/30 p-2">
                      <div className="text-xs text-gray-400">Images API options</div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <div className="text-[11px] text-gray-500">Size</div>
                          <Input
                            value={studioSettings.targetAi.openai.image.size ?? ""}
                            onChange={(e) =>
                              setStudioSettings((prev) => ({
                                ...prev,
                                targetAi: {
                                  ...prev.targetAi,
                                  openai: {
                                    ...prev.targetAi.openai,
                                    image: { ...prev.targetAi.openai.image, size: e.target.value.trim() ? e.target.value : null },
                                  },
                                },
                              }))
                            }
                            className="h-8"
                            placeholder="e.g. 1536x1024"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="text-[11px] text-gray-500">Quality</div>
                          <Select
                            value={studioSettings.targetAi.openai.image.quality ?? "__null__"}
                            onValueChange={(value) =>
                              setStudioSettings((prev) => ({
                                ...prev,
                                targetAi: {
                                  ...prev.targetAi,
                                  openai: {
                                    ...prev.targetAi.openai,
                                    image: {
                                      ...prev.targetAi.openai.image,
                                      quality: value === "__null__" ? null : value === "high" ? "high" : "standard",
                                    },
                                  },
                                },
                              }))
                            }
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__null__">Default</SelectItem>
                              <SelectItem value="standard">standard</SelectItem>
                              <SelectItem value="high">high</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <div className="text-[11px] text-gray-500">Background</div>
                          <Select
                            value={studioSettings.targetAi.openai.image.background ?? "__null__"}
                            onValueChange={(value) =>
                              setStudioSettings((prev) => ({
                                ...prev,
                                targetAi: {
                                  ...prev.targetAi,
                                  openai: {
                                    ...prev.targetAi.openai,
                                    image: {
                                      ...prev.targetAi.openai.image,
                                      background: value === "__null__" ? null : value === "transparent" ? "transparent" : "white",
                                    },
                                  },
                                },
                              }))
                            }
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__null__">Default</SelectItem>
                              <SelectItem value="white">white</SelectItem>
                              <SelectItem value="transparent">transparent</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <div className="text-[11px] text-gray-500">Format</div>
                          <Select
                            value={studioSettings.targetAi.openai.image.format ?? "png"}
                            onValueChange={(value) =>
                              setStudioSettings((prev) => ({
                                ...prev,
                                targetAi: {
                                  ...prev.targetAi,
                                  openai: {
                                    ...prev.targetAi.openai,
                                    image: { ...prev.targetAi.openai.image, format: value === "jpeg" ? "jpeg" : "png" },
                                  },
                                },
                              }))
                            }
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="png">png</SelectItem>
                              <SelectItem value="jpeg">jpeg</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <div className="text-[11px] text-gray-500">N</div>
                          <Input
                            type="number"
                            value={studioSettings.targetAi.openai.image.n ?? ""}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const next = raw === "" ? null : Number(raw);
                              if (raw !== "" && (!Number.isFinite(next) || !Number.isInteger(next))) return;
                              setStudioSettings((prev) => ({
                                ...prev,
                                targetAi: {
                                  ...prev.targetAi,
                                  openai: {
                                    ...prev.targetAi.openai,
                                    image: { ...prev.targetAi.openai.image, n: next },
                                  },
                                },
                              }));
                            }}
                            className="h-8"
                            min={1}
                            step={1}
                          />
                        </div>
                        <div className="text-[11px] text-gray-500">
                          For edits, keep <span className="text-gray-300">N=1</span>.
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="space-y-1">
                    <div className="text-[11px] text-gray-500">Advanced Overrides (JSON)</div>
                    <Textarea
                      value={advancedOverridesText}
                      onChange={(e) => handleAdvancedOverridesChange(e.target.value)}
                      className="h-28 font-mono text-[11px]"
                      placeholder='e.g. {"metadata":{"project":"milkbar-001"}}'
                    />
                    {advancedOverridesError ? (
                      <div className="text-[11px] text-red-300">{advancedOverridesError}</div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <Textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              className="h-40 font-mono text-[11px]"
              placeholder="Paste your prompt here. It must include `params = { ... }` with JSON-like content (quoted keys/strings)."
            />
            {extractResult && !extractResult.ok ? (
              <div className="text-xs text-red-300">{extractResult.error}</div>
            ) : null}
          </div>

          <div className="flex-1 overflow-hidden">
            <Label className="text-xs text-gray-400">Params</Label>
            <div className="mt-2 h-full overflow-auto rounded border border-border bg-card/40 p-2">
              {paramsState ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3 rounded border border-border bg-card/60 p-2 text-[11px]">
                    <div className="text-gray-300">
                      Validation:{" "}
                      {validationSummary.errors === 0 && validationSummary.warnings === 0 ? (
                        <span className="text-emerald-300">OK</span>
                      ) : (
                        <>
                          {validationSummary.errors > 0 ? (
                            <span className="text-red-300">{validationSummary.errors} error(s)</span>
                          ) : (
                            <span className="text-gray-400">0 errors</span>
                          )}
                          {" • "}
                          {validationSummary.warnings > 0 ? (
                            <span className="text-yellow-300">{validationSummary.warnings} warning(s)</span>
                          ) : (
                            <span className="text-gray-400">0 warnings</span>
                          )}
                        </>
                      )}
                    </div>
                    <div className="text-gray-500">Hints from inline comments are used for enums/ranges.</div>
                  </div>
                  {paramLeaves.map((leaf) => {
                    const spec = paramSpecs?.[leaf.path];
                    return (
                      <ParamRow
                        key={leaf.path}
                        leaf={leaf}
                        {...(spec ? { spec } : {})}
                        issues={issuesByPath[leaf.path] ?? []}
                        onChange={(nextValue) => {
                          if (!paramsState) return;
                          setParamsState(setDeepValue(paramsState, leaf.path, nextValue));
                        }}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="text-sm text-gray-400">Extract params to edit them as fields.</div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-gray-400">Generated Prompt</Label>
            <Textarea
              value={generatedPrompt}
              readOnly
              className="h-40 font-mono text-[11px]"
              placeholder="Extract params to generate a normalized prompt with updated values."
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="text-[11px] text-gray-400">
              Payload preview (for future AI run endpoint)
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard
                  .writeText(safeJsonStringify(runPayload))
                  .then(() => toast("Copied payload to clipboard.", { variant: "success" }))
                  .catch(() => toast("Failed to copy payload.", { variant: "error" }));
              }}
            >
              Copy payload
            </Button>
          </div>
        </SectionPanel>
      </div>
    </div>
  );
}

function ParamRow({
  leaf,
  spec,
  issues,
  onChange,
}: {
  leaf: ParamLeaf;
  spec?: ParamSpec;
  issues: ParamIssue[];
  onChange: (value: unknown) => void;
}): React.JSX.Element {
  const value = leaf.value;

  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");
  const borderClass =
    errors.length > 0 ? "border-red-500/60" : warnings.length > 0 ? "border-yellow-500/50" : "border-border";

  const isNumber = typeof value === "number" && Number.isFinite(value);
  const isBool = typeof value === "boolean";
  const isString = typeof value === "string";

  const kind: ParamSpec["kind"] = spec?.kind ?? (Array.isArray(value) ? "json" : isBool ? "boolean" : isNumber ? "number" : isString ? "string" : "json");

  const uiKind: ParamSpec["kind"] =
    (kind === "boolean" && !isBool) ||
    (kind === "number" && !isNumber) ||
    (kind === "enum" && !isString) ||
    (kind === "string" && !isString) ||
    (kind === "rgb" && !Array.isArray(value)) ||
    (kind === "tuple2" && !Array.isArray(value))
      ? "json"
      : kind;

  const canSlider =
    uiKind === "number" &&
    typeof value === "number" &&
    Number.isFinite(value) &&
    (spec && spec.min !== undefined && spec.max !== undefined ? Math.abs(spec.max - spec.min) <= 300 : value >= 0 && value <= 1);

  return (
    <div className={cn("rounded border bg-card/60 p-2", borderClass)}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-mono text-[11px] text-gray-200">{leaf.path}</div>
        </div>
        <div className="text-[11px] text-gray-400">
          {Array.isArray(value) ? "array" : value === null ? "null" : typeof value}
        </div>
      </div>

      {spec?.hint ? (
        <div className="mb-2 text-[11px] text-gray-500">
          Hint: <span className="text-gray-400">{spec.hint}</span>
        </div>
      ) : null}

      {errors.length > 0 || warnings.length > 0 ? (
        <div className="mb-2 space-y-1 text-[11px]">
          {errors.map((issue) => (
            <div key={`${issue.path}:${issue.code ?? issue.message}`} className="text-red-300">
              {issue.message}
            </div>
          ))}
          {warnings.map((issue) => (
            <div key={`${issue.path}:${issue.code ?? issue.message}`} className="text-yellow-300">
              {issue.message}
            </div>
          ))}
        </div>
      ) : null}

      {uiKind === "boolean" && isBool ? (
        <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-200">
          <input
            type="checkbox"
            checked={value}
            onChange={(e) => onChange(e.target.checked)}
          />
          <span>{value ? "true" : "false"}</span>
        </label>
      ) : null}

      {uiKind === "enum" && typeof value === "string" && spec?.enumOptions ? (
        <Select value={value} onValueChange={(v) => onChange(v)}>
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {spec.enumOptions.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      {uiKind === "number" && isNumber ? (
        <div className="space-y-2">
          {canSlider ? (
            <input
              type="range"
              min={spec?.min ?? 0}
              max={spec?.max ?? 1}
              step={spec?.step ?? 0.01}
              value={Math.min(spec?.max ?? value, Math.max(spec?.min ?? value, value))}
              onChange={(e) => {
                const next = Number(e.target.value);
                if (!Number.isFinite(next)) return;
                onChange(next);
              }}
              className="w-full"
            />
          ) : null}
          <Input
            type="number"
            value={String(value)}
            onChange={(e) => {
              const next = Number(e.target.value);
              if (!Number.isFinite(next)) return;
              onChange(next);
            }}
            min={spec?.min}
            max={spec?.max}
            step={spec?.step}
            className="h-8"
          />
        </div>
      ) : null}

      {uiKind === "rgb" && Array.isArray(value) ? (
        <div className="grid grid-cols-3 gap-2">
          {["R", "G", "B"].map((label, index) => (
            <div key={label} className="space-y-1">
              <div className="text-[10px] text-gray-500">{label}</div>
              <Input
                type="number"
                value={String(value[index] ?? "")}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  if (!Number.isFinite(next)) return;
                  const nextRgb = [...value] as unknown[];
                  nextRgb[index] = next;
                  onChange(nextRgb);
                }}
                min={spec?.min ?? 0}
                max={spec?.max ?? 255}
                step={spec?.step ?? 1}
                className="h-8"
              />
            </div>
          ))}
        </div>
      ) : null}

      {uiKind === "tuple2" && Array.isArray(value) ? (
        <div className="grid grid-cols-2 gap-2">
          {["X", "Y"].map((label, index) => (
            <div key={label} className="space-y-1">
              <div className="text-[10px] text-gray-500">{label}</div>
              <Input
                type="number"
                value={String(value[index] ?? "")}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  if (!Number.isFinite(next)) return;
                  const nextTuple = [...value] as unknown[];
                  nextTuple[index] = next;
                  onChange(nextTuple);
                }}
                min={spec?.min}
                max={spec?.max}
                step={spec?.step ?? 1}
                className="h-8"
              />
            </div>
          ))}
        </div>
      ) : null}

      {uiKind === "string" && isString ? (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8"
        />
      ) : null}

      {uiKind === "json" ? (
        <Textarea
          value={safeJsonStringify(value)}
          onChange={(e) => {
            const raw = e.target.value;
            try {
              onChange(JSON.parse(raw) as unknown);
            } catch {
              onChange(raw);
            }
          }}
          className="h-24 font-mono text-[11px]"
        />
      ) : null}
    </div>
  );
}
