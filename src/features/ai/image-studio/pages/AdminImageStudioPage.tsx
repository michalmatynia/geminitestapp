"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import {
  Button,
  FileUploadButton,
  Input,
  Label,
  SectionPanel,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SharedModal,
  Tabs,
  TabsContent,
  Textarea,
  useToast,
} from "@/shared/ui";
import { cn } from "@/shared/utils";
import { Folder, Image as ImageIcon, Maximize2, Minimize2, MousePointer2, Pentagon, RefreshCcw, Sparkles, Upload, Wand2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import FileManager from "@/features/files/components/FileManager";
import type { ImageFileRecord, ImageFileSelection } from "@/shared/types/files";
import { extractParamsFromPrompt, flattenParams, inferParamSpecs, setDeepValue, validateImageStudioParams } from "../utils/prompt-params";
import type { ExtractParamsResult, ParamIssue, ParamLeaf, ParamSpec } from "../utils/prompt-params";
import { validateProgrammaticPrompt, type PromptValidationIssue, type PromptValidationSuggestion } from "../utils/prompt-validator";
import { formatProgrammaticPrompt } from "../utils/prompt-formatter";
import { isParamUiControl, paramUiControlLabel, recommendParamUiControl, type ParamUiControl } from "../utils/param-ui";
import { useSettingsMap, useUpdateSetting } from "@/shared/hooks/use-settings";
import { serializeSetting } from "@/shared/utils/settings-json";
import { logClientError } from "@/features/observability";
import { defaultImageStudioSettings, IMAGE_STUDIO_SETTINGS_KEY, parseImageStudioSettings, parsePromptValidationRules, type ImageStudioSettings, type PromptValidationRule } from "../utils/studio-settings";
import { AdminImageStudioValidationPatternsPage } from "./AdminImageStudioValidationPatternsPage";

type ToolMode = "select" | "polygon" | "lasso" | "rect" | "ellipse" | "brush";
type StudioTab = "studio" | "projects" | "settings" | "validation";

type Point = { x: number; y: number }; // normalized 0..1
type MaskShapeType = "polygon" | "lasso" | "rect" | "ellipse" | "brush";
type MaskShape = {
  id: string;
  name: string;
  type: MaskShapeType;
  points: Point[];
  closed: boolean;
  visible: boolean;
};

type StudioProjectsResponse = { projects: string[] };
type StudioAssetsResponse = { assets: ImageFileRecord[]; folders?: string[] };
type StudioImportResponse = { uploaded: ImageFileRecord[]; failures?: Array<{ filepath: string; error: string }> };
type StudioRunResponse = { outputs: ImageFileRecord[] };
type UiSuggestion = {
  path: string;
  valuePreview: string;
  control: ParamUiControl;
  options: ParamUiControl[];
  confidence: number;
  reason: string | null;
  source: "heuristic" | "ai";
};

const isStudioTab = (value: string | null): value is StudioTab =>
  value === "studio" || value === "projects" || value === "settings" || value === "validation";

const normalizeStudioTab = (value: string | null): StudioTab => (isStudioTab(value) ? value : "studio");
type UiSuggestionRow = {
  path: string;
  valuePreview: string;
  hint: string | null;
  heuristic?: UiSuggestion;
  ai?: UiSuggestion;
  selected: ParamUiControl;
  apply: boolean;
};

function safeJsonStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

const STUDIO_UPLOAD_PREFIX = "/uploads/studio/";

function sanitizeStudioProjectId(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9-_]/g, "_");
}

function normalizePublicPath(value: string | null | undefined): string | null {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return null;
  if (raw.startsWith("data:") || raw.startsWith("blob:") || raw.startsWith("file:")) {
    return raw;
  }

  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      if (url.pathname.includes("/uploads/")) {
        return normalizePublicPath(url.pathname);
      }
      return raw;
    } catch {
      return raw;
    }
  }

  let normalized = raw.replace(/\\/g, "/");
  if (normalized.startsWith("public/")) {
    normalized = `/${normalized}`;
  }
  const publicIndex = normalized.indexOf("/public/");
  if (publicIndex >= 0) {
    normalized = normalized.slice(publicIndex + "/public".length);
  }
  const uploadsIndex = normalized.indexOf("/uploads/");
  if (uploadsIndex >= 0) {
    normalized = normalized.slice(uploadsIndex);
  }
  if (!normalized.startsWith("/")) normalized = `/${normalized}`;
  return normalized;
}

function normalizeStudioFilepath(projectId: string, filepath: string | null | undefined): string | null {
  const normalized = normalizePublicPath(filepath);
  if (!normalized) return null;
  if (normalized.startsWith(STUDIO_UPLOAD_PREFIX)) return normalized;

  const safeProjectId = sanitizeStudioProjectId(projectId);
  const uploadsPrefix = `/uploads/${safeProjectId}/`;
  if (safeProjectId && normalized.startsWith(uploadsPrefix)) {
    return normalized.replace(uploadsPrefix, `${STUDIO_UPLOAD_PREFIX}${safeProjectId}/`);
  }

  return normalized;
}

function normalizeStudioAssets(projectId: string, assets: ImageFileRecord[]): ImageFileRecord[] {
  if (!assets.length) return assets;
  const safeProjectId = sanitizeStudioProjectId(projectId);
  return assets.map((asset: ImageFileRecord) => {
    const normalized = normalizeStudioFilepath(safeProjectId, asset.filepath);
    if (!normalized || normalized === asset.filepath) return asset;
    return { ...asset, filepath: normalized };
  });
}

async function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise<HTMLImageElement>((resolve: (value: HTMLImageElement) => void, reject: (reason?: unknown) => void) => {
    const img = document.createElement("img");
    img.onload = (): void => resolve(img);
    img.onerror = (): void => reject(new Error("Failed to load image for mask generation."));
    img.src = src;
  });
}

async function computeBboxFromThreshold(src: string): Promise<{ x: number; y: number; w: number; h: number } | null> {
  const img = await loadImageElement(src);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let minX = canvas.width;
  let minY = canvas.height;
  let maxX = 0;
  let maxY = 0;
  const threshold = 30;
  const step = 2;
  for (let y = 0; y < canvas.height; y += step) {
    for (let x = 0; x < canvas.width; x += step) {
      const idx = (y * canvas.width + x) * 4;
      const r = data[idx] ?? 255;
      const g = data[idx + 1] ?? 255;
      const b = data[idx + 2] ?? 255;
      if (Math.abs(255 - r) + Math.abs(255 - g) + Math.abs(255 - b) > threshold) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (minX >= maxX || minY >= maxY) return null;
  return {
    x: minX / canvas.width,
    y: minY / canvas.height,
    w: (maxX - minX) / canvas.width,
    h: (maxY - minY) / canvas.height,
  };
}

async function computeBboxFromEdges(src: string): Promise<{ x: number; y: number; w: number; h: number } | null> {
  const img = await loadImageElement(src);
  const canvas = document.createElement("canvas");
  const scale = Math.min(1, 512 / Math.max(img.naturalWidth, img.naturalHeight));
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const getGray = (x: number, y: number): number => {
    const idx = (y * canvas.width + x) * 4;
    const r = data[idx] ?? 0;
    const g = data[idx + 1] ?? 0;
    const b = data[idx + 2] ?? 0;
    return 0.299 * r + 0.587 * g + 0.114 * b;
  };
  let minX = canvas.width;
  let minY = canvas.height;
  let maxX = 0;
  let maxY = 0;
  const edgeThreshold = 40;
  for (let y = 1; y < canvas.height - 1; y += 1) {
    for (let x = 1; x < canvas.width - 1; x += 1) {
      const gx =
        -getGray(x - 1, y - 1) + getGray(x + 1, y - 1) +
        -2 * getGray(x - 1, y) + 2 * getGray(x + 1, y) +
        -getGray(x - 1, y + 1) + getGray(x + 1, y + 1);
      const gy =
        -getGray(x - 1, y - 1) - 2 * getGray(x, y - 1) - getGray(x + 1, y - 1) +
        getGray(x - 1, y + 1) + 2 * getGray(x, y + 1) + getGray(x + 1, y + 1);
      const mag = Math.hypot(gx, gy);
      if (mag > edgeThreshold) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (minX >= maxX || minY >= maxY) return null;
  return {
    x: minX / canvas.width,
    y: minY / canvas.height,
    w: (maxX - minX) / canvas.width,
    h: (maxY - minY) / canvas.height,
  };
}

function buildAssetTree(projectId: string, assets: ImageFileRecord[], folders: string[]): TreeNode {
  const safeProjectId = sanitizeStudioProjectId(projectId);
  const prefix = `${STUDIO_UPLOAD_PREFIX}${safeProjectId}/`;
  const root: TreeNode = { id: "root", name: projectId || "Project", type: "folder", path: "", children: [] };

  const ensureFolder = (parent: TreeNode, folderName: string, folderPath: string): TreeNode => {
    const existing = parent.children.find((child: TreeNode) => child.type === "folder" && child.name === folderName);
    if (existing) return existing;
    const node: TreeNode = { id: `folder:${folderPath}`, name: folderName, type: "folder", path: folderPath, children: [] };
    parent.children.push(node);
    parent.children.sort((a: TreeNode, b: TreeNode) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    return node;
  };

  folders.forEach((folderPath: string) => {
    const normalized = folderPath.replace(/\\/g, "/").replace(/^\/+/, "");
    if (!normalized) return;
    const parts = normalized.split("/").filter(Boolean);
    if (parts.length === 0) return;
    let cursor = root;
    for (let index = 0; index < parts.length; index += 1) {
      const part = parts[index]!;
      const nextFolderPath = parts.slice(0, index + 1).join("/");
      cursor = ensureFolder(cursor, part, nextFolderPath);
    }
  });

  assets.forEach((asset: ImageFileRecord) => {
    const normalizedPath = normalizeStudioFilepath(safeProjectId, asset.filepath);
    if (!normalizedPath || !normalizedPath.startsWith(prefix)) return;
    const relative = normalizedPath.slice(prefix.length).replace(/^\/+/, "");
    const parts = relative.split("/").filter(Boolean);
    if (parts.length === 0) return;

    let cursor = root;
    for (let index = 0; index < parts.length; index += 1) {
      const part = parts[index]!;
      const isLast = index === parts.length - 1;

      if (isLast) {
        const normalizedAsset = normalizedPath === asset.filepath ? asset : { ...asset, filepath: normalizedPath };
        cursor.children.push({
          id: `file:${asset.id}`,
          name: part,
          type: "file",
          path: parts.slice(0, -1).join("/"),
          asset: normalizedAsset,
          children: [],
        });
        cursor.children.sort((a: TreeNode, b: TreeNode) => {
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
  folders,
  selectedFolder,
  selectedAssetId,
  onSelectFolder,
  onSelectAsset,
}: {
  projectId: string;
  assets: ImageFileRecord[];
  folders: string[];
  selectedFolder: string;
  selectedAssetId: string | null;
  onSelectFolder: (folder: string) => void;
  onSelectAsset: (asset: ImageFileRecord) => void;
}): React.JSX.Element {
  const tree = useMemo(() => buildAssetTree(projectId, assets, folders), [projectId, assets, folders]);
  const initialExpanded = useMemo(() => new Set(["root"]), []);
  const [expanded, setExpanded] = useState<Set<string>>(initialExpanded);

  // Reset expanded when projectId changes (derived state pattern)
  const [prevProjectId, setPrevProjectId] = useState(projectId);
  if (projectId !== prevProjectId) {
    setPrevProjectId(projectId);
    setExpanded(new Set(["root"]));
  }

  const toggle = useCallback((id: string): void => {
    setExpanded((prev: Set<string>) => {
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
            <span className="w-4 text-gray-400" onClick={(e: React.MouseEvent): void => { e.stopPropagation(); toggle(node.id); }}>
              {node.children.some((c: TreeNode) => c.type === "folder") || node.children.some((c: TreeNode) => c.type === "file") ? (
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
              {node.children.map((child: TreeNode) => renderNode(child, depth + 1))}
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
      {tree.children.length === 0 ? (
        <div className="flex h-full items-center justify-center px-2 text-center text-xs text-gray-500">
          No folders yet. Upload to the root, or upload with a folder name to create one.
        </div>
      ) : (
        renderNode(tree, 0)
      )}
    </div>
  );
}

function MaskCanvas({
  src,
  tool,
  shapes,
  activeShapeId,
  selectedPointIndex,
  onChange,
  onSelectShape,
  onSelectPoint,
  brushRadius,
}: {
  src: string | null;
  tool: ToolMode;
  shapes: MaskShape[];
  activeShapeId: string | null;
  selectedPointIndex: number | null;
  onChange: (nextShapes: MaskShape[]) => void;
  onSelectShape: (id: string | null) => void;
  onSelectPoint?: (index: number | null) => void;
  brushRadius: number;
}): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragRef = useRef<{ shapeId: string; pointIndex: number } | null>(null);
  const drawingRef = useRef<{ shapeId: string; type: MaskShapeType } | null>(null);

  const draw = useCallback((): void => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const toPx = (p: Point): { x: number; y: number } => ({
      x: p.x * canvas.width,
      y: p.y * canvas.height,
    });

    shapes.forEach((shape: MaskShape) => {
      if (!shape.visible) return;
      if (shape.points.length === 0) return;
      const isActive = shape.id === activeShapeId;
      ctx.lineWidth = isActive ? 2.5 : 2;
      ctx.strokeStyle = isActive ? "rgba(16, 185, 129, 0.95)" : "rgba(56, 189, 248, 0.95)";
      ctx.fillStyle = "rgba(56, 189, 248, 0.15)";

      ctx.beginPath();
      const first = toPx(shape.points[0]!);
      ctx.moveTo(first.x, first.y);
      shape.points.slice(1).forEach((p: Point) => {
        const px = toPx(p);
        ctx.lineTo(px.x, px.y);
      });
      if (shape.closed && shape.points.length >= 3) {
        ctx.closePath();
        ctx.fill();
      }
      ctx.stroke();

      if (shape.type === "polygon" || shape.type === "lasso" || shape.type === "brush") {
        shape.points.forEach((p: Point, index: number) => {
          const px = toPx(p);
          ctx.beginPath();
          ctx.arc(px.x, px.y, index === 0 ? 5 : 4, 0, Math.PI * 2);
          const isSelected = isActive && index === (selectedPointIndex ?? -1);
          ctx.fillStyle = isSelected ? "rgba(251, 191, 36, 0.95)" : (index === 0 ? "rgba(16, 185, 129, 0.95)" : "rgba(56, 189, 248, 0.95)");
          ctx.fill();
          ctx.strokeStyle = "rgba(0,0,0,0.35)";
          ctx.stroke();
        });
      }
    });
  }, [activeShapeId, selectedPointIndex, shapes]);

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
  }, [syncCanvasSize, src, shapes.length]);

  useEffect(() => {
    const onResize = (): void => syncCanvasSize();
    window.addEventListener("resize", onResize);
    return (): void => window.removeEventListener("resize", onResize);
  }, [syncCanvasSize]);

  useEffect(() => {
    if (!containerRef.current || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      syncCanvasSize();
    });
    observer.observe(containerRef.current);
    return (): void => observer.disconnect();
  }, [syncCanvasSize]);

  const toPoint = useCallback((event: React.MouseEvent<HTMLCanvasElement>): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    return {
      x: Math.min(1, Math.max(0, x)),
      y: Math.min(1, Math.max(0, y)),
    };
  }, []);

  const hitTestPoint = useCallback((event: React.MouseEvent<HTMLCanvasElement>): { shapeId: string; pointIndex: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const radius = 8;
    for (const shape of shapes) {
      if (!shape.visible) continue;
      if (!(shape.type === "polygon" || shape.type === "lasso" || shape.type === "brush")) continue;
      for (let idx = 0; idx < shape.points.length; idx += 1) {
        const p = shape.points[idx]!;
        const px = p.x * rect.width;
        const py = p.y * rect.height;
        if (Math.hypot(px - x, py - y) <= radius) {
          return { shapeId: shape.id, pointIndex: idx };
        }
      }
    }
    return null;
  }, [shapes]);

  const hitTestSegment = useCallback((
    event: React.MouseEvent<HTMLCanvasElement>
  ): { shapeId: string; insertIndex: number; point: Point } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const maxDist = 8;

    const pointToSegment = (ax: number, ay: number, bx: number, by: number): number => {
      const abx = bx - ax;
      const aby = by - ay;
      const apx = x - ax;
      const apy = y - ay;
      const abLenSq = abx * abx + aby * aby;
      if (abLenSq === 0) return Math.hypot(x - ax, y - ay);
      const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / abLenSq));
      const px = ax + abx * t;
      const py = ay + aby * t;
      return Math.hypot(x - px, y - py);
    };

    for (const shape of shapes) {
      if (!shape.visible) continue;
      if (!(shape.type === "polygon" || shape.type === "lasso" || shape.type === "brush")) continue;
      if (shape.points.length < 2) continue;
      const pts = shape.points;
      for (let idx = 0; idx < pts.length - 1; idx += 1) {
        const a = pts[idx]!;
        const b = pts[idx + 1]!;
        const ax = a.x * rect.width;
        const ay = a.y * rect.height;
        const bx = b.x * rect.width;
        const by = b.y * rect.height;
        if (pointToSegment(ax, ay, bx, by) <= maxDist) {
          return {
            shapeId: shape.id,
            insertIndex: idx + 1,
            point: { x: x / rect.width, y: y / rect.height },
          };
        }
      }
      if (shape.closed && shape.points.length >= 3) {
        const a = pts[pts.length - 1]!;
        const b = pts[0]!;
        const ax = a.x * rect.width;
        const ay = a.y * rect.height;
        const bx = b.x * rect.width;
        const by = b.y * rect.height;
        if (pointToSegment(ax, ay, bx, by) <= maxDist) {
          return {
            shapeId: shape.id,
            insertIndex: pts.length,
            point: { x: x / rect.width, y: y / rect.height },
          };
        }
      }
    }
    return null;
  }, [shapes]);

  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>): void => {
      if (!src) return;
      if (tool === "select") {
        if (event.shiftKey) {
          const hitSegment = hitTestSegment(event);
          if (hitSegment) {
            onSelectShape(hitSegment.shapeId);
            onChange(
              shapes.map((shape: MaskShape) => {
                if (shape.id !== hitSegment.shapeId) return shape;
                const nextPoints = [...shape.points];
                nextPoints.splice(hitSegment.insertIndex, 0, hitSegment.point);
                return { ...shape, points: nextPoints };
              })
            );
            onSelectPoint?.(hitSegment.insertIndex);
            return;
          }
        }
        const hit = hitTestPoint(event);
        if (hit) {
          dragRef.current = hit;
          onSelectShape(hit.shapeId);
          onSelectPoint?.(hit.pointIndex);
        }
        return;
      }
      if (tool === "polygon") {
        const nextPoint = toPoint(event);
        if (!nextPoint) return;
        const activeShape = shapes.find((s: MaskShape) => s.id === activeShapeId && s.type === "polygon" && !s.closed);
        if (!activeShape) {
          const newShape: MaskShape = {
            id: `shape_${Date.now().toString(36)}`,
            name: `Polygon ${shapes.length + 1}`,
            type: "polygon",
            points: [nextPoint],
            closed: false,
            visible: true,
          };
          onSelectShape(newShape.id);
          onChange([...shapes, newShape]);
          return;
        }
        if (activeShape.points.length >= 3) {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const rect = canvas.getBoundingClientRect();
          const first = activeShape.points[0]!;
          const dx = (first.x - nextPoint.x) * rect.width;
          const dy = (first.y - nextPoint.y) * rect.height;
          const dist = Math.hypot(dx, dy);
          if (dist < 10) {
            onChange(
              shapes.map((shape: MaskShape) =>
                shape.id === activeShape.id ? { ...shape, closed: true } : shape
              )
            );
            return;
          }
        }
        onChange(
          shapes.map((shape: MaskShape) =>
            shape.id === activeShape.id ? { ...shape, points: [...shape.points, nextPoint] } : shape
          )
        );
        return;
      }

      if (tool === "lasso" || tool === "brush") {
        const nextPoint = toPoint(event);
        if (!nextPoint) return;
        const newShape: MaskShape = {
          id: `shape_${Date.now().toString(36)}`,
          name: tool === "brush" ? `Brush ${shapes.length + 1}` : `Lasso ${shapes.length + 1}`,
          type: tool === "brush" ? "brush" : "lasso",
          points: [nextPoint],
          closed: false,
          visible: true,
        };
        drawingRef.current = { shapeId: newShape.id, type: newShape.type };
        onSelectShape(newShape.id);
        onChange([...shapes, newShape]);
        return;
      }

      if (tool === "rect" || tool === "ellipse") {
        const nextPoint = toPoint(event);
        if (!nextPoint) return;
        const newShape: MaskShape = {
          id: `shape_${Date.now().toString(36)}`,
          name: tool === "rect" ? `Rect ${shapes.length + 1}` : `Ellipse ${shapes.length + 1}`,
          type: tool,
          points: [nextPoint, nextPoint],
          closed: true,
          visible: true,
        };
        drawingRef.current = { shapeId: newShape.id, type: newShape.type };
        onSelectShape(newShape.id);
        onChange([...shapes, newShape]);
      }
    },
    [activeShapeId, hitTestPoint, hitTestSegment, onChange, onSelectPoint, onSelectShape, shapes, src, toPoint, tool]
  );

  useEffect(() => {
    if (!activeShapeId || selectedPointIndex === null) return;
    const handleKey = (event: KeyboardEvent): void => {
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        onChange(
          shapes.map((shape: MaskShape) => {
            if (shape.id !== activeShapeId) return shape;
            const nextPoints = shape.points.filter((_: Point, idx: number) => idx !== selectedPointIndex);
            return { ...shape, points: nextPoints, closed: nextPoints.length >= 3 ? shape.closed : false };
          })
        );
        onSelectPoint?.(null);
      } else if (event.key === "Escape") {
        onSelectPoint?.(null);
      }
    };
    window.addEventListener("keydown", handleKey);
    return (): void => window.removeEventListener("keydown", handleKey);
  }, [activeShapeId, onChange, onSelectPoint, selectedPointIndex, shapes]);

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>): void => {
      if (!src) return;
      if (dragRef.current) {
        const nextPoint = toPoint(event);
        if (!nextPoint) return;
        onChange(
          shapes.map((shape: MaskShape) => {
            if (shape.id !== dragRef.current?.shapeId) return shape;
            const nextPoints = [...shape.points];
            nextPoints[dragRef.current.pointIndex] = nextPoint;
            return { ...shape, points: nextPoints };
          })
        );
        return;
      }
      if (drawingRef.current) {
        const nextPoint = toPoint(event);
        if (!nextPoint) return;
        onChange(
          shapes.map((shape: MaskShape) => {
            if (shape.id !== drawingRef.current?.shapeId) return shape;
            if (shape.type === "lasso" || shape.type === "brush") {
              const last = shape.points[shape.points.length - 1];
              if (last) {
                const dx = (last.x - nextPoint.x);
                const dy = (last.y - nextPoint.y);
                if (Math.hypot(dx, dy) < brushRadius / 200) {
                  return shape;
                }
              }
              return { ...shape, points: [...shape.points, nextPoint] };
            }
            if (shape.type === "rect" || shape.type === "ellipse") {
              const nextPoints = shape.points.length >= 2 ? [shape.points[0]!, nextPoint] : [nextPoint, nextPoint];
              return { ...shape, points: nextPoints };
            }
            return shape;
          })
        );
      }
    },
    [brushRadius, onChange, shapes, src, toPoint]
  );

  const handleMouseUp = useCallback((): void => {
    if (drawingRef.current) {
      onChange(
        shapes.map((shape: MaskShape) =>
          shape.id === drawingRef.current?.shapeId ? { ...shape, closed: true } : shape
        )
      );
    }
    dragRef.current = null;
    drawingRef.current = null;
  }, [onChange, shapes]);

  return (
    <div
      ref={containerRef}
      className="relative flex h-full w-full items-center justify-center overflow-hidden rounded border border-border bg-black/20"
    >
      {src ? (
        <>
          <div className="relative h-full w-full">
            <Image
              ref={imgRef}
              src={src}
              alt="Selected asset"
              fill
              className="select-none object-contain"
              onLoadingComplete={() => syncCanvasSize()}
              draggable={false}
              unoptimized
            />
          </div>
          <canvas
            ref={canvasRef}
            className={cn(
              "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
              tool === "select" ? "cursor-default" : "cursor-crosshair"
            )}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
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
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const settingsQuery = useSettingsMap();
  const updateSetting = useUpdateSetting();
  const [settingsLoaded, setSettingsLoaded] = useState<boolean>(false);
  const [studioSettings, setStudioSettings] = useState<ImageStudioSettings>(defaultImageStudioSettings);
  const [advancedOverridesText, setAdvancedOverridesText] = useState<string>(
    JSON.stringify(defaultImageStudioSettings.targetAi.openai.advanced_overrides ?? {}, null, 2)
  );
  const [advancedOverridesError, setAdvancedOverridesError] = useState<string | null>(null);
  const [promptValidationRulesText, setPromptValidationRulesText] = useState<string>(
    JSON.stringify(defaultImageStudioSettings.promptValidation.rules, null, 2)
  );
  const [promptValidationRulesError, setPromptValidationRulesError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<StudioTab>("studio");
  const [projectSearch, setProjectSearch] = useState<string>("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const [projectId, setProjectId] = useState<string>("");
  const [newProjectId, setNewProjectId] = useState<string>("");
  const [selectedFolder, setSelectedFolder] = useState<string>("");
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [driveImportOpen, setDriveImportOpen] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>("");
  const hasManualProjectSelectionRef = useRef<boolean>(false);
  const [moveTargetFolder, setMoveTargetFolder] = useState<string>("");

  const [tool, setTool] = useState<ToolMode>("select");
  const [maskShapes, setMaskShapes] = useState<MaskShape[]>([]);
  const [activeMaskId, setActiveMaskId] = useState<string | null>(null);
  const [maskInvert, setMaskInvert] = useState<boolean>(false);
  const [maskFeather, setMaskFeather] = useState<number>(0);
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const [brushRadius, setBrushRadius] = useState<number>(8);

  const [promptText, setPromptText] = useState<string>("");
  const [extractResult, setExtractResult] = useState<ExtractParamsResult | null>(null);
  const [paramsState, setParamsState] = useState<Record<string, unknown> | null>(null);
  const [paramSpecs, setParamSpecs] = useState<Record<string, ParamSpec> | null>(null);
  const [promptSourceAtExtract, setPromptSourceAtExtract] = useState<string | null>(null);
  const [paramUiOverrides, setParamUiOverrides] = useState<Record<string, ParamUiControl>>({});
  const [learnOpen, setLearnOpen] = useState<boolean>(false);
  const [learnLoading, setLearnLoading] = useState<boolean>(false);
  const [learnCandidates, setLearnCandidates] = useState<PromptValidationRule[]>([]);
  const [learnSelection, setLearnSelection] = useState<Record<string, boolean>>({});
  const [uiSuggestOpen, setUiSuggestOpen] = useState<boolean>(false);
  const [uiSuggestLoading, setUiSuggestLoading] = useState<boolean>(false);
  const [uiSuggestionRows, setUiSuggestionRows] = useState<UiSuggestionRow[]>([]);
  const [uiSuggestMode, setUiSuggestMode] = useState<"heuristic" | "ai" | "both">("heuristic");
  const [uiSuggestMinConfidence, setUiSuggestMinConfidence] = useState<number>(0.5);
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);
  const [maskGenLoading, setMaskGenLoading] = useState<boolean>(false);
  const [_maskGenOpen, setMaskGenOpen] = useState<boolean>(false);
  const [maskGenMode, setMaskGenMode] = useState<"ai-polygon" | "ai-bbox" | "threshold" | "edges">("ai-polygon");

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
    setPromptValidationRulesText(JSON.stringify(hydrated.promptValidation.rules, null, 2));
    setPromptValidationRulesError(null);
    setSettingsLoaded(true);
  }, [settingsLoaded, settingsQuery.data]);

  useEffect(() => {
    const nextTab = normalizeStudioTab(searchParams?.get("tab"));
    setActiveTab((prev: StudioTab) => (prev === nextTab ? prev : nextTab));
  }, [searchParams]);

  const handleTabChange = useCallback(
    (value: string): void => {
      const nextTab = normalizeStudioTab(value);
      setActiveTab(nextTab);
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      if (nextTab === "studio") {
        params.delete("tab");
      } else {
        params.set("tab", nextTab);
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router, searchParams]
  );

  useEffect(() => {
    const saved = localStorage.getItem("imageStudio.projectId") ?? "";
    if (saved) setProjectId(sanitizeStudioProjectId(saved));
  }, []);

  const projectsQuery = useQuery({
    queryKey: ["image-studio", "projects"],
    queryFn: async (): Promise<string[]> => {
      try {
        const res = await fetch("/api/image-studio/projects");
        if (!res.ok) throw new Error("Failed to load projects");
        const data = (await res.json()) as StudioProjectsResponse;
        return Array.isArray(data.projects) ? data.projects : [];
      } catch (error) {
        logClientError(error, { context: { source: "AdminImageStudioPage", action: "loadProjects" } });
        throw error;
      }
    },
    staleTime: 10_000,
  });

  useEffect(() => {
    if (projectId) return;
    if (hasManualProjectSelectionRef.current) return;
    const first = projectsQuery.data?.[0];
    if (first) {
      setProjectId(first);
      hasManualProjectSelectionRef.current = true;
    }
  }, [projectId, projectsQuery.data]);

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

  const deleteProjectMutation = useMutation({
    mutationFn: async (id: string): Promise<string> => {
      const res = await fetch(`/api/image-studio/projects/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error || "Failed to delete project");
      return id;
    },
    onSuccess: async (deletedId: string): Promise<void> => {
      await queryClient.invalidateQueries({ queryKey: ["image-studio", "projects"] });
      if (projectId === deletedId) {
        setProjectId("");
        setSelectedFolder("");
        setSelectedAssetId(null);
      }
      toast("Project deleted.", { variant: "success" });
    },
    onError: (error: unknown): void => {
      toast(error instanceof Error ? error.message : "Failed to delete project.", { variant: "error" });
    },
  });

  const handleDeleteProject = useCallback(
    async (id: string): Promise<void> => {
      if (!id) return;
      const confirmed = window.confirm(`Delete project "${id}" and all its assets? This cannot be undone.`);
      if (!confirmed) return;
      setPendingDeleteId(id);
      try {
        await deleteProjectMutation.mutateAsync(id);
      } finally {
        setPendingDeleteId(null);
      }
    },
    [deleteProjectMutation]
  );

  const assetsQuery = useQuery({
    queryKey: ["image-studio", "assets", projectId],
    enabled: Boolean(projectId),
    queryFn: async (): Promise<StudioAssetsResponse> => {
      try {
        const res = await fetch(`/api/image-studio/projects/${encodeURIComponent(projectId)}/assets`);
        if (!res.ok) throw new Error("Failed to load assets");
        const data = (await res.json()) as StudioAssetsResponse;
        return {
          assets: Array.isArray(data.assets) ? data.assets : [],
          folders: Array.isArray(data.folders) ? data.folders : [],
        };
      } catch (error) {
        logClientError(error, { context: { source: "AdminImageStudioPage", action: "loadAssets", projectId } });
        throw error;
      }
    },
    staleTime: 5_000,
  });

  const uploadMutation = useMutation({
    mutationFn: async (payload: { files: File[]; folder: string }): Promise<void> => {
      if (!projectId) throw new Error("Select or create a project first.");
      const formData = new FormData();
      payload.files.forEach((file: File) => formData.append("files", file));
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

  const createFolderMutation = useMutation({
    mutationFn: async (folder: string): Promise<string> => {
      if (!projectId) throw new Error("Select or create a project first.");
      const res = await fetch(`/api/image-studio/projects/${encodeURIComponent(projectId)}/folders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder }),
      });
      const data = (await res.json().catch(() => null)) as { folder?: string; error?: string } | null;
      if (!res.ok) throw new Error(data?.error || "Failed to create folder");
      if (!data?.folder) throw new Error("Invalid response");
      return data.folder;
    },
    onSuccess: async (folder: string): Promise<void> => {
      queryClient.setQueryData(["image-studio", "assets", projectId], (prev: StudioAssetsResponse | undefined) => {
        const current = prev ?? { assets: [], folders: [] };
        const nextFolders = Array.from(new Set([...(current.folders ?? []), folder])).sort((a: string, b: string) => a.localeCompare(b));
        return { ...current, folders: nextFolders };
      });
      await queryClient.invalidateQueries({ queryKey: ["image-studio", "assets", projectId] });
      setSelectedFolder(folder);
      setNewFolderName("");
      toast("Folder created.", { variant: "success" });
    },
    onError: (error: unknown): void => {
      toast(error instanceof Error ? error.message : "Failed to create folder.", { variant: "error" });
    },
  });

  const deleteAssetMutation = useMutation({
    mutationFn: async (asset: ImageFileRecord): Promise<void> => {
      if (!projectId) throw new Error("Select or create a project first.");
      const res = await fetch(`/api/image-studio/projects/${encodeURIComponent(projectId)}/assets/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: asset.id, filepath: asset.filepath }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "Failed to delete asset");
      }
    },
    onSuccess: async (): Promise<void> => {
      await queryClient.invalidateQueries({ queryKey: ["image-studio", "assets", projectId] });
      await queryClient.invalidateQueries({ queryKey: ["image-studio", "projects"] });
      setSelectedAssetId(null);
      toast("Asset deleted.", { variant: "success" });
    },
    onError: (error: unknown): void => {
      toast(error instanceof Error ? error.message : "Failed to delete asset.", { variant: "error" });
    },
  });

  const moveAssetMutation = useMutation({
    mutationFn: async (payload: { asset: ImageFileRecord; targetFolder: string }): Promise<void> => {
      if (!projectId) throw new Error("Select or create a project first.");
      const res = await fetch(`/api/image-studio/projects/${encodeURIComponent(projectId)}/assets/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: payload.asset.id, filepath: payload.asset.filepath, targetFolder: payload.targetFolder }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "Failed to move asset");
      }
    },
    onSuccess: async (): Promise<void> => {
      await queryClient.invalidateQueries({ queryKey: ["image-studio", "assets", projectId] });
      await queryClient.invalidateQueries({ queryKey: ["image-studio", "projects"] });
      toast("Asset moved.", { variant: "success" });
    },
    onError: (error: unknown): void => {
      toast(error instanceof Error ? error.message : "Failed to move asset.", { variant: "error" });
    },
  });

  const importFromDriveMutation = useMutation({
    mutationFn: async (payload: { files: ImageFileSelection[]; folder: string }): Promise<StudioImportResponse> => {
      if (!projectId) throw new Error("Select or create a project first.");
      const res = await fetch(`/api/image-studio/projects/${encodeURIComponent(projectId)}/assets/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: payload.files, folder: payload.folder }),
      });
      const data = (await res.json().catch(() => null)) as
        | StudioImportResponse
        | { error?: string; failures?: Array<{ filepath: string; error: string }> }
        | null;
      if (!res.ok) {
        if (data && Array.isArray((data as StudioImportResponse).failures)) {
          return {
            uploaded: [],
            failures: (data as StudioImportResponse).failures ?? [],
          };
        }
        if (data && "error" in data && data.error === "No files imported") {
          return {
            uploaded: [],
            failures: Array.isArray(data.failures) ? data.failures : [],
          };
        }
        throw new Error((data && "error" in data && data.error) || "Import failed");
      }
      return (data ?? { uploaded: [], failures: [] }) as StudioImportResponse;
    },
    onSuccess: async (data: StudioImportResponse): Promise<void> => {
      queryClient.setQueryData(["image-studio", "assets", projectId], (prev: StudioAssetsResponse | undefined) => {
        const current = Array.isArray(prev?.assets) ? prev?.assets ?? [] : [];
        if (!data.uploaded.length) {
          return prev ?? { assets: current, folders: [] };
        }
        const byId = new Map<string, ImageFileRecord>();
        current.forEach((asset: ImageFileRecord) => {
          if (asset && asset.id) byId.set(asset.id, asset);
        });
        data.uploaded.forEach((asset: ImageFileRecord) => {
          if (!asset || !asset.id) return;
          byId.set(asset.id, asset);
        });
        return {
          assets: Array.from(byId.values()),
          folders: Array.isArray(prev?.folders) ? prev?.folders : [],
        };
      });
      await queryClient.invalidateQueries({ queryKey: ["image-studio", "assets", projectId] });
      if (!data.uploaded.length) {
        const failure = data.failures?.[0];
        toast(
          failure
            ? `No files imported. ${failure.error}: ${failure.filepath}`
            : "No files imported. Check that selected files are under /uploads and still exist.",
          { variant: "error" }
        );
      } else if (data.failures && data.failures.length > 0) {
        toast(`Imported ${data.uploaded.length} file(s). ${data.failures.length} failed.`, { variant: "info" });
      } else {
        toast("Import complete.", { variant: "success" });
      }
    },
    onError: (error: unknown): void => {
      toast(error instanceof Error ? error.message : "Import failed.", { variant: "error" });
    },
  });

  const assets = useMemo(
    () => normalizeStudioAssets(projectId, assetsQuery.data?.assets ?? []),
    [projectId, assetsQuery.data?.assets]
  );
  const folders = useMemo(
    () => (assetsQuery.data?.folders ?? []),
    [assetsQuery.data?.folders]
  );
  const folderOptions = useMemo(() => {
    const unique = new Set<string>(["", ...folders.filter(Boolean)]);
    return Array.from(unique).sort((a: string, b: string) => a.localeCompare(b));
  }, [folders]);

  const getAssetFolder = useCallback(
    (asset: ImageFileRecord | null): string => {
      if (!asset || !projectId) return "";
      const safeProjectId = sanitizeStudioProjectId(projectId);
      const prefix = `${STUDIO_UPLOAD_PREFIX}${safeProjectId}/`;
      const normalized = normalizeStudioFilepath(safeProjectId, asset.filepath);
      if (!normalized || !normalized.startsWith(prefix)) return "";
      const relative = normalized.slice(prefix.length).replace(/^\/+/, "");
      const parts = relative.split("/").filter(Boolean);
      if (parts.length <= 1) return "";
      return parts.slice(0, -1).join("/");
    },
    [projectId]
  );

  const filteredProjects = useMemo((): string[] => {
    const list = projectsQuery.data ?? [];
    const term = projectSearch.trim().toLowerCase();
    if (!term) return list;
    return list.filter((id: string) => id.toLowerCase().includes(term));
  }, [projectSearch, projectsQuery.data]);

  const selectedAsset = useMemo(() => {
    if (!selectedAssetId) return null;
    return assets.find((a: ImageFileRecord) => a.id === selectedAssetId) ?? null;
  }, [assets, selectedAssetId]);

  useEffect(() => {
    const currentFolder = getAssetFolder(selectedAsset);
    setMoveTargetFolder(currentFolder);
  }, [getAssetFolder, selectedAsset]);

  useEffect(() => {
    setMaskShapes([]);
    setActiveMaskId(null);
  }, [selectedAssetId]);

  const handleSelectAsset = useCallback((asset: ImageFileRecord): void => {
    setSelectedAssetId(asset.id);
  }, []);

  const handleDriveSelection = useCallback(
    async (files: ImageFileSelection[]): Promise<void> => {
      setDriveImportOpen(false);
      if (files.length === 0) return;
      try {
        await importFromDriveMutation.mutateAsync({ files, folder: selectedFolder });
      } catch {
        // Errors are surfaced via toast in onError
      }
    },
    [importFromDriveMutation, selectedFolder]
  );

  const applyProgrammaticExtraction = useCallback((sourcePrompt: string, options?: { toast?: boolean }): ExtractParamsResult => {
    const shouldToast = options?.toast ?? true;
    const result = extractParamsFromPrompt(sourcePrompt);
    setExtractResult(result);
    if (!result.ok) {
      setParamsState(null);
      setParamSpecs(null);
      setPromptSourceAtExtract(null);
      if (shouldToast) toast(result.error, { variant: "error" });
      return result;
    }
    setParamsState(result.params);
    setParamSpecs(inferParamSpecs(result.params, result.rawObjectText));
    setPromptSourceAtExtract(sourcePrompt);
    if (shouldToast) toast("Params extracted.", { variant: "success" });
    return result;
  }, [toast]);

  const runProgrammaticExtraction = useCallback((): void => {
    applyProgrammaticExtraction(promptText);
  }, [applyProgrammaticExtraction, promptText]);

  const autoFormatPrompt = useCallback((): void => {
    if (!promptText.trim()) return;
    const formatted = formatProgrammaticPrompt(promptText, studioSettings.promptValidation);
    if (!formatted.changed) {
      toast("No formatting changes to apply.", { variant: "info" });
      return;
    }

    setPromptText(formatted.prompt);
    const extraction = applyProgrammaticExtraction(formatted.prompt, { toast: false });

    if (extraction.ok) {
      toast(
        `Auto-formatted (${formatted.applied.length} fix(es)). Issues: ${formatted.issuesBefore} → ${formatted.issuesAfter}. Params extracted.`,
        { variant: "success" }
      );
      return;
    }

    toast(
      `Auto-formatted (${formatted.applied.length} fix(es)). Issues: ${formatted.issuesBefore} → ${formatted.issuesAfter}. Extraction still failing: ${extraction.error}`,
      { variant: "error" }
    );
  }, [applyProgrammaticExtraction, promptText, studioSettings.promptValidation, toast]);

  const canManagePatterns = Boolean(
    session?.user?.isElevated || session?.user?.permissions?.includes("ai_paths.manage")
  );

  useEffect(() => {
    setUiSuggestMode(studioSettings.uiExtractor.mode);
  }, [studioSettings.uiExtractor.mode]);

  const buildRuleKey = useCallback((rule: PromptValidationRule, fallback: number): string =>
    rule.id?.trim() ? rule.id : `learned_${fallback}`, []);

  const ruleSignature = useCallback((rule: PromptValidationRule): string => {
    if (rule.kind === "regex") {
      return `regex:${rule.pattern}/${rule.flags}`;
    }
    return `params:${rule.id}`;
  }, []);

  const handleLearnPatterns = useCallback(async (): Promise<void> => {
    if (!promptText.trim()) {
      toast("Paste a prompt first.", { variant: "error" });
      return;
    }
    if (!canManagePatterns) {
      toast("Admin access is required to learn patterns.", { variant: "error" });
      return;
    }
    setLearnOpen(true);
    setLearnLoading(true);
    try {
      const res = await fetch("/api/image-studio/validation-patterns/learn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptText,
          limit: 8,
        }),
      });
      const data = (await res.json().catch(() => null)) as { rules?: PromptValidationRule[]; error?: string } | null;
      if (!res.ok) throw new Error(data?.error || "Failed to learn patterns.");
      const rules = Array.isArray(data?.rules) ? data.rules : [];
      setLearnCandidates(rules);
      const selection: Record<string, boolean> = {};
      rules.forEach((rule: PromptValidationRule, index: number) => {
        selection[buildRuleKey(rule, index)] = true;
      });
      setLearnSelection(selection);
      if (rules.length === 0) {
        toast("No new patterns learned from this prompt.", { variant: "info" });
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to learn patterns.", { variant: "error" });
    } finally {
      setLearnLoading(false);
    }
  }, [buildRuleKey, canManagePatterns, promptText, toast]);

  const handleApplyLearned = useCallback(async (): Promise<void> => {
    const selected = learnCandidates.filter((rule: PromptValidationRule, index: number) =>
      Boolean(learnSelection[buildRuleKey(rule, index)])
    );
    if (selected.length === 0) {
      toast("Select at least one learned pattern.", { variant: "error" });
      return;
    }

    const existingRules = studioSettings.promptValidation.rules;
    const existingLearned = studioSettings.promptValidation.learnedRules ?? [];
    const existingIds = new Set([...existingRules, ...existingLearned].map((rule: PromptValidationRule) => rule.id));
    const existingSignatures = new Set(
      [...existingRules, ...existingLearned].map((rule: PromptValidationRule) => ruleSignature(rule))
    );

    const now = Date.now();
    const nextLearned: PromptValidationRule[] = [];
    selected.forEach((rule: PromptValidationRule, index: number) => {
      let nextRule = rule;
      if (!nextRule.id || existingIds.has(nextRule.id)) {
        nextRule = { ...nextRule, id: `learned.${now}.${index}` };
      }
      if (existingIds.has(nextRule.id)) return;
      if (existingSignatures.has(ruleSignature(nextRule))) return;
      nextLearned.push(nextRule);
    });

    if (nextLearned.length === 0) {
      toast("No new unique patterns to add.", { variant: "info" });
      return;
    }

    const updatedSettings: ImageStudioSettings = {
      ...studioSettings,
      promptValidation: {
        ...studioSettings.promptValidation,
        learnedRules: [...existingLearned, ...nextLearned],
      },
    };

    try {
      await updateSetting.mutateAsync({
        key: IMAGE_STUDIO_SETTINGS_KEY,
        value: serializeSetting(updatedSettings),
      });
      setStudioSettings(updatedSettings);
      toast(`Added ${nextLearned.length} learned pattern(s).`, { variant: "success" });
      setLearnOpen(false);
      setLearnCandidates([]);
      setLearnSelection({});
    } catch (error) {
      logClientError(error, { context: { source: "AdminImageStudioPage", action: "saveLearnedPatterns" } });
      toast("Failed to save learned patterns.", { variant: "error" });
    }
  }, [buildRuleKey, learnCandidates, learnSelection, ruleSignature, studioSettings, toast, updateSetting]);

  const paramLeaves: ParamLeaf[] = useMemo(() => {
    if (!paramsState) return [];
    return flattenParams(paramsState).filter((leaf: ParamLeaf) => Boolean(leaf.path));
  }, [paramsState]);

  useEffect(() => {
    if (!paramsState) return;
    const existingPaths = new Set(paramLeaves.map((leaf: ParamLeaf) => leaf.path));
    setParamUiOverrides((prev: Record<string, ParamUiControl>) => {
      const next: Record<string, ParamUiControl> = {};
      Object.entries(prev).forEach(([path, control]: [string, ParamUiControl]) => {
        if (!existingPaths.has(path)) return;
        next[path] = control;
      });
      return next;
    });
  }, [paramLeaves, paramsState]);

  const buildHeuristicSuggestions = useCallback((): UiSuggestion[] => {
    if (!paramsState) return [];
    return paramLeaves.map((leaf: ParamLeaf) => {
      const spec = paramSpecs?.[leaf.path];
      const rec = recommendParamUiControl(leaf.value, spec);
      return {
        path: leaf.path,
        valuePreview: safeJsonStringify(leaf.value),
        control: rec.recommended,
        options: rec.options,
        confidence: rec.confidence,
        reason: rec.reason,
        source: "heuristic",
      };
    });
  }, [paramLeaves, paramSpecs, paramsState]);

  const buildSuggestionRows = useCallback((heuristic: UiSuggestion[], ai: UiSuggestion[]): UiSuggestionRow[] => {
    const heuristicMap = new Map(heuristic.map((s: UiSuggestion) => [s.path, s]));
    const aiMap = new Map(ai.map((s: UiSuggestion) => [s.path, s]));
    const allPaths = Array.from(new Set([...heuristicMap.keys(), ...aiMap.keys()]));
    return allPaths.map((path: string) => {
      const h = heuristicMap.get(path);
      const a = aiMap.get(path);
      const spec = paramSpecs?.[path];
      const hintParts: string[] = [];
      if (spec?.kind) hintParts.push(`kind: ${spec.kind}`);
      if (typeof spec?.min === "number" || typeof spec?.max === "number") {
        hintParts.push(`range: ${spec?.min ?? "?"}–${spec?.max ?? "?"}`);
      }
      if (spec?.enumOptions?.length) {
        hintParts.push(`enum: ${spec.enumOptions.length} option(s)`);
      }
      const hint = hintParts.length > 0 ? hintParts.join(" • ") : null;
      const selected = a?.control ?? h?.control ?? "auto";
      return {
        path,
        valuePreview: h?.valuePreview ?? a?.valuePreview ?? "",
        hint,
        ...(h ? { heuristic: h } : {}),
        ...(a ? { ai: a } : {}),
        selected,
        apply: true,
      };
    });
  }, [paramSpecs]);

  const handleSuggestUi = useCallback(async (): Promise<void> => {
    if (!paramsState || paramLeaves.length === 0) {
      toast("Extract params first so we can infer UI controls.", { variant: "error" });
      return;
    }
    setUiSuggestOpen(true);
    setUiSuggestLoading(true);
    try {
      const heuristic = uiSuggestMode === "heuristic" || uiSuggestMode === "both"
        ? buildHeuristicSuggestions()
        : [];
      let ai: UiSuggestion[] = [];
      if (uiSuggestMode === "ai" || uiSuggestMode === "both") {
        const res = await fetch("/api/image-studio/ui-extractor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: promptText,
            params: paramLeaves.map((leaf: ParamLeaf) => ({
              path: leaf.path,
              value: leaf.value,
              spec: paramSpecs?.[leaf.path] ?? null,
            })),
            mode: uiSuggestMode,
          }),
        });
        const data = (await res.json().catch(() => null)) as { suggestions?: UiSuggestion[]; error?: string } | null;
        if (!res.ok) throw new Error(data?.error || "Failed to extract UI suggestions.");
        ai = Array.isArray(data?.suggestions) ? data.suggestions : [];
      }
      setUiSuggestionRows(buildSuggestionRows(heuristic, ai));
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to extract UI suggestions.", { variant: "error" });
    } finally {
      setUiSuggestLoading(false);
    }
  }, [buildHeuristicSuggestions, buildSuggestionRows, paramLeaves, paramSpecs, paramsState, promptText, toast, uiSuggestMode]);

  const handleApplyUiSuggestions = useCallback((): void => {
    const toApply = uiSuggestionRows.filter((row: UiSuggestionRow) => {
      if (!row.apply) return false;
      const confidence = Math.max(row.ai?.confidence ?? 0, row.heuristic?.confidence ?? 0);
      return confidence >= uiSuggestMinConfidence;
    });
    if (toApply.length === 0) {
      toast("Select at least one suggestion to apply.", { variant: "error" });
      return;
    }
    setParamUiOverrides((prev: Record<string, ParamUiControl>) => {
      const next = { ...prev };
      toApply.forEach((row: UiSuggestionRow) => {
        if (row.selected === "auto") {
          delete next[row.path];
        } else {
          next[row.path] = row.selected;
        }
      });
      return next;
    });
    toast(`Applied ${toApply.length} UI suggestion(s).`, { variant: "success" });
    setUiSuggestOpen(false);
  }, [toast, uiSuggestionRows, uiSuggestMinConfidence]);

  const addMaskFromBbox = useCallback((bbox: { x: number; y: number; w: number; h: number }, name: string): void => {
    const minX = clamp01(bbox.x);
    const minY = clamp01(bbox.y);
    const maxX = clamp01(bbox.x + bbox.w);
    const maxY = clamp01(bbox.y + bbox.h);
    const newShape: MaskShape = {
      id: `shape_${Date.now().toString(36)}`,
      name,
      type: "rect",
      points: [{ x: minX, y: minY }, { x: maxX, y: maxY }],
      closed: true,
      visible: true,
    };
    setMaskShapes((prev: MaskShape[]) => [...prev, newShape]);
    setActiveMaskId(newShape.id);
  }, []);

  const addMaskFromPolygon = useCallback((points: Point[], name: string): void => {
    if (points.length < 3) return;
    const clamped = points.map((p: Point) => ({ x: clamp01(p.x), y: clamp01(p.y) }));
    const newShape: MaskShape = {
      id: `shape_${Date.now().toString(36)}`,
      name,
      type: "polygon",
      points: clamped,
      closed: true,
      visible: true,
    };
    setMaskShapes((prev: MaskShape[]) => [...prev, newShape]);
    setActiveMaskId(newShape.id);
  }, []);

  const handleGenerateMask = useCallback(async (mode: "threshold" | "edges" | "ai-bbox" | "ai-polygon"): Promise<void> => {
    if (!selectedAsset?.filepath) {
      toast("Select an image first.", { variant: "error" });
      return;
    }
    setMaskGenLoading(true);
    try {
      let bbox: { x: number; y: number; w: number; h: number } | null = null;
      let polygon: Point[] | null = null;
      if (mode === "threshold") {
        bbox = await computeBboxFromThreshold(selectedAsset.filepath);
      } else if (mode === "edges") {
        bbox = await computeBboxFromEdges(selectedAsset.filepath);
      } else {
        const res = await fetch("/api/image-studio/mask/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imagePath: selectedAsset.filepath, mode: mode === "ai-polygon" ? "polygon" : "bbox" }),
        });
        const data = (await res.json().catch(() => null)) as { bbox?: { x: number; y: number; w: number; h: number }; polygon?: Point[]; error?: string } | null;
        if (!res.ok) throw new Error(data?.error || "AI mask generation failed.");
        bbox = data?.bbox ?? null;
        polygon = data?.polygon ?? null;
      }
      if (polygon && polygon.length >= 3) {
        addMaskFromPolygon(polygon, "AI polygon");
      } else if (bbox) {
        addMaskFromBbox(bbox, mode === "ai-bbox" ? "AI bbox" : mode === "edges" ? "Edge mask" : "Threshold mask");
      } else {
        toast("Could not detect a subject. Try another mode.", { variant: "error" });
        return;
      }
      toast("Mask generated.", { variant: "success" });
      setMaskGenOpen(false);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to generate mask.", { variant: "error" });
    } finally {
      setMaskGenLoading(false);
    }
  }, [addMaskFromBbox, addMaskFromPolygon, selectedAsset?.filepath, toast]);

  const handleAdvancedOverridesChange = useCallback((raw: string): void => {
    setAdvancedOverridesText(raw);
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed === null) {
        setAdvancedOverridesError(null);
        setStudioSettings((prev: ImageStudioSettings) => ({
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
      setStudioSettings((prev: ImageStudioSettings) => ({
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

  const handlePromptValidationRulesChange = useCallback((raw: string): void => {
    setPromptValidationRulesText(raw);
    const parsed = parsePromptValidationRules(raw);
    if (!parsed.ok) {
      setPromptValidationRulesError(parsed.error);
      return;
    }
    setPromptValidationRulesError(null);
    setStudioSettings((prev: ImageStudioSettings) => ({
      ...prev,
      promptValidation: { ...prev.promptValidation, rules: parsed.rules },
    }));
  }, []);

  const saveStudioSettings = useCallback(async (): Promise<void> => {
    if (advancedOverridesError) {
      toast(`Settings not saved: ${advancedOverridesError}`, { variant: "error" });
      return;
    }
    if (promptValidationRulesError) {
      toast(`Settings not saved: ${promptValidationRulesError}`, { variant: "error" });
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
      logClientError(error, { context: { source: "AdminImageStudioPage", action: "saveSettings" } });
      toast("Failed to save Image Studio settings.", { variant: "error" });
    }
  }, [advancedOverridesError, promptValidationRulesError, studioSettings, toast, updateSetting]);

  const resetStudioSettings = useCallback((): void => {
    setStudioSettings(defaultImageStudioSettings);
    setAdvancedOverridesText(JSON.stringify(defaultImageStudioSettings.targetAi.openai.advanced_overrides ?? {}, null, 2));
    setAdvancedOverridesError(null);
    setPromptValidationRulesText(JSON.stringify(defaultImageStudioSettings.promptValidation.rules, null, 2));
    setPromptValidationRulesError(null);
  }, []);

  const handleRefreshSettings = useCallback((): void => {
    setSettingsLoaded(false);
    void settingsQuery.refetch();
  }, [settingsQuery]);

  const validationIssues: ParamIssue[] = useMemo(() => {
    if (!paramsState || !paramSpecs) return [];
    return validateImageStudioParams(paramsState, paramSpecs);
  }, [paramsState, paramSpecs]);

  const issuesByPath = useMemo(() => {
    const map: Record<string, ParamIssue[]> = {};
    validationIssues.forEach((issue: ParamIssue) => {
      map[issue.path] ??= [];
      map[issue.path]!.push(issue);
    });
    return map;
  }, [validationIssues]);

  const validationSummary = useMemo(() => {
    const errors = validationIssues.filter((i: ParamIssue) => i.severity === "error").length;
    const warnings = validationIssues.filter((i: ParamIssue) => i.severity === "warning").length;
    return { errors, warnings };
  }, [validationIssues]);

  const maskPolygons = useMemo<Point[][]>(() => {
    const polygons: Point[][] = [];
    maskShapes.forEach((shape: MaskShape) => {
      if (!shape.visible) return;
      if (shape.type === "polygon" || shape.type === "lasso" || shape.type === "brush") {
        if (shape.closed && shape.points.length >= 3) polygons.push(shape.points);
        return;
      }
      if (shape.type === "rect" && shape.points.length >= 2) {
        const a = shape.points[0]!;
        const b = shape.points[1]!;
        const minX = Math.min(a.x, b.x);
        const maxX = Math.max(a.x, b.x);
        const minY = Math.min(a.y, b.y);
        const maxY = Math.max(a.y, b.y);
        polygons.push([
          { x: minX, y: minY },
          { x: maxX, y: minY },
          { x: maxX, y: maxY },
          { x: minX, y: maxY },
        ]);
        return;
      }
      if (shape.type === "ellipse" && shape.points.length >= 2) {
        const a = shape.points[0]!;
        const b = shape.points[1]!;
        const cx = (a.x + b.x) / 2;
        const cy = (a.y + b.y) / 2;
        const rx = Math.abs(a.x - b.x) / 2;
        const ry = Math.abs(a.y - b.y) / 2;
        const steps = 24;
        const pts: Point[] = [];
        for (let i = 0; i < steps; i += 1) {
          const theta = (i / steps) * Math.PI * 2;
          pts.push({ x: cx + Math.cos(theta) * rx, y: cy + Math.sin(theta) * ry });
        }
        polygons.push(pts);
      }
    });
    return polygons;
  }, [maskShapes]);

  const generatedPrompt = useMemo(() => {
    if (!extractResult || !extractResult.ok || !paramsState || !promptSourceAtExtract) return "";
    const json = JSON.stringify(paramsState, null, 2);
    return `${promptSourceAtExtract.slice(0, extractResult.objectStart)}${json}${promptSourceAtExtract.slice(extractResult.objectEnd)}`;
  }, [extractResult, paramsState, promptSourceAtExtract]);

  const promptValidationIssues: PromptValidationIssue[] = useMemo(() => {
    if (studioSettings.promptExtraction.mode !== "programmatic") return [];
    return validateProgrammaticPrompt(promptText, studioSettings.promptValidation);
  }, [promptText, studioSettings.promptExtraction.mode, studioSettings.promptValidation]);

  const runPayload = useMemo(() => {
    return {
      projectId: projectId || null,
      asset: selectedAsset ? { id: selectedAsset.id, filepath: selectedAsset.filepath } : null,
      mask: maskPolygons.length > 0 ? { type: "polygons", polygons: maskPolygons, invert: maskInvert, feather: maskFeather } : null,
      prompt: generatedPrompt || promptText || null,
      extractedParams: paramsState,
      studioSettings,
    };
  }, [projectId, selectedAsset, maskPolygons, maskInvert, maskFeather, generatedPrompt, promptText, paramsState, studioSettings]);

  const runMutation = useMutation({
    mutationFn: async (): Promise<StudioRunResponse> => {
      if (!projectId) throw new Error("Select a project first.");
      if (!selectedAsset) throw new Error("Select an image asset first.");
      const prompt = (generatedPrompt || promptText || "").trim();
      if (!prompt) throw new Error("Prompt is required.");

      const payload = {
        projectId,
        asset: { id: selectedAsset.id, filepath: selectedAsset.filepath },
        mask: maskPolygons.length > 0
          ? { type: "polygons", polygons: maskPolygons, invert: maskInvert, feather: maskFeather }
          : null,
        prompt,
        extractedParams: paramsState,
        studioSettings,
      };

      const res = await fetch("/api/image-studio/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => null)) as StudioRunResponse | { error?: string } | null;
      if (!res.ok) {
        throw new Error((data && "error" in data && data.error) || "Run failed");
      }
      return (data ?? { outputs: [] }) as StudioRunResponse;
    },
    onSuccess: async (data: StudioRunResponse): Promise<void> => {
      await queryClient.invalidateQueries({ queryKey: ["image-studio", "assets", projectId] });
      await queryClient.invalidateQueries({ queryKey: ["image-studio", "projects"] });
      const outputs = data.outputs ?? [];
      if (outputs.length > 0) {
        const output = outputs[0]!;
        setSelectedAssetId(output.id);
        const safeProjectId = sanitizeStudioProjectId(projectId);
        const prefix = `${STUDIO_UPLOAD_PREFIX}${safeProjectId}/`;
        const normalizedOutputPath = normalizeStudioFilepath(safeProjectId, output.filepath);
        const relative =
          normalizedOutputPath && normalizedOutputPath.startsWith(prefix)
            ? normalizedOutputPath.slice(prefix.length)
            : "";
        const parts = relative.split("/").filter(Boolean);
        if (parts.length > 1) {
          setSelectedFolder(parts.slice(0, -1).join("/"));
        }
      }
      toast(`Run complete. ${outputs.length} image(s) added.`, { variant: "success" });
    },
    onError: (error: unknown): void => {
      toast(error instanceof Error ? error.message : "Run failed.", { variant: "error" });
    },
  });

  const settingsPanel = (
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
            disabled={updateSetting.isPending || Boolean(advancedOverridesError) || Boolean(promptValidationRulesError)}
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
                onValueChange={(value: string) =>
                  setStudioSettings((prev: ImageStudioSettings) => ({
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
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setStudioSettings((prev: ImageStudioSettings) => ({
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
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const raw = e.target.value;
                  const next = raw === "" ? null : Number(raw);
                  if (raw !== "" && !Number.isFinite(next)) return;
                  setStudioSettings((prev: ImageStudioSettings) => ({
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
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const raw = e.target.value;
                  const next = raw === "" ? null : Number(raw);
                  if (raw !== "" && !Number.isFinite(next)) return;
                  setStudioSettings((prev: ImageStudioSettings) => ({
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
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const raw = e.target.value;
                  const next = raw === "" ? null : Number(raw);
                  if (raw !== "" && (!Number.isFinite(next) || !Number.isInteger(next))) return;
                  setStudioSettings((prev: ImageStudioSettings) => ({
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
          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs text-gray-400">Prompt Validator</Label>
            <label className="flex items-center gap-2 text-xs text-gray-200">
              <input
                type="checkbox"
                checked={studioSettings.promptValidation.enabled}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setStudioSettings((prev: ImageStudioSettings) => ({
                    ...prev,
                    promptValidation: { ...prev.promptValidation, enabled: e.target.checked },
                  }))
                }
              />
              Enabled
            </label>
          </div>
          <div className="text-[11px] text-gray-500">
            Validates programmatic prompts and suggests fixes when patterns look almost correct. Auto format uses each rule’s <span className="text-gray-300">autofix</span> operations, and falls back to <span className="text-gray-300">similar</span> suggestions when they contain backticked replacements.
          </div>
          <Textarea
            value={promptValidationRulesText}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handlePromptValidationRulesChange(e.target.value)}
            className="h-40 font-mono text-[11px]"
            placeholder="JSON array of validator rules"
          />
          {promptValidationRulesError ? (
            <div className="text-[11px] text-red-300">{promptValidationRulesError}</div>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-gray-400">UI Extractor</Label>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <div className="text-[11px] text-gray-500">Mode</div>
              <Select
                value={studioSettings.uiExtractor.mode}
                onValueChange={(value: string) =>
                  setStudioSettings((prev: ImageStudioSettings) => ({
                    ...prev,
                    uiExtractor: {
                      ...prev.uiExtractor,
                      mode: value === "ai" || value === "both" ? value : "heuristic",
                    },
                  }))
                }
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="heuristic">Heuristic</SelectItem>
                  <SelectItem value="ai">AI</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <div className="text-[11px] text-gray-500">Model</div>
              <Input
                value={studioSettings.uiExtractor.model}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setStudioSettings((prev: ImageStudioSettings) => ({
                    ...prev,
                    uiExtractor: { ...prev.uiExtractor, model: e.target.value },
                  }))
                }
                className="h-8"
                placeholder="e.g. gpt-4o-mini"
              />
            </div>
            <div className="space-y-1">
              <div className="text-[11px] text-gray-500">Temperature</div>
              <Input
                type="number"
                value={studioSettings.uiExtractor.temperature ?? ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const next = e.target.value === "" ? null : Number(e.target.value);
                  setStudioSettings((prev: ImageStudioSettings) => ({
                    ...prev,
                    uiExtractor: { ...prev.uiExtractor, temperature: Number.isFinite(next as number) ? next : null },
                  }));
                }}
                className="h-8"
                step={0.1}
                min={0}
              />
            </div>
            <div className="space-y-1">
              <div className="text-[11px] text-gray-500">Max tokens</div>
              <Input
                type="number"
                value={studioSettings.uiExtractor.max_output_tokens ?? ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const next = e.target.value === "" ? null : Number(e.target.value);
                  setStudioSettings((prev: ImageStudioSettings) => ({
                    ...prev,
                    uiExtractor: { ...prev.uiExtractor, max_output_tokens: Number.isFinite(next as number) ? next : null },
                  }));
                }}
                className="h-8"
                min={1}
                step={1}
              />
            </div>
          </div>
          <div className="text-[11px] text-gray-500">
            Suggests UI controls for extracted params using heuristic rules, AI, or both.
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-gray-400">Target AI (OpenAI / GPT)</Label>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <div className="text-[11px] text-gray-500">API</div>
              <Select
                value={studioSettings.targetAi.openai.api}
                onValueChange={(value: string) =>
                  setStudioSettings((prev: ImageStudioSettings) => ({
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
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setStudioSettings((prev: ImageStudioSettings) => ({
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
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const raw = e.target.value;
                  const next = raw === "" ? null : Number(raw);
                  if (raw !== "" && !Number.isFinite(next)) return;
                  setStudioSettings((prev: ImageStudioSettings) => ({
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
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const raw = e.target.value;
                  const next = raw === "" ? null : Number(raw);
                  if (raw !== "" && !Number.isFinite(next)) return;
                  setStudioSettings((prev: ImageStudioSettings) => ({
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
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const raw = e.target.value;
                  const next = raw === "" ? null : Number(raw);
                  if (raw !== "" && (!Number.isFinite(next) || !Number.isInteger(next))) return;
                  setStudioSettings((prev: ImageStudioSettings) => ({
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
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const raw = e.target.value;
                  const next = raw === "" ? null : Number(raw);
                  if (raw !== "" && (!Number.isFinite(next) || !Number.isInteger(next))) return;
                  setStudioSettings((prev: ImageStudioSettings) => ({
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
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const raw = e.target.value;
                  const next = raw === "" ? null : Number(raw);
                  if (raw !== "" && !Number.isFinite(next)) return;
                  setStudioSettings((prev: ImageStudioSettings) => ({
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
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const raw = e.target.value;
                  const next = raw === "" ? null : Number(raw);
                  if (raw !== "" && !Number.isFinite(next)) return;
                  setStudioSettings((prev: ImageStudioSettings) => ({
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
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setStudioSettings((prev: ImageStudioSettings) => ({
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
                onValueChange={(value: string) =>
                  setStudioSettings((prev: ImageStudioSettings) => ({
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
                onValueChange={(value: string) =>
                  setStudioSettings((prev: ImageStudioSettings) => ({
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
                onValueChange={(value: string) =>
                  setStudioSettings((prev: ImageStudioSettings) => ({
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
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setStudioSettings((prev: ImageStudioSettings) => ({
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
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setStudioSettings((prev: ImageStudioSettings) => ({
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
                    onValueChange={(value: string) =>
                      setStudioSettings((prev: ImageStudioSettings) => ({
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
                    onValueChange={(value: string) =>
                      setStudioSettings((prev: ImageStudioSettings) => ({
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
                    onValueChange={(value: string) =>
                      setStudioSettings((prev: ImageStudioSettings) => ({
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
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const raw = e.target.value;
                      const next = raw === "" ? null : Number(raw);
                      if (raw !== "" && (!Number.isFinite(next) || !Number.isInteger(next))) return;
                      setStudioSettings((prev: ImageStudioSettings) => ({
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
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleAdvancedOverridesChange(e.target.value)}
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
  );

  return (
    <div className="container mx-auto max-w-none space-y-6 py-10">
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => {
            void queryClient.invalidateQueries({ queryKey: ["image-studio"] });
          }}
        >
          <RefreshCcw className="mr-2 size-4" />
          Refresh
        </Button>
        <Button
          variant="outline"
          onClick={() => setIsFocusMode((prev: boolean) => !prev)}
        >
          {isFocusMode ? <Minimize2 className="mr-2 size-4" /> : <Maximize2 className="mr-2 size-4" />}
          {isFocusMode ? "Edit" : "Show"}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsContent value="studio">

      <SharedModal
        open={driveImportOpen}
        onClose={() => setDriveImportOpen(false)}
        title="Import from Drive"
        size="xl"
      >
        <FileManager
          mode="select"
          selectionMode="multiple"
          onSelectFile={(files: ImageFileSelection[]) => void handleDriveSelection(files)}
        />
      </SharedModal>

      <SharedModal
        open={learnOpen}
        onClose={() => setLearnOpen(false)}
        title="Learn patterns from prompt"
        size="lg"
      >
        <div className="space-y-3 text-sm text-gray-200">
          {learnLoading ? (
            <div className="rounded border border-dashed border-border p-4 text-center text-gray-400">
              Learning patterns from the prompt…
            </div>
          ) : learnCandidates.length === 0 ? (
            <div className="rounded border border-dashed border-border p-4 text-center text-gray-400">
              No learned patterns to review yet.
            </div>
          ) : (
            <div className="space-y-3">
              {learnCandidates.map((rule: PromptValidationRule, index: number) => {
                const key = buildRuleKey(rule, index);
                return (
                  <div key={key} className="rounded border border-border bg-card/40 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <label className="flex items-start gap-2 text-xs text-gray-200">
                        <input
                          type="checkbox"
                          checked={Boolean(learnSelection[key])}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setLearnSelection((prev: Record<string, boolean>) => ({ ...prev, [key]: e.target.checked }))
                          }
                        />
                        <span>
                          <div className="text-sm text-gray-100">{rule.title}</div>
                          <div className="text-[11px] text-gray-400">ID: {rule.id}</div>
                        </span>
                      </label>
                      <span className="rounded-full border border-border bg-card/60 px-2 py-0.5 text-[10px] text-gray-300">
                        {rule.kind}
                      </span>
                    </div>
                    {rule.kind === "regex" ? (
                      <div className="mt-2 rounded border border-border bg-card/50 p-2 font-mono text-[11px] text-gray-200">
                        {rule.pattern}
                        <span className="text-gray-400">{rule.flags?.trim() ? `/${rule.flags}` : ""}</span>
                      </div>
                    ) : null}
                    <div className="mt-2 text-[11px] text-gray-400">{rule.message}</div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setLearnSelection((prev: Record<string, boolean>) => {
                  const next = { ...prev };
                  learnCandidates.forEach((rule: PromptValidationRule, index: number) => {
                    next[buildRuleKey(rule, index)] = true;
                  });
                  return next;
                })
              }
              disabled={learnCandidates.length === 0}
            >
              Select all
            </Button>
            <Button type="button" onClick={() => void handleApplyLearned()} disabled={learnCandidates.length === 0}>
              Add selected
            </Button>
          </div>
        </div>
      </SharedModal>

      <SharedModal
        open={uiSuggestOpen}
        onClose={() => setUiSuggestOpen(false)}
        title="UI Extractor Suggestions"
        size="lg"
      >
        <div className="space-y-3 text-sm text-gray-200">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-[11px] text-gray-400">Mode</div>
            <Select
              value={uiSuggestMode}
              onValueChange={(value: string) =>
                setUiSuggestMode(value === "ai" || value === "both" ? value : "heuristic")
              }
            >
              <SelectTrigger className="h-8 w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="heuristic">Heuristic</SelectItem>
                <SelectItem value="ai">AI</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <div className="text-[11px] text-gray-400">Min confidence</div>
              <Input
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={uiSuggestMinConfidence}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const next = Number(e.target.value);
                  setUiSuggestMinConfidence(Number.isFinite(next) ? Math.max(0, Math.min(1, next)) : 0.5);
                }}
                className="h-8 w-20"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void handleSuggestUi()}
              disabled={uiSuggestLoading}
            >
              Refresh
            </Button>
          </div>

          {uiSuggestLoading ? (
            <div className="rounded border border-dashed border-border p-4 text-center text-gray-400">
              Extracting UI suggestions…
            </div>
          ) : uiSuggestionRows.length === 0 ? (
            <div className="rounded border border-dashed border-border p-4 text-center text-gray-400">
              No suggestions yet. Click “Refresh” to run the extractor.
            </div>
          ) : (
            <div className="space-y-3">
              {uiSuggestionRows.map((row: UiSuggestionRow) => {
                const selected = row.selected;
                const options = row.heuristic?.options?.length ? row.heuristic.options : row.ai?.options ?? ["auto"];
                const uniqueOptions = Array.from(new Set(options)).filter(isParamUiControl);
                const best = row.ai?.confidence && row.heuristic?.confidence
                  ? (row.ai.confidence >= row.heuristic.confidence ? "ai" : "heuristic")
                  : row.ai?.confidence
                    ? "ai"
                    : "heuristic";
                const bestConfidence = Math.max(row.ai?.confidence ?? 0, row.heuristic?.confidence ?? 0);
                return (
                  <div key={row.path} className="rounded border border-border bg-card/40 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <label className="flex items-start gap-2 text-xs text-gray-200">
                        <input
                          type="checkbox"
                          checked={row.apply}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setUiSuggestionRows((prev: UiSuggestionRow[]) =>
                              prev.map((item: UiSuggestionRow) => (item.path === row.path ? { ...item, apply: e.target.checked } : item))
                            )
                          }
                        />
                        <span>
                          <div className="text-sm text-gray-100">{row.path}</div>
                          <div className="text-[11px] text-gray-400 truncate">
                            {row.valuePreview}
                          </div>
                          {row.hint ? (
                            <div className="text-[11px] text-gray-500">{row.hint}</div>
                          ) : null}
                        </span>
                      </label>
                      <span className="rounded-full border border-border bg-card/60 px-2 py-0.5 text-[10px] text-gray-300">
                        {best === "ai" ? "AI" : "Heuristic"} · {bestConfidence.toFixed(2)}
                      </span>
                    </div>

                    <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                      <div className="space-y-1 text-[11px] text-gray-400">
                        {row.ai?.reason ? <div><span className="text-gray-300">AI:</span> {row.ai.reason}</div> : null}
                        {row.heuristic?.reason ? <div><span className="text-gray-300">Heuristic:</span> {row.heuristic.reason}</div> : null}
                        {!row.ai?.reason && !row.heuristic?.reason ? (
                          <div>Suggested UI control for this parameter.</div>
                        ) : null}
                      </div>
                      <Select
                        value={selected}
                        onValueChange={(value: string) =>
                          setUiSuggestionRows((prev: UiSuggestionRow[]) =>
                            prev.map((item: UiSuggestionRow) =>
                              item.path === row.path && isParamUiControl(value)
                                ? { ...item, selected: value }
                                : item
                            )
                          )
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {uniqueOptions.map((option: ParamUiControl) => (
                            <SelectItem key={option} value={option}>
                              {paramUiControlLabel(option)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {row.heuristic?.control ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setUiSuggestionRows((prev: UiSuggestionRow[]) =>
                              prev.map((item: UiSuggestionRow) =>
                                item.path === row.path ? { ...item, selected: row.heuristic!.control } : item
                              )
                            )
                          }
                        >
                          Use heuristic
                        </Button>
                      ) : null}
                      {row.ai?.control ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setUiSuggestionRows((prev: UiSuggestionRow[]) =>
                              prev.map((item: UiSuggestionRow) =>
                                item.path === row.path ? { ...item, selected: row.ai!.control } : item
                              )
                            )
                          }
                        >
                          Use AI
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setUiSuggestionRows((prev: UiSuggestionRow[]) =>
                            prev.map((item: UiSuggestionRow) =>
                              item.path === row.path ? { ...item, selected: "auto" } : item
                            )
                          )
                        }
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setUiSuggestionRows((prev: UiSuggestionRow[]) => prev.map((row: UiSuggestionRow) => ({ ...row, apply: true })))
              }
              disabled={uiSuggestionRows.length === 0}
            >
              Select all
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setUiSuggestionRows((prev: UiSuggestionRow[]) =>
                  prev.map((row: UiSuggestionRow) => {
                    const best = row.ai?.confidence && row.heuristic?.confidence
                      ? (row.ai.confidence >= row.heuristic.confidence ? row.ai.control : row.heuristic.control)
                      : row.ai?.control ?? row.heuristic?.control ?? row.selected;
                    return { ...row, selected: best };
                  })
                )
              }
              disabled={uiSuggestionRows.length === 0}
            >
              Use best
            </Button>
            <Button type="button" onClick={handleApplyUiSuggestions} disabled={uiSuggestionRows.length === 0}>
              Apply selected
            </Button>
          </div>
        </div>
      </SharedModal>


      <div
        className={cn(
          "grid transition-[grid-template-columns] duration-300 ease-in-out",
          isFocusMode ? "grid-cols-[56px_0px_1fr_0px] gap-0" : "grid-cols-[56px_300px_1fr_420px] gap-4"
        )}
      >
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
          <Select
            value={maskGenMode}
            onValueChange={(value: string) => {
              if (value === "ai-bbox" || value === "threshold" || value === "edges") {
                setMaskGenMode(value);
                return;
              }
              setMaskGenMode("ai-polygon");
            }}
          >
            <SelectTrigger className="h-8 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ai-polygon">AI polygon</SelectItem>
              <SelectItem value="ai-bbox">AI bbox</SelectItem>
              <SelectItem value="threshold">Threshold</SelectItem>
              <SelectItem value="edges">Edges</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full justify-center"
            onClick={() => void handleGenerateMask(maskGenMode)}
            disabled={maskGenLoading}
            title="Generate mask"
          >
            {maskGenLoading ? "Generating..." : "Generate"}
          </Button>
          <Button
            type="button"
            variant={tool === "lasso" ? "default" : "outline"}
            size="sm"
            className="w-full justify-center"
            onClick={() => setTool("lasso")}
            title="Lasso mask"
          >
            Lasso
          </Button>
          <Button
            type="button"
            variant={tool === "rect" ? "default" : "outline"}
            size="sm"
            className="w-full justify-center"
            onClick={() => setTool("rect")}
            title="Rectangle mask"
          >
            Rect
          </Button>
          <Button
            type="button"
            variant={tool === "ellipse" ? "default" : "outline"}
            size="sm"
            className="w-full justify-center"
            onClick={() => setTool("ellipse")}
            title="Ellipse mask"
          >
            Ellipse
          </Button>
          <Button
            type="button"
            variant={tool === "brush" ? "default" : "outline"}
            size="sm"
            className="w-full justify-center"
            onClick={() => setTool("brush")}
            title="Brush mask"
          >
            Brush
          </Button>
          <div className="mt-2 h-px w-full bg-border" />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full justify-center"
            onClick={() => {
              if (!activeMaskId) return;
              setMaskShapes((prev: MaskShape[]) =>
                prev.map((shape: MaskShape) =>
                  shape.id === activeMaskId
                    ? { ...shape, points: shape.points.slice(0, -1), closed: false }
                    : shape
                )
              );
            }}
            disabled={!activeMaskId}
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
              if (!activeMaskId) return;
              setMaskShapes((prev: MaskShape[]) =>
                prev.map((shape: MaskShape) =>
                  shape.id === activeMaskId ? { ...shape, closed: shape.points.length >= 3 } : shape
                )
              );
            }}
            disabled={!activeMaskId}
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
              if (!activeMaskId) return;
              setMaskShapes((prev: MaskShape[]) =>
                prev.map((shape: MaskShape) => {
                  if (shape.id !== activeMaskId) return shape;
                  if (!shape.closed) return shape;
                  if (shape.points.length < 3) return { ...shape, closed: false };
                  if (selectedPointIndex === null) return { ...shape, closed: false };
                  const pts = shape.points;
                  const rotated = [...pts.slice(selectedPointIndex), ...pts.slice(0, selectedPointIndex)];
                  return { ...shape, points: rotated, closed: false };
                })
              );
            }}
            disabled={!activeMaskId}
            title="Detach polygon (open at selected point)"
          >
            Detach
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full justify-center"
            onClick={() => {
              setMaskShapes([]);
              setActiveMaskId(null);
            }}
            disabled={maskShapes.length === 0}
            title="Clear all masks"
          >
            Clear
          </Button>
        </SectionPanel>

        {/* Project + Assets */}
        <SectionPanel
          className={cn(
            "flex h-[72vh] flex-col gap-3 overflow-hidden transition-all duration-300 ease-in-out",
            isFocusMode && "pointer-events-none opacity-0 -translate-x-2"
          )}
          variant="subtle"
          aria-hidden={isFocusMode}
        >
          <div className="space-y-2">
            <Label className="text-xs text-gray-400">Project</Label>
            <div className="flex items-center gap-2">
              <Select
                value={projectId || "__none__"}
                onValueChange={(value: string) => {
                  hasManualProjectSelectionRef.current = true;
                  setProjectId(value === "__none__" ? "" : value);
                }}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder={projectsQuery.isLoading ? "Loading..." : "Select project"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No project</SelectItem>
                  {(projectsQuery.data ?? []).map((id: string) => (
                    <SelectItem key={id} value={id}>
                      {id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { void projectsQuery.refetch(); }}
                title="Reload projects"
              >
                <RefreshCcw className="size-4" />
              </Button>
            </div>
            {!projectId ? (
              <div className="text-[11px] text-amber-200">
                Select or create a project to enable uploads and imports.
              </div>
            ) : null}

            <div className="flex items-center gap-2">
              <Input
                value={newProjectId}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewProjectId(e.target.value)}
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
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDriveImportOpen(true)}
                  disabled={!projectId || importFromDriveMutation.isPending}
                  title="Import existing images from Drive"
                >
                  <Folder className="mr-2 size-4" />
                  Drive
                </Button>
                <FileUploadButton
                  variant="outline"
                  size="sm"
                  accept="image/*"
                  multiple
                  disabled={!projectId || uploadMutation.isPending}
                  onFilesSelected={async (files: File[]) => {
                    await uploadMutation.mutateAsync({ files, folder: selectedFolder });
                  }}
                >
                  <Upload className="mr-2 size-4" />
                  Upload
                </FileUploadButton>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Input
                value={newFolderName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewFolderName(e.target.value)}
                placeholder="New folder (e.g. banners/home)"
                className="h-8"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!projectId || !newFolderName.trim() || createFolderMutation.isPending}
                onClick={() => void createFolderMutation.mutateAsync(newFolderName)}
              >
                Create folder
              </Button>
            </div>
            {selectedAsset ? (
              <div className="space-y-2">
                <div className="text-[11px] text-gray-400">Selected asset actions</div>
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <Select
                    value={moveTargetFolder === "" ? "__root__" : moveTargetFolder}
                    onValueChange={(value: string) => {
                      setMoveTargetFolder(value === "__root__" ? "" : value);
                    }}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Move to folder" />
                    </SelectTrigger>
                    <SelectContent>
                      {folderOptions.map((folder: string) => (
                        <SelectItem key={folder || "__root__"} value={folder || "__root__"}>
                          {folder || "(root)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={
                      moveAssetMutation.isPending ||
                      getAssetFolder(selectedAsset) === moveTargetFolder
                    }
                    onClick={() => {
                      void moveAssetMutation.mutateAsync({ asset: selectedAsset, targetFolder: moveTargetFolder });
                    }}
                  >
                    Move
                  </Button>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="w-full text-red-300 hover:text-red-200"
                  disabled={deleteAssetMutation.isPending}
                  onClick={() => {
                    const confirmed = window.confirm(`Delete "${selectedAsset.filename}"? This cannot be undone.`);
                    if (!confirmed) return;
                    void deleteAssetMutation.mutateAsync(selectedAsset);
                  }}
                >
                  Delete asset
                </Button>
              </div>
            ) : null}
          </div>

          <div className="flex-1 overflow-hidden">
            <AssetTree
              projectId={projectId}
              assets={assets}
              folders={folders}
              selectedFolder={selectedFolder}
              selectedAssetId={selectedAssetId}
              onSelectFolder={setSelectedFolder}
              onSelectAsset={handleSelectAsset}
            />
          </div>
        </SectionPanel>

        {/* Preview */}
        <SectionPanel className="relative flex h-[72vh] flex-col gap-3 overflow-hidden" variant="subtle">
          {!isFocusMode ? (
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs text-gray-400">Preview</div>
                <div className="truncate text-sm text-gray-100">{selectedAsset?.filename || "—"}</div>
              </div>
              <div className="text-[11px] text-gray-400">
                Masks: {maskShapes.length}
              </div>
            </div>
          ) : null}

          <div className="flex-1 overflow-hidden">
            <MaskCanvas
              src={selectedAsset?.filepath ?? null}
              tool={tool}
              shapes={maskShapes}
              activeShapeId={activeMaskId}
              selectedPointIndex={selectedPointIndex}
              onSelectShape={setActiveMaskId}
              onSelectPoint={setSelectedPointIndex}
              onChange={(nextShapes: MaskShape[]) => {
                setMaskShapes(nextShapes);
              }}
              brushRadius={brushRadius}
            />
          </div>

          {!isFocusMode ? (
            <div className="shrink-0 h-64 overflow-y-auto pr-1 space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs text-gray-400">Mask Layers</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setMaskShapes((prev: MaskShape[]) => prev.filter((shape: MaskShape) => shape.id !== activeMaskId));
                      setActiveMaskId(null);
                    }}
                    disabled={!activeMaskId}
                  >
                    Remove active
                  </Button>
                </div>
                <div className="max-h-28 overflow-auto rounded border border-border bg-card/40 p-2 text-[11px] text-gray-300">
                  {maskShapes.length === 0 ? (
                    <div className="text-gray-500">No mask layers yet.</div>
                  ) : (
                    maskShapes.map((shape: MaskShape) => (
                      <button
                        key={shape.id}
                        type="button"
                        onClick={() => setActiveMaskId(shape.id)}
                        className={cn(
                          "flex w-full items-center justify-between rounded px-2 py-1 text-left",
                          shape.id === activeMaskId ? "bg-muted text-white" : "text-gray-300 hover:bg-muted/60"
                        )}
                      >
                        <span className="truncate">{shape.name}</span>
                        <span className="text-[10px] text-gray-500">{shape.points.length} pt</span>
                      </button>
                    ))
                  )}
                </div>
                {activeMaskId ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[11px] text-gray-400">Layer name</Label>
                      <Input
                        value={maskShapes.find((s: MaskShape) => s.id === activeMaskId)?.name ?? ""}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const value = e.target.value;
                          setMaskShapes((prev: MaskShape[]) =>
                            prev.map((shape: MaskShape) => (shape.id === activeMaskId ? { ...shape, name: value } : shape))
                          );
                        }}
                        className="h-8"
                      />
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-2 text-[11px] text-gray-200">
                        <input
                          type="checkbox"
                          checked={Boolean(maskShapes.find((s: MaskShape) => s.id === activeMaskId)?.visible ?? true)}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            const checked = e.target.checked;
                            setMaskShapes((prev: MaskShape[]) =>
                              prev.map((shape: MaskShape) => (shape.id === activeMaskId ? { ...shape, visible: checked } : shape))
                            );
                          }}
                        />
                        Visible
                      </label>
                    </div>
                  </div>
                ) : null}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[11px] text-gray-400">Feather</Label>
                    <Input
                      type="number"
                      min={0}
                      max={50}
                      step={1}
                      value={maskFeather}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const next = Number(e.target.value);
                        setMaskFeather(Number.isFinite(next) ? next : 0);
                      }}
                      className="h-8"
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 text-[11px] text-gray-200">
                      <input
                        type="checkbox"
                        checked={maskInvert}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMaskInvert(e.target.checked)}
                      />
                      Invert mask
                    </label>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[11px] text-gray-400">Brush radius</Label>
                    <Input
                      type="number"
                      min={2}
                      max={64}
                      step={1}
                      value={brushRadius}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const next = Number(e.target.value);
                        setBrushRadius(Number.isFinite(next) ? next : 8);
                      }}
                      className="h-8"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (!activeMaskId || selectedPointIndex === null) return;
                        setMaskShapes((prev: MaskShape[]) =>
                          prev.map((shape: MaskShape) => {
                            if (shape.id !== activeMaskId) return shape;
                            const nextPoints = shape.points.filter((_: Point, idx: number) => idx !== selectedPointIndex);
                            return { ...shape, points: nextPoints, closed: nextPoints.length >= 3 ? shape.closed : false };
                          })
                        );
                        setSelectedPointIndex(null);
                      }}
                      disabled={!activeMaskId || selectedPointIndex === null}
                    >
                      Delete point
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (!activeMaskId) return;
                      setMaskShapes((prev: MaskShape[]) =>
                        prev.map((shape: MaskShape) => {
                          if (shape.id !== activeMaskId) return shape;
                          if (shape.points.length < 3) return shape;
                          const pts = shape.points;
                          const smoothed: Point[] = [];
                          for (let i = 0; i < pts.length; i += 1) {
                            const p0 = pts[i]!;
                            const p1 = pts[(i + 1) % pts.length]!;
                            smoothed.push({ x: p0.x * 0.75 + p1.x * 0.25, y: p0.y * 0.75 + p1.y * 0.25 });
                            smoothed.push({ x: p0.x * 0.25 + p1.x * 0.75, y: p0.y * 0.25 + p1.y * 0.75 });
                          }
                          return { ...shape, points: smoothed };
                        })
                      );
                    }}
                    disabled={!activeMaskId}
                  >
                    Smooth
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (!activeMaskId) return;
                      setMaskShapes((prev: MaskShape[]) =>
                        prev.map((shape: MaskShape) => {
                          if (shape.id !== activeMaskId) return shape;
                          if (shape.points.length < 2) return shape;
                          const next: Point[] = [];
                          for (let i = 0; i < shape.points.length - 1; i += 1) {
                            const a = shape.points[i]!;
                            const b = shape.points[i + 1]!;
                            next.push(a);
                            next.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
                          }
                          const last = shape.points[shape.points.length - 1]!;
                          if (shape.closed) {
                            const first = shape.points[0]!;
                            next.push(last);
                            next.push({ x: (last.x + first.x) / 2, y: (last.y + first.y) / 2 });
                          } else {
                            next.push(last);
                          }
                          return { ...shape, points: next };
                        })
                      );
                    }}
                    disabled={!activeMaskId}
                  >
                    Add points
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedPointIndex(null)}
                    disabled={selectedPointIndex === null}
                  >
                    Deselect point
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-gray-400">Mask JSON</Label>
                <Textarea
                  value={maskPolygons.length === 0 ? "" : safeJsonStringify({ type: "polygons", polygons: maskPolygons, invert: maskInvert, feather: maskFeather })}
                  readOnly
                  className="h-24 font-mono text-[11px]"
                  placeholder="Draw a polygon mask to populate this."
                />
              </div>
            </div>
          ) : null}
        </SectionPanel>

        {/* Prompt + Params */}
        <SectionPanel
          className={cn(
            "flex h-[72vh] flex-col gap-3 overflow-hidden transition-all duration-300 ease-in-out",
            isFocusMode && "pointer-events-none opacity-0 translate-x-2"
          )}
          variant="subtle"
          aria-hidden={isFocusMode}
        >
          <div className="flex items-center justify-between gap-2">
            <div />
            <div className="flex items-center gap-2">
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
                onClick={autoFormatPrompt}
                disabled={!promptText.trim() || studioSettings.promptExtraction.mode !== "programmatic"}
                title="Apply automatic formatting fixes (best effort)"
              >
                Auto format
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleSuggestUi()}
                disabled={!promptText.trim() || !paramsState || uiSuggestLoading}
                title="Suggest UI controls for extracted parameters"
              >
                <Wand2 className="mr-2 size-4" />
                Suggest UI
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleLearnPatterns()}
                disabled={!promptText.trim() || !canManagePatterns || learnLoading}
                title="Learn validation patterns from the prompt"
              >
                <Sparkles className="mr-2 size-4" />
                Learn patterns
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

          <div className="space-y-2">
            <Textarea
              value={promptText}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPromptText(e.target.value)}
              className="h-40 font-mono text-[11px]"
              placeholder="Paste your prompt here. It must include `params = { ... }` (JSON-like; comments/unquoted keys ok)."
            />
            {promptValidationIssues.length > 0 ? (
              <div className="space-y-2 rounded border border-border bg-gray-900/30 p-2">
                <div className="text-[11px] text-gray-400">
                  Prompt validation:{" "}
                  <span className="text-gray-200">{promptValidationIssues.length} issue(s)</span>
                </div>
                {promptValidationIssues.map((issue: PromptValidationIssue) => {
                  const tone =
                    issue.severity === "error"
                      ? "border-red-500/30 bg-red-500/10 text-red-200"
                      : issue.severity === "warning"
                        ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-200"
                        : "border-blue-500/30 bg-blue-500/10 text-blue-200";
                  return (
                    <div key={issue.ruleId} className={`rounded border px-2 py-1.5 ${tone}`}>
                      <div className="text-[11px] font-semibold">{issue.title}</div>
                      <div className="text-[11px] opacity-90">{issue.message}</div>
                      {issue.suggestions.length > 0 ? (
                        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[11px] opacity-90">
                          {issue.suggestions.map((s: PromptValidationSuggestion, idx: number) => (
                            <li key={`${issue.ruleId}-${idx}`}>
                              {s.suggestion}
                              {s.found ? <span className="ml-1 opacity-80">(found: {s.found})</span> : null}
                              {s.comment ? <span className="ml-1 opacity-80">— {s.comment}</span> : null}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}
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
                  {paramLeaves.map((leaf: ParamLeaf) => {
                    const spec = paramSpecs?.[leaf.path];
                    return (
                      <ParamRow
                        key={leaf.path}
                        leaf={leaf}
                        uiControl={paramUiOverrides[leaf.path] ?? "auto"}
                        onUiControlChange={(nextControl: ParamUiControl) => {
                          setParamUiOverrides((prev: Record<string, ParamUiControl>) => {
                            if (nextControl === "auto") {
                              if (!(leaf.path in prev)) return prev;
                              const { [leaf.path]: _removed, ...rest } = prev;
                              return rest;
                            }
                            return { ...prev, [leaf.path]: nextControl };
                          });
                        }}
                        {...(spec ? { spec } : {})}
                        issues={issuesByPath[leaf.path] ?? []}
                        onChange={(nextValue: unknown) => {
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
              Payload preview (used for Image Studio run)
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => void runMutation.mutateAsync()}
                disabled={runMutation.isPending || !projectId || !selectedAsset || !(generatedPrompt || promptText).trim()}
              >
                {runMutation.isPending ? "Running..." : "Run edit"}
              </Button>
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
          </div>
        </SectionPanel>
      </div>
        </TabsContent>

        <TabsContent value="projects">
          <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
            <SectionPanel variant="subtle" className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm text-gray-200">Projects</div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { void projectsQuery.refetch(); }}
                  title="Reload projects"
                >
                  <RefreshCcw className={cn("mr-2 size-4", projectsQuery.isFetching ? "animate-spin" : "")} />
                  Refresh
                </Button>
              </div>

              <Input
                value={projectSearch}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProjectSearch(e.target.value)}
                placeholder="Search projects..."
                className="h-9"
              />

              <div className="flex items-center gap-2">
                <Input
                  value={newProjectId}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewProjectId(e.target.value)}
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

              <div className="text-[11px] text-gray-400">
                {projectsQuery.isLoading ? "Loading projects..." : `${filteredProjects.length} project(s)`}
              </div>

              <div className="max-h-[60vh] space-y-2 overflow-auto pr-1">
                {filteredProjects.length === 0 ? (
                  <div className="rounded border border-dashed border-border p-3 text-sm text-gray-400">
                    No projects found.
                  </div>
                ) : (
                  filteredProjects.map((id: string) => (
                    <div
                      key={id}
                      className={cn(
                        "flex items-center justify-between gap-3 rounded border border-border bg-card/40 p-2",
                        id === projectId && "border-emerald-500/40 bg-emerald-500/10"
                      )}
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm text-gray-100">{id}</div>
                        {id === projectId ? (
                          <div className="text-[10px] text-emerald-200">Active</div>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setProjectId(id)}
                          disabled={id === projectId}
                        >
                          Select
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-rose-500/30 text-rose-200 hover:bg-rose-500/10"
                          onClick={() => void handleDeleteProject(id)}
                          disabled={pendingDeleteId === id || deleteProjectMutation.isPending}
                        >
                          {pendingDeleteId === id ? "Deleting..." : "Delete"}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </SectionPanel>

            <SectionPanel variant="subtle" className="space-y-4">
              <div className="text-sm text-gray-200">Active project</div>
              {projectId ? (
                <div className="space-y-3 text-sm text-gray-300">
                  <div>
                    Project: <span className="text-gray-100">{projectId}</span>
                  </div>
                  <div className="text-xs text-gray-400">
                    Assets loaded: <span className="text-gray-200">{assets.length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleTabChange("studio")}>
                      Open Studio
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setProjectId("")}
                      disabled={!projectId}
                    >
                      Clear selection
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded border border-dashed border-border p-3 text-sm text-gray-400">
                  No project selected yet.
                </div>
              )}
            </SectionPanel>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm text-gray-200">Studio Settings</div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshSettings}
                disabled={settingsQuery.isFetching}
                title="Reload settings"
              >
                <RefreshCcw className={cn("mr-2 size-4", settingsQuery.isFetching ? "animate-spin" : "")} />
                Refresh
              </Button>
            </div>
            {settingsPanel}
          </div>
        </TabsContent>

        <TabsContent value="validation">
          <AdminImageStudioValidationPatternsPage
            embedded
            onSaved={handleRefreshSettings}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ParamRow({
  leaf,
  uiControl,
  onUiControlChange,
  spec,
  issues,
  onChange,
}: {
  leaf: ParamLeaf;
  uiControl: ParamUiControl;
  onUiControlChange: (control: ParamUiControl) => void;
  spec?: ParamSpec;
  issues: ParamIssue[];
  onChange: (value: unknown) => void;
}): React.JSX.Element {
  const value = leaf.value;

  const errors = issues.filter((i: ParamIssue) => i.severity === "error");
  const warnings = issues.filter((i: ParamIssue) => i.severity === "warning");
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

  const recommendation = recommendParamUiControl(value, spec ? { ...spec, kind: uiKind } : undefined);
  const selectedUiControl = uiControl;
  const requestedControl = selectedUiControl === "auto" ? recommendation.recommended : selectedUiControl;
  const autoLabel = `Auto (${paramUiControlLabel(recommendation.recommended)})`;
  const canSlider = recommendation.canSlider;

  return (
    <div className={cn("rounded border bg-card/60 p-2", borderClass)}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-mono text-[11px] text-gray-200">{leaf.path}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-[11px] text-gray-400">
            {Array.isArray(value) ? "array" : value === null ? "null" : typeof value}
          </div>
          <Select
            value={selectedUiControl}
            onValueChange={(next: string) => {
              if (!isParamUiControl(next)) return;
              onUiControlChange(next);
            }}
          >
            <SelectTrigger className="h-7 w-[140px] px-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {recommendation.options.map((opt: ParamUiControl) => (
                <SelectItem key={opt} value={opt}>
                  {opt === "auto" ? autoLabel : paramUiControlLabel(opt)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {spec?.hint ? (
        <div className="mb-2 text-[11px] text-gray-500">
          Hint: <span className="text-gray-400">{spec.hint}</span>
        </div>
      ) : null}

      {selectedUiControl === "auto" && recommendation.reason ? (
        <div className="mb-2 text-[11px] text-gray-500">
          Suggestion: <span className="text-gray-400">{recommendation.reason}</span>
        </div>
      ) : null}

      {errors.length > 0 || warnings.length > 0 ? (
        <div className="mb-2 space-y-1 text-[11px]">
          {errors.map((issue: ParamIssue) => (
            <div key={`${issue.path}:${issue.code ?? issue.message}`} className="text-red-300">
              {issue.message}
            </div>
          ))}
          {warnings.map((issue: ParamIssue) => (
            <div key={`${issue.path}:${issue.code ?? issue.message}`} className="text-yellow-300">
              {issue.message}
            </div>
          ))}
        </div>
      ) : null}

      {requestedControl !== "json" && uiKind === "boolean" && isBool ? (
        requestedControl === "buttons" ? (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={value ? "secondary" : "outline"}
              onClick={() => onChange(true)}
            >
              true
            </Button>
            <Button
              type="button"
              size="sm"
              variant={!value ? "secondary" : "outline"}
              onClick={() => onChange(false)}
            >
              false
            </Button>
          </div>
        ) : (
          <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-200">
            <input type="checkbox" checked={value} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.checked)} />
            <span>{value ? "true" : "false"}</span>
          </label>
        )
      ) : null}

      {requestedControl !== "json" && uiKind === "enum" && typeof value === "string" && spec?.enumOptions ? (
        requestedControl === "buttons" ? (
          <div className="flex flex-wrap gap-2">
            {spec.enumOptions.map((opt: string) => (
              <Button
                key={opt}
                type="button"
                size="sm"
                variant={opt === value ? "secondary" : "outline"}
                onClick={() => onChange(opt)}
              >
                {opt}
              </Button>
            ))}
          </div>
        ) : requestedControl === "text" ? (
          <Input value={value} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)} className="h-8" />
        ) : (
          <Select value={value} onValueChange={(v: string) => onChange(v)}>
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {spec.enumOptions.map((opt: string) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      ) : null}

      {requestedControl !== "json" && uiKind === "number" && isNumber ? (
        <div className="space-y-2">
          {requestedControl === "slider" && canSlider ? (
            <input
              type="range"
              min={spec?.min ?? 0}
              max={spec?.max ?? 1}
              step={spec?.step ?? 0.01}
              value={Math.min(spec?.max ?? Number(value), Math.max(spec?.min ?? Number(value), Number(value)))}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
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
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
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

      {requestedControl !== "json" && uiKind === "rgb" && Array.isArray(value) ? (
        <div className="grid grid-cols-3 gap-2">
          {["R", "G", "B"].map((label: string, index: number) => (
            <div key={label} className="space-y-1">
              <div className="text-[10px] text-gray-500">{label}</div>
              <Input
                type="number"
                value={String(value[index] ?? "")}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const next = Number(e.target.value);
                  if (!Number.isFinite(next)) return;
                  const nextRgb = [...(value as unknown[])];
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

      {requestedControl !== "json" && uiKind === "tuple2" && Array.isArray(value) ? (
        <div className="grid grid-cols-2 gap-2">
          {["X", "Y"].map((label: string, index: number) => (
            <div key={label} className="space-y-1">
              <div className="text-[10px] text-gray-500">{label}</div>
              <Input
                type="number"
                value={String(value[index] ?? "")}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const next = Number(e.target.value);
                  if (!Number.isFinite(next)) return;
                  const nextTuple = [...(value as unknown[])];
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

      {requestedControl !== "json" && uiKind === "string" && isString ? (
        requestedControl === "textarea" ? (
          <Textarea value={value} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)} className="h-24 font-mono text-[11px]" />
        ) : (
          <Input value={value} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)} className="h-8" />
        )
      ) : null}

      {uiKind === "json" || requestedControl === "json" ? (
        <Textarea
          value={safeJsonStringify(value)}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
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
