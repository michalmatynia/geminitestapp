'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Camera,
  BookOpen,
  Folder,
  Grid3X3,
  Image as ImageIcon,
  Maximize2,
  Minimize2,
  Plus,
  Repeat2,
  RefreshCcw,
  Settings2,
  Sparkles,
  Upload,
  Wand2,
  X,
} from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { Asset3DPickerField } from '@/features/cms/components/page-builder/shared-fields';
import FileManager from '@/features/files/components/FileManager';
import { logClientError } from '@/features/observability';
import { formatProgrammaticPrompt } from '@/features/prompt-engine/prompt-formatter';
import type { ExtractParamsResult, ParamIssue, ParamLeaf, ParamSpec } from '@/features/prompt-engine/prompt-params';
import { extractParamsFromPrompt, flattenParams, inferParamSpecs, setDeepValue, validateImageStudioParams } from '@/features/prompt-engine/prompt-params';
import { validateProgrammaticPrompt, type PromptValidationIssue, type PromptValidationSuggestion } from '@/features/prompt-engine/prompt-validator';
import { defaultPromptEngineSettings, PROMPT_ENGINE_SETTINGS_KEY, parsePromptEngineSettings, parsePromptValidationRules, type PromptValidationRule } from '@/features/prompt-engine/settings';
import {
  VectorDrawingCanvas,
  VectorDrawingToolbar,
  type VectorPoint,
  type VectorShape,
  type VectorToolMode,
} from '@/features/vector-drawing';
import { uploadAsset3DFile } from '@/features/viewer3d/api';
import { Viewer3D } from '@/features/viewer3d/components/Viewer3D';
import type { Asset3DRecord } from '@/features/viewer3d/types';
import { useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import type { ImageFileRecord, ImageFileSelection } from '@/shared/types/files';
import {
  Button,
  FileUploadButton,
  Input,
  Label,
  MultiSelect,
  PanelHeader,
  SectionPanel,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SharedModal,
  ClientOnly,
  Tabs,
  TabsContent,
  Textarea,
  TreeCaret,
  TreeContextMenu,
  TreeRow,
  useToast,
} from '@/shared/ui';
import { cn, DRAG_KEYS, getFirstDragValue, hasDragType, setDragData } from '@/shared/utils';
import { parseJsonSetting, serializeSetting } from '@/shared/utils/settings-json';

import { AdminImageStudioValidationPatternsPage } from './AdminImageStudioValidationPatternsPage';
import { isParamUiControl, paramUiControlLabel, recommendParamUiControl, type ParamUiControl } from '../utils/param-ui';
import { defaultImageStudioSettings, IMAGE_STUDIO_SETTINGS_KEY, parseImageStudioSettings, type ImageStudioSettings } from '../utils/studio-settings';
import { expandFolderPath, normalizeFolderPaths } from '../utils/studio-tree';

type StudioTab = 'studio' | 'projects' | 'settings' | 'validation';
type ToolMode = VectorToolMode;
type Point = VectorPoint; // normalized 0..1
type MaskShape = VectorShape;

type StudioProjectsResponse = { projects: string[] };
type StudioSlotsResponse = { slots: ImageStudioSlotRecord[] };
type StudioImportResponse = { uploaded: ImageFileRecord[]; failures?: Array<{ filepath: string; error: string }> };
type StudioUploadResponse = { uploaded: ImageFileRecord[]; failures?: Array<{ filename: string; error: string }> };
type StudioRunResponse = { outputs: ImageFileRecord[] };
type UiSuggestion = {
  path: string;
  valuePreview: string;
  control: ParamUiControl;
  options: ParamUiControl[];
  confidence: number;
  reason: string | null;
  source: 'heuristic' | 'ai';
};

const isStudioTab = (value: string | null): value is StudioTab =>
  value === 'studio' || value === 'projects' || value === 'settings' || value === 'validation';

const normalizeStudioTab = (value: string | null): StudioTab => (isStudioTab(value) ? value : 'studio');
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

const arraysEqual = (a: string[], b: string[]): boolean =>
  a.length === b.length && a.every((value: string, index: number) => value === b[index]);

const STUDIO_UPLOAD_PREFIX = '/uploads/studio/';
const SLOT_TREE_KEY_PREFIX = 'image_studio_slot_tree_';
const PARAM_UI_STATE_KEY_PREFIX = 'image_studio_param_ui_state_';

function sanitizeStudioProjectId(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9-_]/g, '_');
}

function normalizePublicPath(value: string | null | undefined): string | null {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return null;
  if (raw.startsWith('data:') || raw.startsWith('blob:') || raw.startsWith('file:')) {
    return raw;
  }

  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      if (url.pathname.includes('/uploads/')) {
        return normalizePublicPath(url.pathname);
      }
      return raw;
    } catch {
      return raw;
    }
  }

  let normalized = raw.replace(/\\/g, '/');
  if (normalized.startsWith('public/')) {
    normalized = `/${normalized}`;
  }
  const publicIndex = normalized.indexOf('/public/');
  if (publicIndex >= 0) {
    normalized = normalized.slice(publicIndex + '/public'.length);
  }
  const uploadsIndex = normalized.indexOf('/uploads/');
  if (uploadsIndex >= 0) {
    normalized = normalized.slice(uploadsIndex);
  }
  if (!normalized.startsWith('/')) normalized = `/${normalized}`;
  return normalized;
}

type ImageStudioSlotRecord = {
  id: string;
  projectId: string;
  name: string | null;
  folderPath: string | null;
  position?: number | null;
  imageFileId?: string | null;
  imageUrl?: string | null;
  imageBase64?: string | null;
  asset3dId?: string | null;
  screenshotFileId?: string | null;
  metadata?: Record<string, unknown> | null;
  imageFile?: ImageFileRecord | null;
  screenshotFile?: ImageFileRecord | null;
  asset3d?: Asset3DRecord | null;
};

function parseSlotFoldersSetting(raw: string | null | undefined): string[] {
  const parsed = parseJsonSetting<Record<string, unknown> | null>(raw, null);
  if (!parsed || typeof parsed !== 'object') return [];
  const folders = Array.isArray((parsed as { folders?: unknown }).folders)
    ? ((parsed as { folders?: unknown[] }).folders ?? [])
    : [];
  return normalizeFolderPaths(folders.filter((folder: unknown): folder is string => typeof folder === 'string'));
}

function serializeSlotFoldersSetting(folders: string[]): string {
  return serializeSetting({ version: 1, folders: normalizeFolderPaths(folders) });
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise<string>((resolve: (value: string) => void, reject: (reason?: Error) => void) => {
    const reader = new FileReader();
    reader.onload = (): void => {
      const result = reader.result;
      resolve(typeof result === 'string' ? result : '');
    };
    reader.onerror = (): void => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

async function fetchBase64FromUrl(url: string): Promise<string> {
  const res = await fetch('/api/image-studio/slots/base64', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  const data = (await res.json().catch(() => null)) as { dataUrl?: string; error?: string } | null;
  if (!res.ok || !data?.dataUrl) {
    throw new Error(data?.error || 'Failed to load base64');
  }
  return data.dataUrl;
}

async function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise<HTMLImageElement>((resolve: (value: HTMLImageElement) => void, reject: (reason?: unknown) => void) => {
    const img = document.createElement('img');
    img.onload = (): void => resolve(img);
    img.onerror = (): void => reject(new Error('Failed to load image for mask generation.'));
    img.src = src;
  });
}

async function computeBboxFromThreshold(src: string): Promise<{ x: number; y: number; w: number; h: number } | null> {
  const img = await loadImageElement(src);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
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
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, 512 / Math.max(img.naturalWidth, img.naturalHeight));
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext('2d');
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

function buildSlotTree(projectId: string, slots: ImageStudioSlotRecord[], folders: string[]): TreeNode {
  const root: TreeNode = { id: 'root', name: projectId || 'Project', type: 'folder', path: '', children: [] };

  const ensureFolder = (parent: TreeNode, folderName: string, folderPath: string): TreeNode => {
    const existing = parent.children.find((child: TreeNode) => child.type === 'folder' && child.name === folderName);
    if (existing) return existing;
    const node: TreeNode = { id: `folder:${folderPath}`, name: folderName, type: 'folder', path: folderPath, children: [] };
    parent.children.push(node);
    parent.children.sort((a: TreeNode, b: TreeNode) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    return node;
  };

  const normalizedFolders = normalizeFolderPaths(folders);
  normalizedFolders.forEach((folderPath: string) => {
    const normalized = folderPath.replace(/\\/g, '/').replace(/^\/+/, '');
    if (!normalized) return;
    const parts = normalized.split('/').filter(Boolean);
    if (parts.length === 0) return;
    let cursor = root;
    for (let index = 0; index < parts.length; index += 1) {
      const part = parts[index]!;
      const nextFolderPath = parts.slice(0, index + 1).join('/');
      cursor = ensureFolder(cursor, part, nextFolderPath);
    }
  });

  slots.forEach((slot: ImageStudioSlotRecord) => {
    const folderPath = (slot.folderPath ?? '').replace(/\\/g, '/').replace(/^\/+/, '');
    const parts = folderPath ? [...folderPath.split('/'), slot.name || slot.id] : [slot.name || slot.id];
    let cursor = root;
    for (let index = 0; index < parts.length; index += 1) {
      const part = parts[index]!;
      const isLast = index === parts.length - 1;
      if (isLast) {
        cursor.children.push({
          id: `slot:${slot.id}`,
          name: part,
          type: 'file',
          path: parts.slice(0, -1).join('/'),
          slot,
          children: [],
        });
        cursor.children.sort((a: TreeNode, b: TreeNode) => {
          if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
      } else {
        const nextFolderPath = parts.slice(0, index + 1).join('/');
        cursor = ensureFolder(cursor, part, nextFolderPath);
      }
    }
  });

  return root;
}

type TreeNode = {
  id: string;
  name: string;
  type: 'folder' | 'file';
  path: string; // folder path (relative inside project) for folders; parent folder path for files
  slot?: ImageStudioSlotRecord;
  children: TreeNode[];
};

type ImageStudioSlotTreeContextValue = {
  projectId: string;
  slots: ImageStudioSlotRecord[];
  folders: string[];
  selectedFolder: string;
  selectedSlotId: string | null;
  onSelectFolder: (folder: string) => void;
  onSelectSlot: (slot: ImageStudioSlotRecord) => void;
  onMoveSlot: (slot: ImageStudioSlotRecord, targetFolder: string) => void;
  onMoveFolder: (folderPath: string, targetFolder: string) => void;
};

const ImageStudioSlotTreeContext = createContext<ImageStudioSlotTreeContextValue | null>(null);

function useImageStudioSlotTree(): ImageStudioSlotTreeContextValue {
  const context = useContext(ImageStudioSlotTreeContext);
  if (!context) {
    throw new Error('useImageStudioSlotTree must be used within ImageStudioSlotTreeContext.Provider');
  }
  return context;
}

type ImageStudioParamsContextValue = {
  paramSpecs: Record<string, ParamSpec> | null;
  paramUiOverrides: Record<string, ParamUiControl>;
  paramFlipMap: Record<string, boolean>;
  issuesByPath: Record<string, ParamIssue[]>;
  onParamChange: (path: string, value: unknown) => void;
  onParamFlip: (path: string) => void;
  onParamUiControlChange: (path: string, control: ParamUiControl) => void;
};

const ImageStudioParamsContext = createContext<ImageStudioParamsContextValue | null>(null);

function useImageStudioParams(): ImageStudioParamsContextValue {
  const context = useContext(ImageStudioParamsContext);
  if (!context) {
    throw new Error('useImageStudioParams must be used within ImageStudioParamsContext.Provider');
  }
  return context;
}

function SlotTree(): React.JSX.Element {
  const {
    projectId,
    slots,
    folders,
    selectedFolder,
    selectedSlotId,
    onSelectFolder,
    onSelectSlot,
    onMoveSlot,
    onMoveFolder,
  } = useImageStudioSlotTree();
  const tree = useMemo(() => buildSlotTree(projectId, slots, folders), [projectId, slots, folders]);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(['root']));
  const [dragOverPath, setDragOverPath] = useState<string | null>(null);
  const [_draggedSlotId, setDraggedSlotId] = useState<string | null>(null);
  const [_draggedFolderPath, setDraggedFolderPath] = useState<string | null>(null);
  const rootOpen = expanded.has('root');

  const toggle = useCallback((id: string): void => {
    setExpanded((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const renderNode = (node: TreeNode, depth: number): React.JSX.Element | null => {
    if (node.type === 'folder') {
      const isOpen = expanded.has(node.id);
      const isSelected = node.path === selectedFolder;
      const isDragOver = dragOverPath === node.path;
      return (
        <div key={node.id}>
          <TreeContextMenu
            items={[
              { id: 'select-folder', label: 'Select folder', onSelect: () => onSelectFolder(node.path) },
              ...(node.path
                ? [
                  {
                    id: 'move-folder-root',
                    label: 'Move to root',
                    onSelect: () => onMoveFolder(node.path, ''),
                  },
                ]
                : []),
            ]}
          >
            <TreeRow
              asChild
              depth={depth}
              baseIndent={8}
              indent={10}
              tone="subtle"
              selected={isSelected}
              dragOver={isDragOver}
              className="text-xs"
            >
              <button
                type="button"
                className="w-full text-left cursor-grab active:cursor-grabbing"
                onClick={() => onSelectFolder(node.path)}
                onDoubleClick={() => toggle(node.id)}
                title={node.path || 'Project root'}
                draggable
                onDragStart={(e: React.DragEvent<HTMLButtonElement>): void => {
                  setDragData(e.dataTransfer, { [DRAG_KEYS.FOLDER_PATH]: node.path }, { effectAllowed: 'move' });
                  setDraggedFolderPath(node.path);
                }}
                onDragEnd={() => {
                  setDraggedFolderPath(null);
                  setDragOverPath(null);
                }}
                onDragOver={(e: React.DragEvent<HTMLButtonElement>): void => {
                  if (!hasDragType(e.dataTransfer, [DRAG_KEYS.ASSET_ID, DRAG_KEYS.FOLDER_PATH])) return;
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOverPath(node.path);
                  e.dataTransfer.dropEffect = 'move';
                }}
                onDragLeave={() => {
                  if (dragOverPath === node.path) setDragOverPath(null);
                }}
                onDrop={(e: React.DragEvent<HTMLButtonElement>): void => {
                  e.preventDefault();
                  e.stopPropagation();
                  const slotId = getFirstDragValue(e.dataTransfer, [DRAG_KEYS.ASSET_ID]);
                  const folderPath =
                    getFirstDragValue(e.dataTransfer, [DRAG_KEYS.FOLDER_PATH]) ?? _draggedFolderPath;
                  setDragOverPath(null);
                  if (slotId) {
                    const slot = slots.find((item: ImageStudioSlotRecord) => item.id === slotId);
                    if (slot) onMoveSlot(slot, node.path);
                    return;
                  }
                  if (folderPath) {
                    onMoveFolder(folderPath, node.path);
                  }
                }}
              >
                <TreeCaret
                  isOpen={isOpen}
                  hasChildren={node.children.length > 0}
                  ariaLabel={isOpen ? `Collapse ${node.name}` : `Expand ${node.name}`}
                  onToggle={() => toggle(node.id)}
                  className="text-gray-400"
                  buttonClassName="hover:bg-gray-700"
                  placeholderClassName="w-4"
                />
                <Folder className="size-4 text-gray-400" />
                <span className="truncate">{node.name}</span>
              </button>
            </TreeRow>
          </TreeContextMenu>
          {isOpen ? (
            <div>
              {node.children.map((child: TreeNode) => renderNode(child, depth + 1))}
            </div>
          ) : null}
        </div>
      );
    }

    const slot = node.slot;
    if (!slot) return null;
    const isSelected = slot.id === selectedSlotId;
    return (
      <TreeContextMenu
        key={node.id}
        items={[
          { id: 'select-slot', label: 'Select slot', onSelect: () => onSelectSlot(slot) },
          ...(slot.folderPath
            ? [
              {
                id: 'move-slot-root',
                label: 'Move to root',
                onSelect: () => onMoveSlot(slot, ''),
              },
            ]
            : []),
        ]}
      >
        <TreeRow
          key={node.id}
          asChild
          depth={depth}
          baseIndent={18}
          indent={10}
          tone="subtle"
          selected={isSelected}
          className="text-xs"
        >
          <button
            type="button"
            className="w-full text-left cursor-grab active:cursor-grabbing"
            onClick={() => onSelectSlot(slot)}
            title={slot.name || slot.id}
            draggable
            onDragStart={(e: React.DragEvent<HTMLButtonElement>): void => {
              setDragData(e.dataTransfer, { [DRAG_KEYS.ASSET_ID]: slot.id }, { effectAllowed: 'move' });
              setDraggedSlotId(slot.id);
            }}
            onDragEnd={() => {
              setDraggedSlotId(null);
              setDragOverPath(null);
            }}
          >
            <ImageIcon className="size-4 text-gray-400" />
            <span className="truncate">{slot.name || node.name}</span>
          </button>
        </TreeRow>
      </TreeContextMenu>
    );
  };

  return (
    <div
      className="h-full overflow-auto rounded border border-border bg-card/40 p-2"
      onDragOver={(e: React.DragEvent<HTMLDivElement>): void => {
        if (!hasDragType(e.dataTransfer, [DRAG_KEYS.ASSET_ID, DRAG_KEYS.FOLDER_PATH])) return;
        e.preventDefault();
        setDragOverPath('');
      }}
      onDragLeave={() => {
        if (dragOverPath === '') setDragOverPath(null);
      }}
      onDrop={(e: React.DragEvent<HTMLDivElement>): void => {
        e.preventDefault();
        const slotId = getFirstDragValue(e.dataTransfer, [DRAG_KEYS.ASSET_ID]);
        const folderPath =
          getFirstDragValue(e.dataTransfer, [DRAG_KEYS.FOLDER_PATH]) ?? _draggedFolderPath;
        setDragOverPath(null);
        if (slotId) {
          const slot = slots.find((item: ImageStudioSlotRecord) => item.id === slotId);
          if (slot) onMoveSlot(slot, '');
          return;
        }
        if (folderPath) {
          onMoveFolder(folderPath, '');
        }
      }}
    >
      {tree.children.length === 0 ? (
        <div className="flex h-full items-center justify-center px-2 text-center text-xs text-gray-500">
          No folders yet. Create a folder or add slots here.
        </div>
      ) : rootOpen ? (
        <div>
          {tree.children.map((child: TreeNode) => renderNode(child, 0))}
        </div>
      ) : null}
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

  const settingsStore = useSettingsStore();
  const heavySettings = useSettingsMap({ scope: 'heavy' });
  const updateSetting = useUpdateSetting();
  const [settingsLoaded, setSettingsLoaded] = useState<boolean>(false);
  const [studioSettings, setStudioSettings] = useState<ImageStudioSettings>(defaultImageStudioSettings);
  const [advancedOverridesText, setAdvancedOverridesText] = useState<string>(
    JSON.stringify(defaultImageStudioSettings.targetAi.openai.advanced_overrides ?? {}, null, 2)
  );
  const [advancedOverridesError, setAdvancedOverridesError] = useState<string | null>(null);
  const [promptValidationRulesText, setPromptValidationRulesText] = useState<string>(
    JSON.stringify(defaultPromptEngineSettings.promptValidation.rules, null, 2)
  );
  const [promptValidationRulesError, setPromptValidationRulesError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<StudioTab>('studio');
  const [projectSearch, setProjectSearch] = useState<string>('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const [projectId, setProjectId] = useState<string>('');
  const [newProjectId, setNewProjectId] = useState<string>('');
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [workingSlotId, setWorkingSlotId] = useState<string | null>(null);
  const [compositeAssetIds, setCompositeAssetIds] = useState<string[]>([]);
  const [virtualFolders, setVirtualFolders] = useState<string[]>([]);
  const [driveImportOpen, setDriveImportOpen] = useState<boolean>(false);
  const [driveImportMode, setDriveImportMode] = useState<'create' | 'replace'>('create');
  const [driveImportTargetId, setDriveImportTargetId] = useState<string | null>(null);
  const [slotCreateOpen, setSlotCreateOpen] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [slotImageUrlDraft, setSlotImageUrlDraft] = useState<string>('');
  const [slotBase64Draft, setSlotBase64Draft] = useState<string>('');
  const [slotUpdateBusy, setSlotUpdateBusy] = useState<boolean>(false);
  const [slotInlineEditOpen, setSlotInlineEditOpen] = useState<boolean>(false);
  const hasManualProjectSelectionRef = useRef<boolean>(false);
  const [moveTargetFolder, setMoveTargetFolder] = useState<string>('');

  const [tool, setTool] = useState<ToolMode>('select');
  const [maskShapes, setMaskShapes] = useState<MaskShape[]>([]);
  const [activeMaskId, setActiveMaskId] = useState<string | null>(null);
  const [maskInvert, setMaskInvert] = useState<boolean>(false);
  const [maskFeather, setMaskFeather] = useState<number>(0);
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const [brushRadius, setBrushRadius] = useState<number>(8);

  const [promptText, setPromptText] = useState<string>('');
  const [extractReviewOpen, setExtractReviewOpen] = useState<boolean>(false);
  const [extractDraftPrompt, setExtractDraftPrompt] = useState<string>('');
  const [extractPreviewUiOverrides, setExtractPreviewUiOverrides] = useState<Record<string, ParamUiControl>>({});
  const [extractResult, setExtractResult] = useState<ExtractParamsResult | null>(null);
  const [paramsState, setParamsState] = useState<Record<string, unknown> | null>(null);
  const [paramSpecs, setParamSpecs] = useState<Record<string, ParamSpec> | null>(null);
  const [promptSourceAtExtract, setPromptSourceAtExtract] = useState<string | null>(null);
  const [paramUiOverrides, setParamUiOverrides] = useState<Record<string, ParamUiControl>>({});
  const [_paramFlipMap, setParamFlipMap] = useState<Record<string, boolean>>({});
  const [learnOpen, setLearnOpen] = useState<boolean>(false);
  const [learnLoading, setLearnLoading] = useState<boolean>(false);
  const [learnCandidates, setLearnCandidates] = useState<PromptValidationRule[]>([]);
  const [learnSelection, setLearnSelection] = useState<Record<string, boolean>>({});
  const [uiSuggestOpen, setUiSuggestOpen] = useState<boolean>(false);
  const [uiSuggestLoading, setUiSuggestLoading] = useState<boolean>(false);
  const [uiSuggestionRows, setUiSuggestionRows] = useState<UiSuggestionRow[]>([]);
  const [uiSuggestMode, setUiSuggestMode] = useState<'heuristic' | 'ai' | 'both'>('heuristic');
  const [uiSuggestMinConfidence, setUiSuggestMinConfidence] = useState<number>(0.5);
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);
  const [previewMode, setPreviewMode] = useState<'image' | '3d'>('image');
  const captureRef = useRef<(() => string | null) | null>(null);
  const [maskGenLoading, setMaskGenLoading] = useState<boolean>(false);
  const [_maskGenOpen, setMaskGenOpen] = useState<boolean>(false);
  const [maskGenMode, setMaskGenMode] = useState<'ai-polygon' | 'ai-bbox' | 'threshold' | 'edges'>('ai-polygon');

  const heavyMap = heavySettings.data ?? new Map<string, string>();
  const promptEngineRaw = settingsStore.get(PROMPT_ENGINE_SETTINGS_KEY);
  const studioSettingsRaw = heavyMap.get(IMAGE_STUDIO_SETTINGS_KEY);
  const openaiModelFallback = settingsStore.get('openai_model');
  const promptEngineSettings = useMemo(
    () => parsePromptEngineSettings(promptEngineRaw),
    [promptEngineRaw]
  );
  const promptValidationSettings = promptEngineSettings.promptValidation;

  useEffect(() => {
    if (settingsLoaded) return;
    if (settingsStore.isLoading || heavySettings.isLoading) return;

    const stored = parseImageStudioSettings(studioSettingsRaw);
    const promptEngineStored = parsePromptEngineSettings(promptEngineRaw);

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
    setPromptValidationRulesText(JSON.stringify(promptEngineStored.promptValidation.rules, null, 2));
    setPromptValidationRulesError(null);
    setSettingsLoaded(true);
  }, [settingsLoaded, settingsStore.isLoading, heavySettings.isLoading, studioSettingsRaw, promptEngineRaw, openaiModelFallback]);

  useEffect(() => {
    const nextTab = normalizeStudioTab(searchParams?.get('tab'));
    setActiveTab((prev: StudioTab) => (prev === nextTab ? prev : nextTab));
  }, [searchParams]);

  const handleTabChange = useCallback(
    (value: string): void => {
      const nextTab = normalizeStudioTab(value);
      setActiveTab(nextTab);
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      if (nextTab === 'studio') {
        params.delete('tab');
      } else {
        params.set('tab', nextTab);
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router, searchParams]
  );

  useEffect(() => {
    const saved = localStorage.getItem('imageStudio.projectId') ?? '';
    if (saved) setProjectId(sanitizeStudioProjectId(saved));
  }, []);

  const projectsQuery = useQuery({
    queryKey: ['image-studio', 'projects'],
    queryFn: async (): Promise<string[]> => {
      try {
        const res = await fetch('/api/image-studio/projects');
        if (!res.ok) throw new Error('Failed to load projects');
        const data = (await res.json()) as StudioProjectsResponse;
        return Array.isArray(data.projects) ? data.projects : [];
      } catch (error) {
        logClientError(error, { context: { source: 'AdminImageStudioPage', action: 'loadProjects' } });
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
      const res = await fetch('/api/image-studio/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: id }),
      });
      const data = (await res.json().catch(() => null)) as { projectId?: string; error?: string } | null;
      if (!res.ok) throw new Error(data?.error || 'Failed to create project');
      if (!data?.projectId) throw new Error('Invalid response');
      return data.projectId;
    },
    onSuccess: async (createdId: string): Promise<void> => {
      await queryClient.invalidateQueries({ queryKey: ['image-studio', 'projects'] });
      setProjectId(createdId);
      setNewProjectId('');
      toast('Project created.', { variant: 'success' });
    },
    onError: (error: unknown): void => {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create project.';
      toast(errorMessage, { variant: 'error' });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (id: string): Promise<string> => {
      const res = await fetch(`/api/image-studio/projects/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error || 'Failed to delete project');
      return id;
    },
    onSuccess: async (deletedId: string): Promise<void> => {
      await queryClient.invalidateQueries({ queryKey: ['image-studio', 'projects'] });
      if (projectId === deletedId) {
        setProjectId('');
        setSelectedFolder('');
        setSelectedSlotId(null);
        setCompositeAssetIds([]);
      }
      toast('Project deleted.', { variant: 'success' });
    },
    onError: (error: unknown): void => {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete project.';
      toast(errorMessage, { variant: 'error' });
    },
  });

  const handleDeleteProject = useCallback(
    async (id: string): Promise<void> => {
      if (!id) return;
      const confirmed = window.confirm(`Delete project "${id}" and all its slots? This cannot be undone.`);
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

  const treeKey = useMemo(
    () => (projectId ? `${SLOT_TREE_KEY_PREFIX}${sanitizeStudioProjectId(projectId)}` : null),
    [projectId]
  );
  const paramUiKey = useMemo(
    () => (projectId ? `${PARAM_UI_STATE_KEY_PREFIX}${sanitizeStudioProjectId(projectId)}` : null),
    [projectId]
  );
  const treeSettingsRaw = treeKey ? heavyMap.get(treeKey) : undefined;
  const paramUiRaw = paramUiKey ? heavyMap.get(paramUiKey) : undefined;

  const slotsQuery = useQuery({
    queryKey: ['image-studio', 'slots', projectId],
    enabled: Boolean(projectId),
    queryFn: async (): Promise<StudioSlotsResponse> => {
      try {
        const res = await fetch(`/api/image-studio/projects/${encodeURIComponent(projectId)}/slots`);
        if (!res.ok) {
          const errorPayload = (await res.json().catch(() => null)) as { error?: string } | null;
          const error = new Error(errorPayload?.error || `Failed to load slots (${res.status})`) as Error & {
            status?: number;
          };
          error.status = res.status;
          throw error;
        }
        const data = (await res.json().catch(() => ({ slots: [] }))) as StudioSlotsResponse;
        return {
          slots: Array.isArray(data.slots) ? data.slots : [],
        };
      } catch (error) {
        logClientError(error, { context: { source: 'AdminImageStudioPage', action: 'loadSlots', projectId } });
        throw error;
      }
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: (failureCount: number, error: unknown) => {
      const status = (error as Error & { status?: number }).status;
      if (status === 429) return false;
      return failureCount < 2;
    },
  });

  useEffect(() => {
    if (!projectId || !treeKey) {
      setVirtualFolders((prev: string[]) => (prev.length === 0 ? prev : []));
      return;
    }
    if (settingsStore.isLoading) return;
    if (virtualFolders.length > 0) return;

    const storedFolders = parseSlotFoldersSetting(treeSettingsRaw);
    if (storedFolders.length > 0) {
      setVirtualFolders((prev: string[]) => (arraysEqual(prev, storedFolders) ? prev : storedFolders));
      return;
    }

    const derived = normalizeFolderPaths(
      (slotsQuery.data?.slots ?? [])
        .map((slot: ImageStudioSlotRecord) => slot.folderPath || '')
        .filter(Boolean)
    );
    setVirtualFolders((prev: string[]) => (arraysEqual(prev, derived) ? prev : derived));
    if (derived.length > 0) {
      updateSetting
        .mutateAsync({
          key: treeKey,
          value: serializeSlotFoldersSetting(derived),
        })
        .catch((error: unknown) => {
          logClientError(error, { context: { source: 'AdminImageStudioPage', action: 'seedSlotsTree' } });
        });
    }
  }, [projectId, settingsStore.isLoading, treeSettingsRaw, slotsQuery.data, treeKey, updateSetting, virtualFolders.length]);

  useEffect(() => {
    if (!projectId || !paramUiKey) {
      setParamFlipMap({});
      return;
    }
    if (settingsStore.isLoading || heavySettings.isLoading) return;
    const parsed = parseJsonSetting<Record<string, boolean>>(paramUiRaw, {});
    setParamFlipMap(parsed ?? {});
  }, [projectId, paramUiKey, paramUiRaw, settingsStore.isLoading, heavySettings.isLoading]);

  const persistFolders = useCallback(
    async (nextFolders: string[]): Promise<void> => {
      if (!treeKey) return;
      await updateSetting.mutateAsync({
        key: treeKey,
        value: serializeSlotFoldersSetting(nextFolders),
      });
    },
    [treeKey, updateSetting]
  );

  const _persistParamFlipMap: (nextMap: Record<string, boolean>) => Promise<void> = useCallback(
    async (nextMap: Record<string, boolean>): Promise<void> => {
      if (!paramUiKey) return;
      await updateSetting.mutateAsync({
        key: paramUiKey,
        value: serializeSetting(nextMap),
      });
    },
    [paramUiKey, updateSetting]
  );

  const createSlots = useCallback(
    async (slots: Array<Partial<ImageStudioSlotRecord>>): Promise<ImageStudioSlotRecord[]> => {
      if (!projectId) throw new Error('Select or create a project first.');
      const payloadSlots = slots.map((slot: Partial<ImageStudioSlotRecord>) => ({
        name: typeof slot.name === 'string' ? slot.name : undefined,
        folderPath: typeof slot.folderPath === 'string' ? slot.folderPath : undefined,
        imageUrl: typeof slot.imageUrl === 'string' ? slot.imageUrl : undefined,
        imageBase64: typeof slot.imageBase64 === 'string' ? slot.imageBase64 : undefined,
        imageFileId: typeof slot.imageFileId === 'string' ? slot.imageFileId : undefined,
        asset3dId: typeof slot.asset3dId === 'string' ? slot.asset3dId : undefined,
        metadata: slot.metadata && typeof slot.metadata === 'object' ? slot.metadata : undefined,
      }));
      const res = await fetch(`/api/image-studio/projects/${encodeURIComponent(projectId)}/slots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slots: payloadSlots }),
      });
      const data = (await res.json().catch(() => null)) as StudioSlotsResponse | { error?: string } | null;
      if (!res.ok) {
        throw new Error((data && 'error' in data && data.error) || 'Failed to create slot');
      }
      const created = (data && 'slots' in data ? data.slots : []) ?? [];
      queryClient.setQueryData(['image-studio', 'slots', projectId], (prev: StudioSlotsResponse | undefined) => {
        const current = Array.isArray(prev?.slots) ? prev?.slots ?? [] : [];
        const byId = new Map<string, ImageStudioSlotRecord>();
        current.forEach((slot: ImageStudioSlotRecord) => byId.set(slot.id, slot));
        created.forEach((slot: ImageStudioSlotRecord) => byId.set(slot.id, slot));
        return { slots: Array.from(byId.values()) };
      });
      return created;
    },
    [projectId, queryClient]
  );

  const updateSlotMutation = useMutation({
    mutationFn: async (payload: { id: string; data: Partial<ImageStudioSlotRecord> }): Promise<ImageStudioSlotRecord> => {
      const res = await fetch(`/api/image-studio/slots/${encodeURIComponent(payload.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload.data),
      });
      const data = (await res.json().catch(() => null)) as ImageStudioSlotRecord | { error?: string } | null;
      if (!res.ok || !data || 'error' in data) {
        throw new Error((data && 'error' in data && data.error) || 'Failed to update slot');
      }
      return data as ImageStudioSlotRecord;
    },
    onSuccess: (slot: ImageStudioSlotRecord): void => {
      queryClient.setQueryData(['image-studio', 'slots', projectId], (prev: StudioSlotsResponse | undefined) => {
        const current = Array.isArray(prev?.slots) ? prev?.slots ?? [] : [];
        const byId = new Map<string, ImageStudioSlotRecord>();
        current.forEach((item: ImageStudioSlotRecord) => byId.set(item.id, item));
        byId.set(slot.id, slot);
        return { slots: Array.from(byId.values()) };
      });
    },
  });

  const deleteSlotMutation = useMutation({
    mutationFn: async (slotId: string): Promise<void> => {
      const res = await fetch(`/api/image-studio/slots/${encodeURIComponent(slotId)}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || 'Failed to delete slot');
      }
    },
    onSuccess: (_: void, slotId: string): void => {
      queryClient.setQueryData(['image-studio', 'slots', projectId], (prev: StudioSlotsResponse | undefined) => {
        const current = Array.isArray(prev?.slots) ? prev?.slots ?? [] : [];
        return { slots: current.filter((slot: ImageStudioSlotRecord) => slot.id !== slotId) };
      });
      if (selectedSlotId === slotId) {
        setSelectedSlotId(null);
      }
      if (workingSlotId === slotId) {
        setWorkingSlotId(null);
      }
      toast('Slot deleted.', { variant: 'success' });
    },
    onError: (error: unknown): void => {
      toast(error instanceof Error ? error.message : 'Failed to delete slot.', { variant: 'error' });
    },
  });

  const moveSlotMutation = useMutation({
    mutationFn: async (payload: { slot: ImageStudioSlotRecord; targetFolder: string }): Promise<ImageStudioSlotRecord> => {
      const nextFolder = payload.targetFolder;
      return updateSlotMutation.mutateAsync({
        id: payload.slot.id,
        data: { folderPath: nextFolder || null },
      });
    },
    onSuccess: (): void => {
      toast('Slot moved.', { variant: 'success' });
    },    onError: (error: unknown): void => {
      const errorMessage = error instanceof Error ? error.message : 'Failed to move slot.';
      toast(errorMessage, { variant: 'error' });
    },
  });

  const handleMoveFolder = useCallback(
    async (folderPath: string, targetFolder: string): Promise<void> => {
      if (!folderPath) return;
      if (folderPath === targetFolder) return;
      const normalizedSource = normalizeFolderPaths([folderPath])[0] ?? '';
      const normalizedTarget = normalizeFolderPaths([targetFolder])[0] ?? '';
      if (normalizedTarget && (normalizedTarget === normalizedSource || normalizedTarget.startsWith(`${normalizedSource}/`))) {
        toast('Can\'t move a folder into itself.', { variant: 'error' });
        return;
      }
      const baseName = normalizedSource.split('/').pop() ?? '';
      const newPath = normalizedTarget ? `${normalizedTarget}/${baseName}` : baseName;
      if (!newPath) return;
      if (virtualFolders.includes(newPath)) {
        toast('A folder with that name already exists in the target location.', { variant: 'error' });
        return;
      }

      const nextFolders = normalizeFolderPaths(
        virtualFolders.map((path: string) => {
          if (path === normalizedSource) return newPath;
          if (path.startsWith(`${normalizedSource}/`)) {
            return `${newPath}${path.slice(normalizedSource.length)}`;
          }
          return path;
        })
      );

      setVirtualFolders(nextFolders);
      if (selectedFolder === normalizedSource || selectedFolder.startsWith(`${normalizedSource}/`)) {
        const updated = selectedFolder.replace(normalizedSource, newPath);
        setSelectedFolder(updated);
      }
      if (moveTargetFolder === normalizedSource || moveTargetFolder.startsWith(`${normalizedSource}/`)) {
        const updated = moveTargetFolder.replace(normalizedSource, newPath);
        setMoveTargetFolder(updated);
      }

      const slots = slotsQuery.data?.slots ?? [];
      const updates = slots
        .filter((slot: ImageStudioSlotRecord) => {
          const path = slot.folderPath ?? '';
          return path === normalizedSource || path.startsWith(`${normalizedSource}/`);
        })
        .map((slot: ImageStudioSlotRecord) => {
          const path = slot.folderPath ?? '';
          const updatedPath = path === normalizedSource ? newPath : `${newPath}${path.slice(normalizedSource.length)}`;
          return updateSlotMutation.mutateAsync({ id: slot.id, data: { folderPath: updatedPath } });
        });

      try {
        await Promise.all(updates);
        await persistFolders(nextFolders);
        toast('Folder moved.', { variant: 'success' });
      } catch (error) {
        logClientError(error, { context: { source: 'AdminImageStudioPage', action: 'moveFolder' } });
        toast('Failed to move folder.', { variant: 'error' });
      }
    },
    [moveTargetFolder, persistFolders, selectedFolder, slotsQuery.data, toast, updateSlotMutation, virtualFolders]
  );

  const uploadMutation = useMutation({
    mutationFn: async (payload: { files: File[]; folder: string }): Promise<StudioUploadResponse> => {
      if (!projectId) throw new Error('Select or create a project first.');
      const formData = new FormData();
      payload.files.forEach((file: File) => formData.append('files', file));
      const res = await fetch(`/api/image-studio/projects/${encodeURIComponent(projectId)}/assets`, {
        method: 'POST',
        body: formData,
      });
      const data = (await res.json().catch(() => null)) as StudioUploadResponse | { error?: string; errorId?: string } | null;
      if (!res.ok) {
        const errorId = data && 'errorId' in data ? data.errorId : undefined;
        throw new Error(`${(data && 'error' in data && data.error) || 'Upload failed'}${errorId ? ` (Error ID: ${errorId})` : ''}`);
      }
      return (data ?? { uploaded: [], failures: [] }) as StudioUploadResponse;
    },
    onSuccess: async (data: StudioUploadResponse, variables: { files: File[]; folder: string }): Promise<void> => {      if (data.uploaded?.length) {
      const fileByName = new Map<string, File>();
      variables.files.forEach((file: File) => fileByName.set(file.name, file));
      const slotsCreated = await createSlots(
        data.uploaded.map((file: ImageFileRecord) => ({
          name: file.filename ?? 'Slot',
          folderPath: variables.folder || null,
        } as Partial<ImageStudioSlotRecord>))
      );
      if (slotsCreated.length > 0) {
        setSelectedSlotId(slotsCreated[0]!.id);
      }
      await Promise.all(
        slotsCreated.map(async (slot: ImageStudioSlotRecord, index: number) => {
          const fileRecord = data.uploaded[index];
          if (!fileRecord) return;
          const sourceFile = fileByName.get(fileRecord.filename ?? '') ?? variables.files[index];
          const dataUrl = sourceFile ? await fileToDataUrl(sourceFile) : null;
          await updateSlotMutation.mutateAsync({
            id: slot.id,
            data: {
              imageFileId: fileRecord.id,
              imageUrl: normalizePublicPath(fileRecord.filepath),
              imageBase64: dataUrl,
            },
          });
        })
      );
      if (variables.folder) {
        const nextFolders = normalizeFolderPaths([...virtualFolders, ...expandFolderPath(variables.folder)]);
        setVirtualFolders(nextFolders);
        void persistFolders(nextFolders);
      }
    }
    await queryClient.invalidateQueries({ queryKey: ['image-studio', 'slots', projectId] });
    await queryClient.invalidateQueries({ queryKey: ['image-studio', 'projects'] });
    if (data.failures?.length) {
      toast(`Uploaded ${data.uploaded.length} file(s). ${data.failures.length} failed.`, { variant: 'info' });
    } else {
      toast('Upload complete.', { variant: 'success' });
    }
    },
    onError: (error: unknown): void => {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed.';
      toast(errorMessage, { variant: 'error' });
    },
  });

  const createFolderMutation = useMutation({
    mutationFn: async (folder: string): Promise<string> => {
      if (!projectId) throw new Error('Select or create a project first.');
      if (!treeKey) throw new Error('Project tree not ready.');
      const expanded = expandFolderPath(folder);
      if (expanded.length === 0) throw new Error('Folder name is required.');
      const nextFolders = normalizeFolderPaths([...virtualFolders, ...expanded]);
      await persistFolders(nextFolders);
      return expanded[expanded.length - 1] ?? '';
    },
    onSuccess: (folder: string): void => {
      setVirtualFolders((prev: string[]) => normalizeFolderPaths([...prev, ...expandFolderPath(folder)]));
      setSelectedFolder(folder);
      setNewFolderName('');
      toast('Folder created.', { variant: 'success' });
    },    onError: (error: unknown): void => {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create folder.';
      toast(errorMessage, { variant: 'error' });
    },
  });


  const importFromDriveMutation = useMutation({
    mutationFn: async (payload: { files: ImageFileSelection[]; folder: string }): Promise<StudioImportResponse> => {
      if (!projectId) throw new Error('Select or create a project first.');
      const res = await fetch(`/api/image-studio/projects/${encodeURIComponent(projectId)}/assets/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        if (data && 'error' in data && data.error === 'No files imported') {
          return {
            uploaded: [],
            failures: Array.isArray(data.failures) ? data.failures : [],
          };
        }
        throw new Error((data && 'error' in data && data.error) || 'Import failed');
      }
      return (data ?? { uploaded: [], failures: [] }) as StudioImportResponse;
    },
    onSuccess: async (data: StudioImportResponse): Promise<void> => {
      if (data.uploaded.length) {
        const slots = await createSlots(
          data.uploaded.map((file: ImageFileRecord) => ({
            name: file.filename ?? 'Slot',
            folderPath: selectedFolder || null,
          } as Partial<ImageStudioSlotRecord>))
        );
        if (slots.length > 0) {
          setSelectedSlotId(slots[0]!.id);
        }
        await Promise.all(
          slots.map(async (slot: ImageStudioSlotRecord, index: number) => {
            const file = data.uploaded[index];
            if (!file) return;
            const dataUrl = await fetchBase64FromUrl(file.filepath).catch(() => null);
            await updateSlotMutation.mutateAsync({
              id: slot.id,
              data: {
                imageFileId: file.id,
                imageUrl: normalizePublicPath(file.filepath),
                imageBase64: dataUrl,
              },
            });
          })
        );
      }
      if (!data.uploaded.length) {
        const failure = data.failures?.[0];
        toast(
          failure
            ? `No files imported. ${failure.error}: ${failure.filepath}`
            : 'No files imported. Check that selected files are under /uploads and still exist.',
          { variant: 'error' }
        );
      } else if (data.failures && data.failures.length > 0) {
        toast(`Imported ${data.uploaded.length} file(s). ${data.failures.length} failed.`, { variant: 'info' });
      } else {
        toast('Import complete.', { variant: 'success' });
      }
    },
    onError: (error: unknown): void => {
      const errorMessage = error instanceof Error ? error.message : 'Import failed.';
      toast(errorMessage, { variant: 'error' });
    },
  });

  const slots = useMemo(() => slotsQuery.data?.slots ?? [], [slotsQuery.data?.slots]);
  const folders = useMemo(() => virtualFolders, [virtualFolders]);
  const folderOptions = useMemo(() => {
    const unique = new Set<string>(['', ...folders.filter(Boolean)]);
    return Array.from(unique).sort((a: string, b: string) => a.localeCompare(b));
  }, [folders]);
  const maxSlotsReached = useMemo(() => slots.length >= 100, [slots.length]);
  const selectedSlot = useMemo(() => {
    if (!selectedSlotId) return null;
    return slots.find((slot: ImageStudioSlotRecord) => slot.id === selectedSlotId) ?? null;
  }, [slots, selectedSlotId]);
  const workingSlot = useMemo(() => {
    if (!workingSlotId) return null;
    return slots.find((slot: ImageStudioSlotRecord) => slot.id === workingSlotId) ?? null;
  }, [slots, workingSlotId]);

  const handleReplaceUpload = useCallback(
    async (files: File[]): Promise<void> => {
      if (!projectId) {
        toast('Select or create a project first.', { variant: 'error' });
        return;
      }
      if (!selectedSlot) {
        toast('Select a slot first.', { variant: 'error' });
        return;
      }
      if (files.length === 0) return;
      try {
        setSlotUpdateBusy(true);
        const formData = new FormData();
        files.forEach((file: File) => formData.append('files', file));
        const res = await fetch(`/api/image-studio/projects/${encodeURIComponent(projectId)}/assets`, {
          method: 'POST',
          body: formData,
        });
        const data = (await res.json().catch(() => null)) as StudioUploadResponse | { error?: string; errorId?: string } | null;
        if (!res.ok) {
          const errorId = data && 'errorId' in data ? data.errorId : undefined;
          throw new Error(`${(data && 'error' in data && data.error) || 'Upload failed'}${errorId ? ` (Error ID: ${errorId})` : ''}`);
        }
        const uploaded = data && 'uploaded' in data ? data.uploaded : undefined;
        const file = (Array.isArray(uploaded) && uploaded.length > 0) ? uploaded[0] as ImageFileRecord : undefined;
        if (!file) {
          toast('No files uploaded.', { variant: 'error' });
          return;
        }
        const sourceFile = files[0];
        const dataUrl = sourceFile ? await fileToDataUrl(sourceFile) : null;
        await updateSlotMutation.mutateAsync({
          id: selectedSlot.id,
          data: {
            imageFileId: file.id,
            imageUrl: normalizePublicPath(file.filepath),
            imageBase64: dataUrl,
          },
        });
        toast('Slot image replaced.', { variant: 'success' });
      } catch (error) {
        toast(error instanceof Error ? error.message : 'Upload failed.', { variant: 'error' });
      } finally {
        setSlotUpdateBusy(false);
      }
    },
    [projectId, selectedSlot, toast, updateSlotMutation]
  );

  const handleCreateSlot = useCallback(async (): Promise<void> => {
    if (!projectId) return;
    if (maxSlotsReached) {
      toast('You have reached the 100 slot limit.', { variant: 'error' });
      return;
    }
    const created = await createSlots([
      {
        name: `Slot ${slots.length + 1}`,
        folderPath: selectedFolder || null,
      } as Partial<ImageStudioSlotRecord>,
    ]);
    if (created.length > 0) {
      setSelectedSlotId(created[0]!.id);
    }
  }, [createSlots, maxSlotsReached, projectId, selectedFolder, slots.length, toast]);

  const filteredProjects = useMemo((): string[] => {
    const list = projectsQuery.data ?? [];
    const term = projectSearch.trim().toLowerCase();
    if (!term) return list;
    return list.filter((id: string) => id.toLowerCase().includes(term));
  }, [projectSearch, projectsQuery.data]);

  useEffect(() => {
    setSlotInlineEditOpen(false);
  }, [selectedSlotId]);
  useEffect(() => {
    if (!workingSlotId) return;
    const stillExists = slots.some((slot: ImageStudioSlotRecord) => slot.id === workingSlotId);
    if (!stillExists) {
      setWorkingSlotId(null);
    }
  }, [slots, workingSlotId]);
  const isImageSlot = useMemo(
    () =>
      Boolean(
        selectedSlot?.imageFileId ||
          selectedSlot?.imageUrl ||
          selectedSlot?.imageBase64 ||
          selectedSlot?.screenshotFileId
      ),
    [selectedSlot?.imageBase64, selectedSlot?.imageFileId, selectedSlot?.imageUrl, selectedSlot?.screenshotFileId]
  );

  const workingSlotImageSrc = useMemo(() => {
    if (!workingSlot) return null;
    if (workingSlot.imageBase64) return workingSlot.imageBase64;
    const fromUrl = normalizePublicPath(workingSlot.imageUrl);
    if (fromUrl) return fromUrl;
    const fromFile = normalizePublicPath(workingSlot.imageFile?.filepath ?? null);
    if (fromFile) return fromFile;
    const fromScreenshot = normalizePublicPath(workingSlot.screenshotFile?.filepath ?? null);
    if (fromScreenshot) return fromScreenshot;
    return null;
  }, [workingSlot]);

  const workingSlotRunAsset = useMemo(() => {
    if (!workingSlot || !projectId) return null;
    const filepath =
      normalizePublicPath(workingSlot.imageFile?.filepath ?? null) ??
      normalizePublicPath(workingSlot.imageUrl ?? null) ??
      normalizePublicPath(workingSlot.screenshotFile?.filepath ?? null);
    if (!filepath) return null;
    const safeProjectId = sanitizeStudioProjectId(projectId);
    if (!filepath.startsWith(`${STUDIO_UPLOAD_PREFIX}${safeProjectId}/`)) return null;
    return { id: workingSlot.imageFileId ?? undefined, filepath };
  }, [projectId, workingSlot]);

  useEffect(() => {
    const nextUrl = selectedSlot?.imageUrl ?? '';
    const nextBase64 = selectedSlot?.imageBase64 ?? '';
    setSlotImageUrlDraft((prev: string) => (prev === nextUrl ? prev : nextUrl));
    setSlotBase64Draft((prev: string) => (prev === nextBase64 ? prev : nextBase64));
  }, [selectedSlot?.id, selectedSlot?.imageUrl, selectedSlot?.imageBase64]);
  
  const compositeAssetOptions = useMemo(() => {
    const baseId = workingSlotId ?? selectedSlotId;
    const options = slots.map((slot: ImageStudioSlotRecord) => {
      const folder = slot.folderPath ?? '';
      const name = slot.name || slot.id;
      const label = folder ? `${folder}/${name}` : name;
      return {
        value: slot.id,
        label,
        disabled: slot.id === baseId,
      };
    });
    return options.sort((a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label));
  }, [slots, selectedSlotId, workingSlotId]);
  
  const compositeAssets = useMemo(() => {
    if (compositeAssetIds.length === 0) return [];
    const byId = new Map(slots.map((slot: ImageStudioSlotRecord) => [slot.id, slot]));
    return compositeAssetIds
      .map((id: string) => byId.get(id))
      .filter((slot: ImageStudioSlotRecord | undefined): slot is ImageStudioSlotRecord => Boolean(slot));
  }, [slots, compositeAssetIds]);
  
  useEffect(() => {
    if (!projectId) {
      setCompositeAssetIds([]);
      return;
    }
    const validIds = new Set(slots.map((slot: ImageStudioSlotRecord) => slot.id));
    setCompositeAssetIds((prev: string[]) => {
      const baseId = workingSlotId ?? selectedSlotId;
      const next = prev.filter((id: string) => validIds.has(id) && id !== baseId);
      return next.length === prev.length ? prev : next;
    });
  }, [projectId, selectedSlotId, slots, workingSlotId]);
  useEffect(() => {
    const currentFolder = selectedSlot?.folderPath ?? '';
    setMoveTargetFolder((prev: string) => (prev === currentFolder ? prev : currentFolder));
  }, [selectedSlot?.folderPath]);

  useEffect(() => {
    const nextMode = workingSlot?.asset3dId && !workingSlotImageSrc ? '3d' : 'image';
    setPreviewMode((prev: 'image' | '3d') => (prev === nextMode ? prev : nextMode));
  }, [workingSlot?.asset3dId, workingSlotImageSrc]);

  useEffect(() => {
    setMaskShapes([]);
    setActiveMaskId(null);
  }, [workingSlotId]);

  const handleSelectSlot = useCallback((slot: ImageStudioSlotRecord): void => {
    setSelectedSlotId(slot.id);
  }, []);

  const handleSlotMove = useCallback(
    (slot: ImageStudioSlotRecord, targetFolder: string): void => {
      void moveSlotMutation.mutateAsync({ slot, targetFolder });
    },
    [moveSlotMutation]
  );

  const handleFolderMove = useCallback(
    (folderPath: string, targetFolder: string): void => {
      void handleMoveFolder(folderPath, targetFolder);
    },
    [handleMoveFolder]
  );

  const slotTreeContextValue = useMemo(
    () => ({
      projectId,
      slots,
      folders,
      selectedFolder,
      selectedSlotId,
      onSelectFolder: setSelectedFolder,
      onSelectSlot: handleSelectSlot,
      onMoveSlot: handleSlotMove,
      onMoveFolder: handleFolderMove,
    }),
    [
      folders,
      handleFolderMove,
      handleSelectSlot,
      handleSlotMove,
      projectId,
      selectedFolder,
      selectedSlotId,
      setSelectedFolder,
      slots,
    ]
  );

  const handleDriveSelection = useCallback(
    async (files: ImageFileSelection[]): Promise<void> => {
      setDriveImportOpen(false);
      if (files.length === 0) return;
      if (driveImportMode === 'replace' && driveImportTargetId) {
        if (!projectId) {
          toast('Select or create a project first.', { variant: 'error' });
          return;
        }
        try {
          setSlotUpdateBusy(true);
          const res = await fetch(`/api/image-studio/projects/${encodeURIComponent(projectId)}/assets/import`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ files, folder: selectedFolder }),
          });
          const data = (await res.json().catch(() => null)) as StudioImportResponse | { error?: string } | null;
          if (!res.ok) {
            throw new Error((data && 'error' in data && data.error) || 'Import failed');
          }
          const uploaded = data && 'uploaded' in data ? data.uploaded : undefined;
          const file = (Array.isArray(uploaded) && uploaded.length > 0) ? uploaded[0] as ImageFileRecord : undefined;
          if (!file) {
            toast('No files imported.', { variant: 'error' });
            return;
          }
          const dataUrl = await fetchBase64FromUrl(file.filepath).catch(() => null);
          await updateSlotMutation.mutateAsync({
            id: driveImportTargetId,
            data: {
              imageFileId: file.id,
              imageUrl: normalizePublicPath(file.filepath),
              imageBase64: dataUrl,
            },
          });
          toast('Slot image replaced.', { variant: 'success' });
        } catch (error) {
          toast(error instanceof Error ? error.message : 'Import failed.', { variant: 'error' });
        } finally {
          setSlotUpdateBusy(false);
        }
        return;
      }

      try {
        await importFromDriveMutation.mutateAsync({ files, folder: selectedFolder });
      } catch {
        // Errors are surfaced via toast in onError
      }
    },
    [driveImportMode, driveImportTargetId, importFromDriveMutation, projectId, selectedFolder, toast, updateSlotMutation]
  );

  const applyProgrammaticExtraction = useCallback((sourcePrompt: string, options?: { toast?: boolean }): ExtractParamsResult => {
    const shouldToast = options?.toast ?? true;
    const result = extractParamsFromPrompt(sourcePrompt);
    setExtractResult(result);
    if (!result.ok) {
      setParamsState(null);
      setParamSpecs(null);
      setPromptSourceAtExtract(null);
      if (shouldToast) toast(String(result.error), { variant: 'error' });      return result;
    }
    setParamsState(result.params);
    setParamSpecs(inferParamSpecs(result.params, result.rawObjectText));
    setPromptSourceAtExtract(sourcePrompt);
    if (shouldToast) toast('Params extracted.', { variant: 'success' });
    return result;
  }, [toast]);



  const extractPreviewResult = useMemo(() => {
    if (!extractReviewOpen) return null;
    if (!extractDraftPrompt.trim()) return null;
    return extractParamsFromPrompt(extractDraftPrompt);
  }, [extractDraftPrompt, extractReviewOpen]);

  const extractPreviewLeaves = useMemo(() => {
    if (!extractPreviewResult || !extractPreviewResult.ok) return [];
    return flattenParams(extractPreviewResult.params);
  }, [extractPreviewResult]);

  const extractPreviewSpec = useMemo(() => {
    if (!extractPreviewResult || !extractPreviewResult.ok) return null;
    return inferParamSpecs(extractPreviewResult.params, extractPreviewResult.rawObjectText);
  }, [extractPreviewResult]);

  const extractPreviewIssues = useMemo(() => {
    if (!extractPreviewResult || !extractPreviewResult.ok) return [];
    const spec = extractPreviewSpec;
    if (!spec) return [];
    const validResult = extractPreviewResult as { ok: true; params: Record<string, unknown>; rawObjectText: string; }; // Explicit assertion
    return validateImageStudioParams(validResult.params, spec);
  }, [extractPreviewResult, extractPreviewSpec]);

  const extractPreviewIssuesByPath = useMemo(() => {
    const map: Record<string, ParamIssue[]> = {};
    extractPreviewIssues.forEach((issue: ParamIssue) => {
      let issuesForPath = map[issue.path];
      if (!issuesForPath) {
        issuesForPath = [];
        map[issue.path] = issuesForPath;
      }
      issuesForPath.push(issue);
    });
    return map;
  }, [extractPreviewIssues]);

  useEffect(() => {
    if (!extractReviewOpen) return;
    if (!extractPreviewResult || !extractPreviewResult.ok) {
      setExtractPreviewUiOverrides({});
      return;
    }
    setExtractPreviewUiOverrides((prev: Record<string, ParamUiControl>) => {
      const next: Record<string, ParamUiControl> = {};
      extractPreviewLeaves.forEach((leaf: ParamLeaf) => {
        const control = prev[leaf.path];
        if (control !== undefined) {
          next[leaf.path] = control;
        }
      });
      return next;
    });
  }, [extractReviewOpen, extractPreviewLeaves, extractPreviewResult]);

  const extractPreviewValidationSummary = useMemo(() => {
    let errors = 0;
    let warnings = 0;
    extractPreviewIssues.forEach((issue: ParamIssue) => {
      if (issue.severity === 'error') errors += 1;
      if (issue.severity === 'warning') warnings += 1;
    });
    return { errors, warnings };
  }, [extractPreviewIssues]);

  const autoFormatPrompt = useCallback((): void => {
    if (!promptText.trim()) return;
    const formatted = formatProgrammaticPrompt(promptText, promptValidationSettings);
    if (!formatted.changed) {
      toast('No formatting changes to apply.', { variant: 'info' });
      return;
    }

    setPromptText(formatted.prompt);
    const extraction = applyProgrammaticExtraction(formatted.prompt, { toast: false });

    if (extraction.ok) {
      toast(
        `Auto-formatted (${formatted.applied.length} fix(es)). Issues: ${formatted.issuesBefore} → ${formatted.issuesAfter}. Params extracted.`,
        { variant: 'success' }
      );
      return;
    }

    toast(
      `Auto-formatted (${formatted.applied.length} fix(es)). Issues: ${formatted.issuesBefore} → ${formatted.issuesAfter}. Extraction still failing: ${extraction.error}`,
      { variant: 'error' }
    );
  }, [applyProgrammaticExtraction, promptText, promptValidationSettings, toast]);

  const canManagePatterns = Boolean(
    session?.user?.isElevated || session?.user?.permissions?.includes('ai_paths.manage')
  );

  useEffect(() => {
    setUiSuggestMode((prev: 'heuristic' | 'ai' | 'both') => (prev === studioSettings.uiExtractor.mode ? prev : studioSettings.uiExtractor.mode));
  }, [studioSettings.uiExtractor.mode]);

  const buildRuleKey = useCallback((rule: PromptValidationRule, fallback: number): string =>
    rule.id?.trim() ? rule.id : `learned_${fallback}`, []);

  const ruleSignature = useCallback((rule: PromptValidationRule): string => {
    if (rule.kind === 'regex') {
      return `regex:${rule.pattern}/${rule.flags}`;
    }
    return `params:${rule.id}`;
  }, []);

  const handleLearnPatterns = useCallback(async (): Promise<void> => {
    if (!promptText.trim()) {
      toast('Paste a prompt first.', { variant: 'error' });
      return;
    }
    if (!canManagePatterns) {
      toast('Admin access is required to learn patterns.', { variant: 'error' });
      return;
    }
    setLearnOpen(true);
    setLearnLoading(true);
    try {
      const res = await fetch('/api/image-studio/validation-patterns/learn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText,
          limit: 8,
        }),
      });
      const data = (await res.json().catch(() => null)) as { rules?: PromptValidationRule[]; error?: string } | null;
      if (!res.ok) throw new Error(data?.error || 'Failed to learn patterns.');
      const rules = Array.isArray(data?.rules) ? data.rules : [];
      setLearnCandidates(rules);
      const selection: Record<string, boolean> = {};
      rules.forEach((rule: PromptValidationRule, index: number) => {
        selection[buildRuleKey(rule, index)] = true;
      });
      setLearnSelection(selection);
      if (rules.length === 0) {
        toast('No new patterns learned from this prompt.', { variant: 'info' });
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to learn patterns.', { variant: 'error' });
    } finally {
      setLearnLoading(false);
    }
  }, [buildRuleKey, canManagePatterns, promptText, toast]);

  const handleApplyLearned = useCallback(async (): Promise<void> => {
    const selected = learnCandidates.filter((rule: PromptValidationRule, index: number) =>
      Boolean(learnSelection[buildRuleKey(rule, index)])
    );
    if (selected.length === 0) {
      toast('Select at least one learned pattern.', { variant: 'error' });
      return;
    }

    const existingRules = promptValidationSettings.rules;
    const existingLearned = promptValidationSettings.learnedRules ?? [];
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
      toast('No new unique patterns to add.', { variant: 'info' });
      return;
    }

    const updatedSettings = {
      ...promptEngineSettings,
      promptValidation: {
        ...promptValidationSettings,
        learnedRules: [...existingLearned, ...nextLearned],
      },
    };

    try {
      await updateSetting.mutateAsync({
        key: PROMPT_ENGINE_SETTINGS_KEY,
        value: serializeSetting(updatedSettings),
      });
      toast(`Added ${nextLearned.length} learned pattern(s).`, { variant: 'success' });
      setLearnOpen(false);
      setLearnCandidates([]);
      setLearnSelection({});
    } catch (error) {
      logClientError(error, { context: { source: 'AdminImageStudioPage', action: 'saveLearnedPatterns' } });
      toast('Failed to save learned patterns.', { variant: 'error' });
    }
  }, [buildRuleKey, learnCandidates, learnSelection, ruleSignature, promptEngineSettings, promptValidationSettings, toast, updateSetting]);

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

  useEffect(() => {
    if (!paramsState) return;
    const existingPaths = new Set(paramLeaves.map((leaf: ParamLeaf) => leaf.path));
    setParamFlipMap((prev: Record<string, boolean>) => {
      const next: Record<string, boolean> = {};
      Object.entries(prev).forEach(([path, flipped]: [string, boolean]) => {
        if (!existingPaths.has(path)) return;
        next[path] = flipped;
      });
      if (Object.keys(next).length === Object.keys(prev).length) return prev;
      void _persistParamFlipMap(next);
      return next;
    });
  }, [paramLeaves, paramsState, _persistParamFlipMap]);

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
        source: 'heuristic',
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
      if (typeof spec?.min === 'number' || typeof spec?.max === 'number') {
        hintParts.push(`range: ${spec?.min ?? '?'}–${spec?.max ?? '?'}`);
      }
      if (spec?.enumOptions?.length) {
        hintParts.push(`enum: ${spec.enumOptions.length} option(s)`);
      }
      const hint = hintParts.length > 0 ? hintParts.join(' • ') : null;
      const selected = a?.control ?? h?.control ?? 'auto';
      return {
        path,
        valuePreview: h?.valuePreview ?? a?.valuePreview ?? '',
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
      toast('Extract params first so we can infer UI controls.', { variant: 'error' });
      return;
    }
    setUiSuggestOpen(true);
    setUiSuggestLoading(true);
    try {
      const heuristic = uiSuggestMode === 'heuristic' || uiSuggestMode === 'both'
        ? buildHeuristicSuggestions()
        : [];
      let ai: UiSuggestion[] = [];
      if (uiSuggestMode === 'ai' || uiSuggestMode === 'both') {
        const res = await fetch('/api/image-studio/ui-extractor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
        if (!res.ok) throw new Error(data?.error || 'Failed to extract UI suggestions.');
        ai = Array.isArray(data?.suggestions) ? data.suggestions : [];
      }
      setUiSuggestionRows(buildSuggestionRows(heuristic, ai));
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to extract UI suggestions.', { variant: 'error' });
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
      toast('Select at least one suggestion to apply.', { variant: 'error' });
      return;
    }
    setParamUiOverrides((prev: Record<string, ParamUiControl>) => {
      const next = { ...prev };
      toApply.forEach((row: UiSuggestionRow) => {
        if (row.selected === 'auto') {
          delete next[row.path];
        } else {
          next[row.path] = row.selected;
        }
      });
      return next;
    });
    toast(`Applied ${toApply.length} UI suggestion(s).`, { variant: 'success' });
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
      type: 'rect',
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
      type: 'polygon',
      points: clamped,
      closed: true,
      visible: true,
    };
    setMaskShapes((prev: MaskShape[]) => [...prev, newShape]);
    setActiveMaskId(newShape.id);
  }, []);

  const handleGenerateMask = useCallback(async (mode: 'threshold' | 'edges' | 'ai-bbox' | 'ai-polygon'): Promise<void> => {
    if (!workingSlotImageSrc) {
      toast('Load a slot into preview first.', { variant: 'error' });
      return;
    }
    setMaskGenLoading(true);
    try {
      let bbox: { x: number; y: number; w: number; h: number } | null = null;
      let polygon: Point[] | null = null;
      if (mode === 'threshold') {
        bbox = await computeBboxFromThreshold(workingSlotImageSrc);
      } else if (mode === 'edges') {
        bbox = await computeBboxFromEdges(workingSlotImageSrc);
      } else {
        const res = await fetch('/api/image-studio/mask/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imagePath: workingSlotImageSrc, mode: mode === 'ai-polygon' ? 'polygon' : 'bbox' }),
        });
        const data = (await res.json().catch(() => null)) as { bbox?: { x: number; y: number; w: number; h: number }; polygon?: Point[]; error?: string } | null;
        if (!res.ok) throw new Error(data?.error || 'AI mask generation failed.');
        bbox = data?.bbox ?? null;
        polygon = data?.polygon ?? null;
      }
      if (polygon && polygon.length >= 3) {
        addMaskFromPolygon(polygon, 'AI polygon');
      } else if (bbox) {
        addMaskFromBbox(bbox, mode === 'ai-bbox' ? 'AI bbox' : mode === 'edges' ? 'Edge mask' : 'Threshold mask');
      } else {
        toast('Could not detect a subject. Try another mode.', { variant: 'error' });
        return;
      }
      toast('Mask generated.', { variant: 'success' });
      setMaskGenOpen(false);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to generate mask.', { variant: 'error' });
    } finally {
      setMaskGenLoading(false);
    }
  }, [addMaskFromBbox, addMaskFromPolygon, workingSlotImageSrc, toast]);

  const handleApplyImageUrl = useCallback(async (): Promise<void> => {
    if (!selectedSlot) return;
    const url = slotImageUrlDraft.trim();
    if (!url) {
      toast('Enter an image URL first.', { variant: 'error' });
      return;
    }
    setSlotUpdateBusy(true);
    try {
      const dataUrl = await fetchBase64FromUrl(url).catch(() => null);
      await updateSlotMutation.mutateAsync({
        id: selectedSlot.id,
        data: {
          imageUrl: url,
          imageFileId: null,
          imageBase64: dataUrl,
        },
      });
      toast('Slot image updated.', { variant: 'success' });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to update slot image.', { variant: 'error' });
    } finally {
      setSlotUpdateBusy(false);
    }
  }, [selectedSlot, slotImageUrlDraft, toast, updateSlotMutation]);

  const handleApplyBase64 = useCallback(async (): Promise<void> => {
    if (!selectedSlot) return;
    const value = slotBase64Draft.trim();
    if (!value) {
      toast('Paste a base64 data URL first.', { variant: 'error' });
      return;
    }
    setSlotUpdateBusy(true);
    try {
      await updateSlotMutation.mutateAsync({
        id: selectedSlot.id,
        data: {
          imageFileId: null,
          imageBase64: value,
        },
      });
      toast('Slot base64 updated.', { variant: 'success' });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to update slot base64.', { variant: 'error' });
    } finally {
      setSlotUpdateBusy(false);
    }
  }, [selectedSlot, slotBase64Draft, toast, updateSlotMutation]);

  const handleClearSlotMedia = useCallback(async (): Promise<void> => {
    if (!selectedSlot) return;
    setSlotUpdateBusy(true);
    try {
      await updateSlotMutation.mutateAsync({
        id: selectedSlot.id,
        data: {
          imageUrl: null,
          imageBase64: null,
          imageFileId: null,
          screenshotFileId: null,
        },
      });
      setSlotImageUrlDraft('');
      setSlotBase64Draft('');
      toast('Slot media cleared.', { variant: 'success' });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to clear slot.', { variant: 'error' });
    } finally {
      setSlotUpdateBusy(false);
    }
  }, [selectedSlot, toast, updateSlotMutation]);

  const handleUpload3DAsset = useCallback(
    async (files: File[]): Promise<void> => {
      if (!selectedSlot) return;
      const file = files[0];
      if (!file) return;
      setSlotUpdateBusy(true);
      try {
        const uploaded = await uploadAsset3DFile(file, undefined, () => {});
        await updateSlotMutation.mutateAsync({
          id: selectedSlot.id,
          data: { asset3dId: uploaded.id },
        });
        toast('3D asset attached.', { variant: 'success' });
      } catch (error) {
        toast(error instanceof Error ? error.message : 'Failed to upload 3D asset.', { variant: 'error' });
      } finally {
        setSlotUpdateBusy(false);
      }
    },
    [selectedSlot, toast, updateSlotMutation]
  );

  const handleCaptureScreenshot = useCallback(async (): Promise<void> => {
    if (!workingSlot) {
      toast('Load a slot into preview first.', { variant: 'error' });
      return;
    }
    if (!workingSlot.asset3dId) {
      toast('No 3D asset attached to this slot.', { variant: 'error' });
      return;
    }
    const capture = captureRef.current;
    if (!capture) {
      toast('3D preview not ready yet.', { variant: 'error' });
      return;
    }
    const dataUrl = capture();
    if (!dataUrl) {
      toast('Failed to capture screenshot.', { variant: 'error' });
      return;
    }
    const res = await fetch(`/api/image-studio/slots/${encodeURIComponent(workingSlot.id)}/screenshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataUrl }),
    });
    const data = (await res.json().catch(() => null)) as ImageStudioSlotRecord | { error?: string } | null;
    if (!res.ok || !data || 'error' in data) {
      toast((data && 'error' in data && data.error) || 'Failed to save screenshot.', { variant: 'error' });
      return;
    }
    const savedSlot = data as ImageStudioSlotRecord;
    queryClient.setQueryData(['image-studio', 'slots', projectId], (prev: StudioSlotsResponse | undefined) => {
      const current = Array.isArray(prev?.slots) ? prev?.slots ?? [] : [];
      const byId = new Map<string, ImageStudioSlotRecord>();
      current.forEach((slot: ImageStudioSlotRecord) => byId.set(slot.id, slot));
      byId.set(savedSlot.id, savedSlot);
      return { slots: Array.from(byId.values()) };
    });
    toast('Screenshot saved to slot.', { variant: 'success' });
  }, [projectId, queryClient, toast, workingSlot]);

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
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        setAdvancedOverridesError('Must be a JSON object (or null).');
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
      setAdvancedOverridesError('Invalid JSON.');
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
    const nextSettings = {
      ...promptEngineSettings,
      promptValidation: { ...promptValidationSettings, rules: parsed.rules },
    };
    void updateSetting.mutateAsync({
      key: PROMPT_ENGINE_SETTINGS_KEY,
      value: serializeSetting(nextSettings),
    }).catch((error: unknown) => {
      logClientError(error, { context: { source: 'AdminImageStudioPage', action: 'savePromptValidationRules' } });
    });
  }, [promptEngineSettings, promptValidationSettings, updateSetting]);

  const saveStudioSettings = useCallback(async (): Promise<void> => {
    if (advancedOverridesError) {
      toast(`Settings not saved: ${advancedOverridesError}`, { variant: 'error' });
      return;
    }
    if (promptValidationRulesError) {
      toast(`Settings not saved: ${promptValidationRulesError}`, { variant: 'error' });
      return;
    }

    if (studioSettings.promptExtraction.mode === 'gpt' && !studioSettings.promptExtraction.gpt.model.trim()) {
      toast('Prompt extract model is required when prompt extraction mode is GPT.', { variant: 'error' });
      return;
    }

    if (!studioSettings.targetAi.openai.model.trim()) {
      toast('Target AI model is required.', { variant: 'error' });
      return;
    }

    try {
      await updateSetting.mutateAsync({
        key: IMAGE_STUDIO_SETTINGS_KEY,
        value: serializeSetting(studioSettings),
      });
      toast('Image Studio settings saved.', { variant: 'success' });
    } catch (error: unknown) {
      logClientError(error, { context: { source: 'AdminImageStudioPage', action: 'saveSettings' } });
      toast('Failed to save Image Studio settings.', { variant: 'error' });
    }
  }, [advancedOverridesError, promptValidationRulesError, studioSettings, toast, updateSetting]);

  const resetStudioSettings = useCallback((): void => {
    setStudioSettings(defaultImageStudioSettings);
    setAdvancedOverridesText(JSON.stringify(defaultImageStudioSettings.targetAi.openai.advanced_overrides ?? {}, null, 2));
    setAdvancedOverridesError(null);
    setPromptValidationRulesText(JSON.stringify(defaultPromptEngineSettings.promptValidation.rules, null, 2));
    setPromptValidationRulesError(null);
  }, []);

  const handleRefreshSettings = useCallback((): void => {
    setSettingsLoaded(false);
    void settingsStore.refetch();
    void heavySettings.refetch();
  }, [settingsStore, heavySettings]);

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
    const errors = validationIssues.filter((i: ParamIssue) => i.severity === 'error').length;
    const warnings = validationIssues.filter((i: ParamIssue) => i.severity === 'warning').length;
    return { errors, warnings };
  }, [validationIssues]);

  const handleParamChange = useCallback((path: string, value: unknown): void => {
    setParamsState((prev: Record<string, unknown> | null) => {
      if (!prev) return prev;
      return setDeepValue(prev, path, value);
    });
  }, []);

  const handleParamUiControlChange = useCallback((path: string, nextControl: ParamUiControl): void => {
    setParamUiOverrides((prev: Record<string, ParamUiControl>) => {
      if (nextControl === 'auto') {
        if (!(path in prev)) return prev;
        const { [path]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [path]: nextControl };
    });
  }, []);

  const handleParamFlip = useCallback(
    (path: string): void => {
      setParamFlipMap((prev: Record<string, boolean>) => {
        const next = !prev[path];
        const updated = { ...prev, [path]: next };
        void _persistParamFlipMap(updated);
        return updated;
      });
    },
    [_persistParamFlipMap]
  );

  const paramsContextValue = useMemo(
    () => ({
      paramSpecs,
      paramUiOverrides,
      paramFlipMap: _paramFlipMap,
      issuesByPath,
      onParamChange: handleParamChange,
      onParamFlip: handleParamFlip,
      onParamUiControlChange: handleParamUiControlChange,
    }),
    [
      _paramFlipMap,
      handleParamChange,
      handleParamFlip,
      handleParamUiControlChange,
      issuesByPath,
      paramSpecs,
      paramUiOverrides,
    ]
  );

  const maskPolygons = useMemo<Point[][]>(() => {
    const polygons: Point[][] = [];
    maskShapes.forEach((shape: MaskShape) => {
      if (!shape.visible) return;
      if (shape.type === 'polygon' || shape.type === 'lasso' || shape.type === 'brush') {
        if (shape.closed && shape.points.length >= 3) polygons.push(shape.points);
        return;
      }
      if (shape.type === 'rect' && shape.points.length >= 2) {
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
      if (shape.type === 'ellipse' && shape.points.length >= 2) {
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
    if (!extractResult || !extractResult.ok || !paramsState || !promptSourceAtExtract) return '';
    const json = JSON.stringify(paramsState, null, 2);
    return `${promptSourceAtExtract.slice(0, extractResult.objectStart)}${json}${promptSourceAtExtract.slice(extractResult.objectEnd)}`;
  }, [extractResult, paramsState, promptSourceAtExtract]);

  const promptValidationIssues: PromptValidationIssue[] = useMemo(() => {
    if (studioSettings.promptExtraction.mode !== 'programmatic') return [];
    return validateProgrammaticPrompt(promptText, promptValidationSettings);
  }, [promptText, studioSettings.promptExtraction.mode, promptValidationSettings]);

  const runPayload = useMemo(() => {
    const safeProjectId = sanitizeStudioProjectId(projectId);
    const prefix = `${STUDIO_UPLOAD_PREFIX}${safeProjectId}/`;
    const referenceAssets = compositeAssets
      .map((slot: ImageStudioSlotRecord) => {
        const filepath =
          normalizePublicPath(slot.imageFile?.filepath ?? null) ??
          normalizePublicPath(slot.imageUrl ?? null) ??
          normalizePublicPath(slot.screenshotFile?.filepath ?? null);
        if (!filepath || !filepath.startsWith(prefix)) return null;
        return { id: slot.imageFileId ?? slot.id, filepath };
      })
      .filter(
        (entry: { id: string; filepath: string } | null): entry is { id: string; filepath: string } => Boolean(entry)
      );
    return {
      projectId: projectId || null,
      asset: workingSlotRunAsset ?? null,
      referenceAssets,
      mask: maskPolygons.length > 0 ? { type: 'polygons', polygons: maskPolygons, invert: maskInvert, feather: maskFeather } : null,
      prompt: generatedPrompt || promptText || null,
      extractedParams: paramsState,
      studioSettings,
    };
  }, [projectId, workingSlotRunAsset, compositeAssets, maskPolygons, maskInvert, maskFeather, generatedPrompt, promptText, paramsState, studioSettings]);

  const runMutation = useMutation({
    mutationFn: async (): Promise<StudioRunResponse> => {
      if (!projectId) throw new Error('Select a project first.');
      if (!workingSlotRunAsset) throw new Error('Load an image slot into preview first.');
      const prompt = (generatedPrompt || promptText || '').trim();
      if (!prompt) throw new Error('Prompt is required.');

      const safeProjectId = sanitizeStudioProjectId(projectId);
      const prefix = `${STUDIO_UPLOAD_PREFIX}${safeProjectId}/`;
      const referenceAssets = compositeAssets
        .map((slot: ImageStudioSlotRecord) => {
          const filepath =
            normalizePublicPath(slot.imageFile?.filepath ?? null) ??
            normalizePublicPath(slot.imageUrl ?? null) ??
            normalizePublicPath(slot.screenshotFile?.filepath ?? null);
          if (!filepath || !filepath.startsWith(prefix)) return null;
          return { id: slot.imageFileId ?? slot.id, filepath };
        })
        .filter((entry: { id: string; filepath: string } | null): entry is { id: string; filepath: string } => Boolean(entry));

      const payload = {
        projectId,
        asset: workingSlotRunAsset,
        referenceAssets,
        mask: maskPolygons.length > 0
          ? { type: 'polygons', polygons: maskPolygons, invert: maskInvert, feather: maskFeather }
          : null,
        prompt,
        extractedParams: paramsState,
        studioSettings,
      };

      const res = await fetch('/api/image-studio/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => null)) as StudioRunResponse | { error?: string } | null;
      if (!res.ok) {
        throw new Error((data && 'error' in data && data.error) || 'Run failed');
      }
      return (data ?? { outputs: [] }) as StudioRunResponse;
    },
    onSuccess: async (data: StudioRunResponse): Promise<void> => {
      await queryClient.invalidateQueries({ queryKey: ['image-studio', 'slots', projectId] });
      await queryClient.invalidateQueries({ queryKey: ['image-studio', 'projects'] });
      const outputs = data.outputs ?? [];
      if (outputs.length > 0) {
        const output = outputs[0]!;
        const created = await createSlots([
          {
            name: output.filename ?? 'Output',
            folderPath: selectedFolder || null,
            imageFileId: output.id,
            imageUrl: normalizePublicPath(output.filepath),
          } as Partial<ImageStudioSlotRecord>,
        ]);
        if (created.length > 0) {
          setSelectedSlotId(created[0]!.id);
        }
      }
      toast(`Run complete. ${outputs.length} image(s) added.`, { variant: 'success' });
    },
    onError: (error: unknown): void => {
      toast(error instanceof Error ? error.message : 'Run failed.', { variant: 'error' });
    },
  });

  const settingsPanel = (
    <div className="rounded border border-border bg-card/40 overflow-hidden">
      <PanelHeader
        title="Studio Settings"
        actions={(
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshSettings}
              disabled={settingsStore.isFetching}
              title="Reload settings"
            >
              <RefreshCcw className={cn('mr-2 size-4', settingsStore.isFetching ? 'animate-spin' : '')} />
              Refresh
            </Button>
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
              {updateSetting.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        )}
      />

      <div className="p-3 space-y-4">
        {settingsStore.isLoading && !settingsLoaded ? (
          <div className="text-xs text-gray-500">Loading settings…</div>
        ) : null}

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
                      mode: value === 'gpt' ? 'gpt' : 'programmatic',
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
                value={studioSettings.promptExtraction.gpt.temperature ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const raw = e.target.value;
                  const next = raw === '' ? null : Number(raw);
                  if (raw !== '' && !Number.isFinite(next)) return;
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
                value={studioSettings.promptExtraction.gpt.top_p ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const raw = e.target.value;
                  const next = raw === '' ? null : Number(raw);
                  if (raw !== '' && !Number.isFinite(next)) return;
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
                value={studioSettings.promptExtraction.gpt.max_output_tokens ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const raw = e.target.value;
                  const next = raw === '' ? null : Number(raw);
                  if (raw !== '' && (!Number.isFinite(next) || !Number.isInteger(next))) return;
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
                checked={promptValidationSettings.enabled}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const nextSettings = {
                    ...promptEngineSettings,
                    promptValidation: { ...promptValidationSettings, enabled: e.target.checked },
                  };
                  void updateSetting.mutateAsync({
                    key: PROMPT_ENGINE_SETTINGS_KEY,
                    value: serializeSetting(nextSettings),
                  }).catch((error: unknown) => {
                    logClientError(error, { context: { source: 'AdminImageStudioPage', action: 'togglePromptValidation' } });
                    toast('Failed to update prompt validator.', { variant: 'error' });
                  });
                }}
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
                      mode: value === 'ai' || value === 'both' ? value : 'heuristic',
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
                value={studioSettings.uiExtractor.temperature ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const next = e.target.value === '' ? null : Number(e.target.value);
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
                value={studioSettings.uiExtractor.max_output_tokens ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const next = e.target.value === '' ? null : Number(e.target.value);
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
                    targetAi: { ...prev.targetAi, openai: { ...prev.targetAi.openai, api: value === 'responses' ? 'responses' : 'images' } },
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
                placeholder={studioSettings.targetAi.openai.api === 'images' ? 'e.g. gpt-image-1' : 'e.g. gpt-4o-mini'}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <div className="text-[11px] text-gray-500">Temperature</div>
              <Input
                type="number"
                value={studioSettings.targetAi.openai.temperature ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const raw = e.target.value;
                  const next = raw === '' ? null : Number(raw);
                  if (raw !== '' && !Number.isFinite(next)) return;
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
                value={studioSettings.targetAi.openai.top_p ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const raw = e.target.value;
                  const next = raw === '' ? null : Number(raw);
                  if (raw !== '' && !Number.isFinite(next)) return;
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
                value={studioSettings.targetAi.openai.max_output_tokens ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const raw = e.target.value;
                  const next = raw === '' ? null : Number(raw);
                  if (raw !== '' && (!Number.isFinite(next) || !Number.isInteger(next))) return;
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
                value={studioSettings.targetAi.openai.seed ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const raw = e.target.value;
                  const next = raw === '' ? null : Number(raw);
                  if (raw !== '' && (!Number.isFinite(next) || !Number.isInteger(next))) return;
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
                value={studioSettings.targetAi.openai.presence_penalty ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const raw = e.target.value;
                  const next = raw === '' ? null : Number(raw);
                  if (raw !== '' && !Number.isFinite(next)) return;
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
                value={studioSettings.targetAi.openai.frequency_penalty ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const raw = e.target.value;
                  const next = raw === '' ? null : Number(raw);
                  if (raw !== '' && !Number.isFinite(next)) return;
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
                value={studioSettings.targetAi.openai.tool_choice ?? '__null__'}
                onValueChange={(value: string) =>
                  setStudioSettings((prev: ImageStudioSettings) => ({
                    ...prev,
                    targetAi: {
                      ...prev.targetAi,
                      openai: { ...prev.targetAi.openai, tool_choice: value === '__null__' ? null : value === 'none' ? 'none' : 'auto' },
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
                value={studioSettings.targetAi.openai.reasoning_effort ?? '__null__'}
                onValueChange={(value: string) =>
                  setStudioSettings((prev: ImageStudioSettings) => ({
                    ...prev,
                    targetAi: {
                      ...prev.targetAi,
                      openai: {
                        ...prev.targetAi.openai,
                        reasoning_effort: value === '__null__' ? null : (value as ImageStudioSettings['targetAi']['openai']['reasoning_effort']),
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
                value={studioSettings.targetAi.openai.response_format ?? '__null__'}
                onValueChange={(value: string) =>
                  setStudioSettings((prev: ImageStudioSettings) => ({
                    ...prev,
                    targetAi: {
                      ...prev.targetAi,
                      openai: {
                        ...prev.targetAi.openai,
                        response_format: value === '__null__' ? null : value === 'json' ? 'json' : 'text',
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
                value={studioSettings.targetAi.openai.user ?? ''}
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
              Tip: store your API key at <span className="text-gray-300">/admin/settings/brain</span>.
            </div>
          </div>

          {studioSettings.targetAi.openai.api === 'images' ? (
            <div className="space-y-2 rounded border border-border/60 bg-card/30 p-2">
              <div className="text-xs text-gray-400">Images API options</div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <div className="text-[11px] text-gray-500">Size</div>
                  <Input
                    value={studioSettings.targetAi.openai.image.size ?? ''}
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
                    value={studioSettings.targetAi.openai.image.quality ?? '__null__'}
                    onValueChange={(value: string) =>
                      setStudioSettings((prev: ImageStudioSettings) => ({
                        ...prev,
                        targetAi: {
                          ...prev.targetAi,
                          openai: {
                            ...prev.targetAi.openai,
                            image: {
                              ...prev.targetAi.openai.image,
                              quality: value === '__null__' ? null : value === 'high' ? 'high' : 'standard',
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
                    value={studioSettings.targetAi.openai.image.background ?? '__null__'}
                    onValueChange={(value: string) =>
                      setStudioSettings((prev: ImageStudioSettings) => ({
                        ...prev,
                        targetAi: {
                          ...prev.targetAi,
                          openai: {
                            ...prev.targetAi.openai,
                            image: {
                              ...prev.targetAi.openai.image,
                              background: value === '__null__' ? null : value === 'transparent' ? 'transparent' : 'white',
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
                    value={studioSettings.targetAi.openai.image.format ?? 'png'}
                    onValueChange={(value: string) =>
                      setStudioSettings((prev: ImageStudioSettings) => ({
                        ...prev,
                        targetAi: {
                          ...prev.targetAi,
                          openai: {
                            ...prev.targetAi.openai,
                            image: { ...prev.targetAi.openai.image, format: value === 'jpeg' ? 'jpeg' : 'png' },
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
                    value={studioSettings.targetAi.openai.image.n ?? ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const raw = e.target.value;
                      const next = raw === '' ? null : Number(raw);
                      if (raw !== '' && (!Number.isFinite(next) || !Number.isInteger(next))) return;
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
    <div className="container mx-auto max-w-none flex min-h-[calc(100vh-5rem)] flex-col gap-4 py-6">
      <ClientOnly fallback={<div className="flex min-h-0 flex-1" />}>
        <Tabs
          id="image-studio-tabs"
          value={activeTab}
          onValueChange={handleTabChange}
          className="flex min-h-0 flex-1 flex-col gap-4"
        >
          <TabsContent value="studio" className="mt-0 flex min-h-0 flex-1 flex-col gap-4">

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
              open={extractReviewOpen}
              onClose={() => setExtractReviewOpen(false)}
              title="Review parameter extraction"
              size="lg"
            >
              <div className="space-y-4 text-sm text-gray-200">
                <div className="space-y-2">
                  <div className="text-[11px] text-gray-400">Prompt to extract from</div>
                  <Textarea
                    value={extractDraftPrompt}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setExtractDraftPrompt(e.target.value)}
                    className="h-36 font-mono text-[11px]"
                    placeholder="Paste or edit your prompt before extracting parameters."
                  />
                </div>

                {extractDraftPrompt.trim() ? (
                  extractPreviewResult ? (
                    extractPreviewResult.ok ? (
                      <div className="space-y-3 rounded border border-border bg-card/60 p-3">
                        <div className="flex items-center justify-between gap-3 text-[11px]">
                          <div className="text-gray-400">
                      Proposed params: <span className="text-gray-200">{extractPreviewLeaves.length}</span>
                          </div>
                          <div className="text-gray-500">
                      Validation:{' '}
                            {extractPreviewValidationSummary.errors === 0 && extractPreviewValidationSummary.warnings === 0 ? (
                              <span className="text-emerald-300">OK</span>
                            ) : (
                              <>
                                {extractPreviewValidationSummary.errors > 0 ? (
                                  <span className="text-red-300">{extractPreviewValidationSummary.errors} error(s)</span>
                                ) : (
                                  <span className="text-gray-400">0 errors</span>
                                )}
                                {' • '}
                                {extractPreviewValidationSummary.warnings > 0 ? (
                                  <span className="text-yellow-300">{extractPreviewValidationSummary.warnings} warning(s)</span>
                                ) : (
                                  <span className="text-gray-400">0 warnings</span>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        <div className="max-h-72 space-y-2 overflow-auto text-[11px] text-gray-300">
                          {extractPreviewLeaves.length === 0 ? (
                            <div className="text-gray-400">No parameters detected.</div>
                          ) : (
                            extractPreviewLeaves.map((leaf: ParamLeaf) => {
                              const spec = extractPreviewSpec?.[leaf.path];
                              const rec = recommendParamUiControl(leaf.value, spec);
                              const selectedOverride = extractPreviewUiOverrides[leaf.path] ?? 'auto';
                              const issues = extractPreviewIssuesByPath[leaf.path] ?? [];
                              const errors = issues.filter((issue: ParamIssue) => issue.severity === 'error');
                              const warnings = issues.filter((issue: ParamIssue) => issue.severity === 'warning');
                              return (
                                <div key={leaf.path} className="rounded border border-border/60 bg-background/40 p-2">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="min-w-0 truncate font-mono text-gray-200">{leaf.path}</div>
                                    <div className="text-gray-500">
                                Type:{' '}
                                      <span className="text-gray-300">
                                        {Array.isArray(leaf.value) ? 'array' : leaf.value === null ? 'null' : typeof leaf.value}
                                      </span>
                                      {spec?.kind ? (
                                        <>
                                          {' • '}
                                    Kind: <span className="text-gray-300">{spec.kind}</span>
                                        </>
                                      ) : null}
                                    </div>
                                  </div>

                                  <div className="mt-1 text-gray-400">
                              Value: <span className="text-gray-300">{safeJsonStringify(leaf.value)}</span>
                                  </div>

                                  <div className="mt-1 text-gray-500">
                              Suggested control:{' '}
                                    <span className="text-gray-300">{paramUiControlLabel(rec.recommended)}</span>
                                    {rec.reason ? (
                                      <>
                                        {' • '}
                                        <span className="text-gray-400">{rec.reason}</span>
                                      </>
                                    ) : null}
                                  </div>

                                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                                    <div className="text-gray-500">Selector:</div>
                                    <Select
                                      value={selectedOverride}
                                      onValueChange={(next: string) => {
                                        if (!isParamUiControl(next)) return;
                                        setExtractPreviewUiOverrides((prev: Record<string, ParamUiControl>) => {
                                          if (next === 'auto') {
                                            if (!(leaf.path in prev)) return prev;
                                            const { [leaf.path]: _removed, ...rest } = prev;
                                            return rest;
                                          }
                                          return { ...prev, [leaf.path]: next };
                                        });
                                      }}
                                    >
                                      <SelectTrigger className="h-7 w-[140px] px-2">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {rec.options.map((opt: ParamUiControl) => (
                                          <SelectItem key={opt} value={opt}>
                                            {opt === 'auto' ? `Auto (${paramUiControlLabel(rec.recommended)})` : paramUiControlLabel(opt)}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  {spec ? (
                                    <div className="mt-1 text-gray-500">
                                      {spec.hint ? (
                                        <span>
                                    Hint: <span className="text-gray-400">{spec.hint}</span>
                                        </span>
                                      ) : null}
                                      {(spec.min !== undefined || spec.max !== undefined || spec.step !== undefined) ? (
                                        <span>
                                          {spec.hint ? ' • ' : ''}
                                    Range:{' '}
                                          <span className="text-gray-400">
                                            {spec.min ?? '?'}..{spec.max ?? '?'} step {spec.step ?? '?'}
                                          </span>
                                        </span>
                                      ) : null}
                                      {spec.enumOptions ? (
                                        <span>
                                          {(spec.hint || spec.min !== undefined || spec.max !== undefined || spec.step !== undefined) ? ' • ' : ''}
                                    Enum: <span className="text-gray-400">{spec.enumOptions.join(', ')}</span>
                                        </span>
                                      ) : null}
                                    </div>
                                  ) : null}

                                  {errors.length > 0 || warnings.length > 0 ? (
                                    <div className="mt-2 space-y-1">
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
                                </div>
                              );
                            })
                          )}
                        </div>

                        <div className="space-y-1">
                          <div className="text-[11px] text-gray-500">Raw extracted JSON</div>
                          <Textarea
                            value={extractPreviewResult.ok ? safeJsonStringify(extractPreviewResult.params) : ''}
                            readOnly
                            className="h-28 font-mono text-[11px]"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="rounded border border-red-500/40 bg-red-500/10 p-3 text-[11px] text-red-200">
                        {String(extractPreviewResult.error)}
                      </div>
                    )
                  ) : (
                    <div className="text-[11px] text-gray-400">No preview available yet.</div>
                  )
                ) : (
                  <div className="text-[11px] text-gray-400">Add a prompt to preview extracted parameters.</div>
                )}

                {studioSettings.promptExtraction.mode !== 'programmatic' ? (
                  <div className="rounded border border-border bg-card/60 p-3 text-[11px] text-gray-300">
              AI extraction is not wired yet. Selected model:{' '}
                    <span className="text-gray-200">{studioSettings.promptExtraction.gpt.model}</span>. Configure at
                    {' '}
                    <span className="text-gray-200">/admin/settings/brain</span>.
                  </div>
                ) : null}

                <div className="flex items-center justify-end gap-2">
                  <Button variant="outline" onClick={() => setExtractReviewOpen(false)}>
              Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      if (!extractDraftPrompt.trim()) return;
                      if (studioSettings.promptExtraction.mode !== 'programmatic') {
                        toast(
                          `AI extraction is not wired yet. Selected model: ${studioSettings.promptExtraction.gpt.model}. (API key: /admin/settings/brain)`,
                          { variant: 'info' }
                        );
                        return;
                      }
                      setPromptText(extractDraftPrompt);
                      applyProgrammaticExtraction(extractDraftPrompt);
                      setParamUiOverrides((prev: Record<string, ParamUiControl>) => {
                        if (!extractPreviewUiOverrides || Object.keys(extractPreviewUiOverrides).length === 0) return prev;
                        return { ...prev, ...extractPreviewUiOverrides };
                      });
                      setExtractReviewOpen(false);
                    }}
                    disabled={!extractDraftPrompt.trim()}
                  >
              Extract params
                  </Button>
                </div>
              </div>
            </SharedModal>

            <SharedModal
              open={slotInlineEditOpen && Boolean(selectedSlot)}
              onClose={() => setSlotInlineEditOpen(false)}
              title="Edit slot"
              size="lg"
            >
              {selectedSlot ? (
                <div className="space-y-4 text-sm text-gray-200">
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <Select
                      value={moveTargetFolder === '' ? '__root__' : moveTargetFolder}
                      onValueChange={(value: string) => {
                        setMoveTargetFolder(value === '__root__' ? '' : value);
                      }}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Move to folder" />
                      </SelectTrigger>
                      <SelectContent>
                        {folderOptions.map((folder: string) => (
                          <SelectItem key={folder || '__root__'} value={folder || '__root__'}>
                            {folder || '(root)'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={moveSlotMutation.isPending || (selectedSlot.folderPath ?? '') === moveTargetFolder}
                      onClick={() => {
                        void moveSlotMutation.mutateAsync({ slot: selectedSlot, targetFolder: moveTargetFolder });
                      }}
                    >
                Move
                    </Button>
                  </div>

                  {!isImageSlot ? (
                    <>
                      <div className="space-y-2 rounded border border-border/60 bg-card/40 p-2">
                        <div className="text-[11px] text-gray-400">Slot image</div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setDriveImportMode('replace');
                              setDriveImportTargetId(selectedSlot.id);
                              setDriveImportOpen(true);
                            }}
                            disabled={slotUpdateBusy || importFromDriveMutation.isPending}
                          >
                            <Folder className="mr-2 size-4" />
                      Replace from Drive
                          </Button>
                          <FileUploadButton
                            variant="outline"
                            size="sm"
                            accept="image/*"
                            disabled={slotUpdateBusy}
                            onFilesSelected={handleReplaceUpload}
                          >
                            <Upload className="mr-2 size-4" />
                      Replace from Upload
                          </FileUploadButton>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            value={slotImageUrlDraft}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSlotImageUrlDraft(e.target.value)}
                            placeholder="Paste image URL"
                            className="h-8"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => void handleApplyImageUrl()}
                            disabled={slotUpdateBusy}
                          >
                      Use URL
                          </Button>
                        </div>
                        <Textarea
                          value={slotBase64Draft}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSlotBase64Draft(e.target.value)}
                          placeholder="Paste base64 data URL"
                          className="min-h-[80px] text-xs"
                        />
                        <div className="flex items-center justify-between gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => void handleApplyBase64()}
                            disabled={slotUpdateBusy}
                          >
                      Use Base64
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => void handleClearSlotMedia()}
                            disabled={slotUpdateBusy}
                          >
                      Clear
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2 rounded border border-border/60 bg-card/40 p-2">
                        <div className="text-[11px] text-gray-400">3D asset</div>
                        <Asset3DPickerField
                          value={selectedSlot.asset3dId ?? ''}
                          onChange={(value: string) => {
                            void updateSlotMutation.mutateAsync({
                              id: selectedSlot.id,
                              data: { asset3dId: value || null },
                            });
                          }}
                          disabled={slotUpdateBusy}
                        />
                        <FileUploadButton
                          variant="outline"
                          size="sm"
                          accept=".glb,.gltf,model/gltf-binary"
                          disabled={slotUpdateBusy}
                          onFilesSelected={async (files: File[]) => {
                            await handleUpload3DAsset(files);
                          }}
                        >
                          <Upload className="mr-2 size-4" />
                    Upload 3D
                        </FileUploadButton>
                      </div>

                      <div className="space-y-2 rounded border border-border/60 bg-card/40 p-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-[11px] text-gray-400">Composite sources</div>
                          {compositeAssetIds.length > 0 ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-[10px]"
                              onClick={() => setCompositeAssetIds([])}
                            >
                        Clear
                            </Button>
                          ) : null}
                        </div>
                        <MultiSelect
                          options={compositeAssetOptions}
                          selected={compositeAssetIds}
                          onChange={(values: string[]) => {
                            const baseId = workingSlotId ?? selectedSlotId;
                            const next = values.filter((id: string) => id !== baseId);
                            setCompositeAssetIds(next);
                          }}
                          placeholder="Add slots for compositing"
                          searchPlaceholder="Search slots..."
                          disabled={!projectId || compositeAssetOptions.length === 0}
                          className="text-xs"
                        />
                        {compositeAssets.length > 0 ? (
                          <div className="space-y-1">
                            {compositeAssets.map((slot: ImageStudioSlotRecord) => {
                              const folder = slot.folderPath ?? '';
                              const name = slot.name || slot.id;
                              const label = folder ? `${folder}/${name}` : name;
                              return (
                                <div
                                  key={slot.id}
                                  className="flex items-center justify-between gap-2 rounded border border-border/40 bg-muted/40 px-2 py-1 text-[11px]"
                                >
                                  <span className="truncate text-gray-300">{label}</span>
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6"
                                    onClick={() =>
                                      setCompositeAssetIds((prev: string[]) => prev.filter((id: string) => id !== slot.id))
                                    }
                                  >
                                    <X className="size-3" />
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-[10px] text-gray-500">
                      Optional. Send up to 16 images total (including base).
                          </div>
                        )}
                      </div>
                    </>
                  ) : null}

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-full text-red-300 hover:text-red-200"
                    disabled={deleteSlotMutation.isPending}
                    onClick={() => {
                      const confirmed = window.confirm(`Delete "${selectedSlot.name ?? selectedSlot.id}"? This cannot be undone.`);
                      if (!confirmed) return;
                      void deleteSlotMutation.mutateAsync(selectedSlot.id);
                    }}
                  >
              Delete slot
                  </Button>
                </div>
              ) : null}
            </SharedModal>

            <SharedModal
              open={slotCreateOpen}
              onClose={() => setSlotCreateOpen(false)}
              title="New slot"
              size="md"
            >
              <div className="space-y-4 text-sm text-gray-200">
                <div className="text-[11px] text-gray-400">
            Folder: <span className="text-gray-200">{selectedFolder || '(root)'}</span>
                </div>
                <div className="grid gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSlotCreateOpen(false);
                      void handleCreateSlot();
                    }}
                    disabled={!projectId || maxSlotsReached}
                  >
                    <Plus className="mr-2 size-4" />
              Create empty slot
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSlotCreateOpen(false);
                      setDriveImportMode('create');
                      setDriveImportTargetId(null);
                      setDriveImportOpen(true);
                    }}
                    disabled={!projectId || importFromDriveMutation.isPending}
                  >
                    <Folder className="mr-2 size-4" />
              Import from Drive
                  </Button>
                  <FileUploadButton
                    variant="outline"
                    accept="image/*"
                    multiple
                    disabled={!projectId || uploadMutation.isPending}
                    onFilesSelected={async (files: File[]) => {
                      setSlotCreateOpen(false);
                      await uploadMutation.mutateAsync({ files, folder: selectedFolder });
                    }}
                  >
                    <Upload className="mr-2 size-4" />
              Upload images
                  </FileUploadButton>
                </div>
                {maxSlotsReached ? (
                  <div className="text-[11px] text-amber-200">Max 100 slots per project.</div>
                ) : null}
              </div>
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
                          {rule.kind === 'regex' ? (
                            <div className="mt-2 rounded border border-border bg-card/50 p-2 font-mono text-[11px] text-gray-200">
                              {rule.pattern}
                              <span className="text-gray-400">{rule.flags?.trim() ? `/${rule.flags}` : ''}</span>
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
                      setUiSuggestMode(value === 'ai' || value === 'both' ? value : 'heuristic')
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
                      const options = row.heuristic?.options?.length ? row.heuristic.options : row.ai?.options ?? ['auto'];
                      const uniqueOptions = Array.from(new Set(options)).filter(isParamUiControl);
                      const best = row.ai?.confidence && row.heuristic?.confidence
                        ? (row.ai.confidence >= row.heuristic.confidence ? 'ai' : 'heuristic')
                        : row.ai?.confidence
                          ? 'ai'
                          : 'heuristic';
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
                              {best === 'ai' ? 'AI' : 'Heuristic'} · {bestConfidence.toFixed(2)}
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
                              onValueChange={(newValue: string) =>
                                setUiSuggestionRows((prev: UiSuggestionRow[]) =>
                                  prev.map((item: UiSuggestionRow) =>
                                    item.path === row.path
                                      ? { ...item, selected: newValue as ParamUiControl }                                : item
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
                                    item.path === row.path ? { ...item, selected: 'auto' } : item
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


            <div className="relative flex min-h-0 flex-1">
              <div
                className={cn(
                  'grid min-h-0 flex-1 transition-[grid-template-columns] duration-300 ease-in-out',
                  isFocusMode ? 'grid-cols-[0px_1fr_420px] gap-4' : 'grid-cols-[300px_1fr_420px] gap-4'
                )}
              >
                {/* Project + Slots */}
                <SectionPanel
                  className={cn(
                    'order-1 flex min-h-0 flex-1 flex-col overflow-hidden transition-all duration-300 ease-in-out p-0',
                    isFocusMode && 'pointer-events-none opacity-0 -translate-x-2'
                  )}
                  variant="subtle"
                  aria-hidden={isFocusMode}
                >
                  <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-gray-400">Project</Label>
                      <div className="flex items-center gap-2">
                        <Select
                          value={projectId || '__none__'}
                          onValueChange={(value: string) => {
                            hasManualProjectSelectionRef.current = true;
                            setProjectId(value === '__none__' ? '' : value);
                          }}
                        >
                          <SelectTrigger className="h-9 w-full">
                            <SelectValue placeholder={projectsQuery.isLoading ? 'Loading...' : 'Select project'} />
                          </SelectTrigger>
                          <SelectContent>
                            {(projectsQuery.data ?? []).map((id: string) => (
                              <SelectItem key={id} value={id}>
                                {id}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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

                      {selectedFolder ? (
                        <div className="text-[11px] text-gray-400">
                Folder: <span className="text-gray-200">{selectedFolder}</span>
                        </div>
                      ) : null}
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
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setSlotCreateOpen(true)}
                          disabled={!projectId || maxSlotsReached}
                        >
                New Slot
                        </Button>
                        {selectedSlot ? (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              variant={workingSlotId === selectedSlot.id ? 'secondary' : 'outline'}
                              onClick={() => setWorkingSlotId(selectedSlot.id)}
                            >
                              {workingSlotId === selectedSlot.id ? 'Loaded' : 'Load to preview'}
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              title="Edit slot"
                              onClick={() => setSlotInlineEditOpen(true)}
                            >
                              <Settings2 className="size-4" />
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex-1 overflow-hidden">
                      <ImageStudioSlotTreeContext.Provider value={slotTreeContextValue}>
                        <SlotTree key={projectId} />
                      </ImageStudioSlotTreeContext.Provider>
                    </div>
                  </div>
                </SectionPanel>
                {/* Preview */}
                <SectionPanel className="order-2 relative flex min-h-0 flex-1 flex-col overflow-hidden p-0" variant="subtle">
                  <PanelHeader
                    title="Preview"
                    {...(!isFocusMode ? { subtitle: workingSlot?.name || '—' } : {})}
                    actions={(
                      <div className="flex items-center gap-2">
                        {!isFocusMode ? (
                          <div className="text-[11px] text-gray-400">Masks: {maskShapes.length}</div>
                        ) : null}
                        {workingSlot?.asset3dId ? (
                          <div className="flex items-center gap-1 rounded-full border border-border/60 bg-card/60 px-1 py-0.5 text-[11px] text-gray-300">
                            <Button
                              type="button"
                              variant={previewMode === 'image' ? 'secondary' : 'ghost'}
                              size="sm"
                              onClick={() => setPreviewMode('image')}
                            >
                      Image
                            </Button>
                            <Button
                              type="button"
                              variant={previewMode === '3d' ? 'secondary' : 'ghost'}
                              size="sm"
                              onClick={() => setPreviewMode('3d')}
                            >
                      3D
                            </Button>
                          </div>
                        ) : null}
                        {previewMode === '3d' && workingSlot?.asset3dId ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void handleCaptureScreenshot()}
                          >
                            <Camera className="mr-2 size-4" />
                    Screenshot
                          </Button>
                        ) : null}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsFocusMode((prev: boolean) => !prev)}
                        >
                          {isFocusMode ? <Minimize2 className="mr-2 size-4" /> : <Maximize2 className="mr-2 size-4" />}
                          {isFocusMode ? 'Edit' : 'Show'}
                        </Button>
                      </div>
                    )}
                  />
                  <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-[11px] text-gray-400">Mask generator</div>
                      <Select
                        value={maskGenMode}
                        onValueChange={(value: string) => {
                          if (value === 'ai-bbox' || value === 'threshold' || value === 'edges') {
                            setMaskGenMode(value);
                            return;
                          }
                          setMaskGenMode('ai-polygon');
                        }}
                      >
                        <SelectTrigger className="h-8 w-[160px]">
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
                        onClick={() => void handleGenerateMask(maskGenMode)}
                        disabled={maskGenLoading || !workingSlotImageSrc}
                      >
                        {maskGenLoading ? 'Generating...' : 'Generate'}
                      </Button>
                    </div>

                    <div className="relative flex-1">
                      <div className="h-full overflow-hidden">
                        {previewMode === '3d' && workingSlot?.asset3dId ? (
                          <div className="relative h-full w-full overflow-hidden rounded border border-border bg-black/20">
                            <Viewer3D
                              modelUrl={`/api/assets3d/${workingSlot.asset3dId}/file`}
                              allowUserControls
                              captureRef={captureRef}
                              className="h-full w-full"
                            />
                          </div>
                        ) : (
                          <VectorDrawingCanvas
                            src={workingSlotImageSrc ?? ''}
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
                        )}
                      </div>
                      <VectorDrawingToolbar
                        className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2"
                        tool={tool}
                        onSelectTool={setTool}
                        onUndo={() => {
                          if (!activeMaskId) return;
                          setMaskShapes((prev: MaskShape[]) =>
                            prev.map((shape: MaskShape) =>
                              shape.id === activeMaskId
                                ? { ...shape, points: shape.points.slice(0, -1), closed: false }
                                : shape
                            )
                          );
                        }}
                        onClose={() => {
                          if (!activeMaskId) return;
                          setMaskShapes((prev: MaskShape[]) =>
                            prev.map((shape: MaskShape) =>
                              shape.id === activeMaskId ? { ...shape, closed: shape.points.length >= 3 } : shape
                            )
                          );
                        }}
                        onDetach={() => {
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
                        onClear={() => {
                          setMaskShapes([]);
                          setActiveMaskId(null);
                        }}
                        disableUndo={!activeMaskId}
                        disableClose={!activeMaskId}
                        disableDetach={!activeMaskId}
                        disableClear={maskShapes.length === 0}
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
                                    'flex w-full items-center justify-between rounded px-2 py-1 text-left',
                                    shape.id === activeMaskId ? 'bg-muted text-white' : 'text-gray-300 hover:bg-muted/60'
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
                                  value={maskShapes.find((s: MaskShape) => s.id === activeMaskId)?.name ?? ''}
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
                            value={maskPolygons.length === 0 ? '' : safeJsonStringify({ type: 'polygons', polygons: maskPolygons, invert: maskInvert, feather: maskFeather })}
                            readOnly
                            className="h-24 font-mono text-[11px]"
                            placeholder="Draw a polygon mask to populate this."
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                </SectionPanel>

                {/* Prompt + Params */}
                <SectionPanel
                  className={cn(
                    'order-3 flex min-h-0 flex-1 flex-col overflow-hidden transition-all duration-300 ease-in-out p-0'
                  )}
                  variant="subtle"
                >
                  <PanelHeader
                    title=""
                    actions={(
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          title="AI extract"
                          onClick={() => {
                            if (!promptText.trim()) return;
                            setExtractDraftPrompt(promptText);
                            setExtractReviewOpen(true);
                          }}
                          disabled={!promptText.trim()}
                        >
                          <Sparkles className="size-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          title="Auto format"
                          onClick={autoFormatPrompt}
                          disabled={!promptText.trim() || studioSettings.promptExtraction.mode !== 'programmatic'}
                        >
                          <Wand2 className="size-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          title="Suggest UI"
                          onClick={() => void handleSuggestUi()}
                          disabled={!promptText.trim() || !paramsState || uiSuggestLoading}
                        >
                          <Grid3X3 className="size-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          title="Learn patterns"
                          onClick={() => void handleLearnPatterns()}
                          disabled={!promptText.trim() || !canManagePatterns || learnLoading}
                        >
                          <BookOpen className="size-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          title="Extract params"
                          onClick={() => {
                            if (!promptText.trim()) return;
                            setExtractDraftPrompt(promptText);
                            setExtractReviewOpen(true);
                          }}
                          disabled={!promptText.trim()}
                        >
                          <Settings2 className="size-4" />
                        </Button>
                      </div>
                    )}
                  />
                  <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">

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
                  Prompt validation:{' '}
                            <span className="text-gray-200">{promptValidationIssues.length} issue(s)</span>
                          </div>
                          {promptValidationIssues.map((issue: PromptValidationIssue) => {
                            const tone =
                    issue.severity === 'error'
                      ? 'border-red-500/30 bg-red-500/10 text-red-200'
                      : issue.severity === 'warning'
                        ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-200'
                        : 'border-blue-500/30 bg-blue-500/10 text-blue-200';
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
                      Validation:{' '}
                                {validationSummary.errors === 0 && validationSummary.warnings === 0 ? (
                                  <span className="text-emerald-300">OK</span>
                                ) : (
                                  <>
                                    {validationSummary.errors > 0 ? (
                                      <span className="text-red-300">{validationSummary.errors} error(s)</span>
                                    ) : (
                                      <span className="text-gray-400">0 errors</span>
                                    )}
                                    {' • '}
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
                            <ImageStudioParamsContext.Provider value={paramsContextValue}>
                              {paramLeaves.map((leaf: ParamLeaf) => (
                                <ParamRow key={leaf.path} leaf={leaf} />
                              ))}
                            </ImageStudioParamsContext.Provider>
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
                          disabled={runMutation.isPending || !projectId || !workingSlotRunAsset || !(generatedPrompt || promptText).trim()}
                        >
                          {runMutation.isPending ? 'Running...' : 'Run edit'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard
                              .writeText(safeJsonStringify(runPayload))
                              .then(() => toast('Copied payload to clipboard.', { variant: 'success' }))
                              .catch(() => toast('Failed to copy payload.', { variant: 'error' }));
                          }}
                        >
                Copy payload
                        </Button>
                      </div>
                    </div>
                  </div>
                </SectionPanel>

              </div>

            </div>
          </TabsContent>

          <TabsContent value="projects">
            <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
              <SectionPanel variant="subtle" className="p-0">
                <PanelHeader
                  title="Projects"
                  actions={(
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { void projectsQuery.refetch(); }}
                      title="Reload projects"
                    >
                      <RefreshCcw className={cn('mr-2 size-4', projectsQuery.isFetching ? 'animate-spin' : '')} />
                    Refresh
                    </Button>
                  )}
                />
                <div className="space-y-4 p-4">
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
                    {projectsQuery.isLoading ? 'Loading projects...' : `${filteredProjects.length} project(s)`}
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
                            'flex items-center justify-between gap-3 rounded border border-border bg-card/40 p-2',
                            id === projectId && 'border-emerald-500/40 bg-emerald-500/10'
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
                              {pendingDeleteId === id ? 'Deleting...' : 'Delete'}
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </SectionPanel>

              <SectionPanel variant="subtle" className="p-0">
                <PanelHeader title="Active project" />
                <div className="space-y-4 p-4">
                  {projectId ? (
                    <div className="space-y-3 text-sm text-gray-300">
                      <div>
                      Project: <span className="text-gray-100">{projectId}</span>
                      </div>
                      <div className="text-xs text-gray-400">
                      Slots loaded: <span className="text-gray-200">{slots.length}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleTabChange('studio')}>
                        Open Studio
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setProjectId('')}
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
                </div>
              </SectionPanel>
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <div className="space-y-4">
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
      </ClientOnly>
    </div>
  );
}

function ParamRow({ leaf }: { leaf: ParamLeaf }): React.JSX.Element {
  const {
    paramSpecs,
    paramUiOverrides,
    paramFlipMap,
    issuesByPath,
    onParamChange,
    onParamFlip,
    onParamUiControlChange,
  } = useImageStudioParams();
  const spec = paramSpecs?.[leaf.path];
  const uiControl = paramUiOverrides[leaf.path] ?? 'auto';
  const flipped = Boolean(paramFlipMap[leaf.path]);
  const issues = issuesByPath[leaf.path] ?? [];
  const onChange = (value: unknown): void => onParamChange(leaf.path, value);
  const onFlip = (): void => onParamFlip(leaf.path);
  const onUiControlChange = (control: ParamUiControl): void => onParamUiControlChange(leaf.path, control);
  const value = leaf.value;

  const errors = issues.filter((i: ParamIssue) => i.severity === 'error');
  const warnings = issues.filter((i: ParamIssue) => i.severity === 'warning');
  const borderClass =
    errors.length > 0 ? 'border-red-500/60' : warnings.length > 0 ? 'border-yellow-500/50' : 'border-border';

  const isNumber = typeof value === 'number' && Number.isFinite(value);
  const isBool = typeof value === 'boolean';
  const isString = typeof value === 'string';

  const kind: ParamSpec['kind'] = spec?.kind ?? (Array.isArray(value) ? 'json' : isBool ? 'boolean' : isNumber ? 'number' : isString ? 'string' : 'json');

  const uiKind: ParamSpec['kind'] =
    (kind === 'boolean' && !isBool) ||
    (kind === 'number' && !isNumber) ||
    (kind === 'enum' && !isString) ||
    (kind === 'string' && !isString) ||
    (kind === 'rgb' && !Array.isArray(value)) ||
    (kind === 'tuple2' && !Array.isArray(value))
      ? 'json'
      : kind;

  const recommendation = recommendParamUiControl(value, spec ? { ...spec, kind: uiKind } : undefined);
  const selectedUiControl = uiControl;
  const requestedControl = selectedUiControl === 'auto' ? recommendation.recommended : selectedUiControl;
  const autoLabel = `Auto (${paramUiControlLabel(recommendation.recommended)})`;
  const canSlider = recommendation.canSlider;

  return (
    <div className={cn('rounded border bg-card/60 p-2', borderClass)}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-mono text-[11px] text-gray-200">{leaf.path}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-[11px] text-gray-400">
            {Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value}
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            title={flipped ? 'Show value' : 'Edit selector'}
            onClick={onFlip}
          >
            <Repeat2 className="size-4" />
          </Button>
        </div>
      </div>

      {flipped ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="text-[11px] text-gray-400">Selector</div>
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
                    {opt === 'auto' ? autoLabel : paramUiControlLabel(opt)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {spec?.hint ? (
            <div className="text-[11px] text-gray-500">
              Hint: <span className="text-gray-400">{spec.hint}</span>
            </div>
          ) : null}

          {selectedUiControl === 'auto' && recommendation.reason ? (
            <div className="text-[11px] text-gray-500">
              Suggestion: <span className="text-gray-400">{recommendation.reason}</span>
            </div>
          ) : null}

          {errors.length > 0 || warnings.length > 0 ? (
            <div className="space-y-1 text-[11px]">
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
        </div>
      ) : (
        <>
          {requestedControl !== 'json' && uiKind === 'boolean' && isBool ? (
            requestedControl === 'buttons' ? (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={value ? 'secondary' : 'outline'}
                  onClick={() => onChange(true)}
                >
                  true
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={!value ? 'secondary' : 'outline'}
                  onClick={() => onChange(false)}
                >
                  false
                </Button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-200">
                <input type="checkbox" checked={value} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.checked)} />
                <span>{value ? 'true' : 'false'}</span>
              </label>
            )
          ) : null}

          {requestedControl !== 'json' && uiKind === 'enum' && typeof value === 'string' && spec?.enumOptions ? (
            requestedControl === 'buttons' ? (
              <div className="flex flex-wrap gap-2">
                {spec.enumOptions.map((opt: string) => (
                  <Button
                    key={opt}
                    type="button"
                    size="sm"
                    variant={opt === value ? 'secondary' : 'outline'}
                    onClick={() => onChange(opt)}
                  >
                    {opt}
                  </Button>
                ))}
              </div>
            ) : requestedControl === 'text' ? (
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

          {requestedControl !== 'json' && uiKind === 'number' && isNumber ? (
            <div className="space-y-2">
              {requestedControl === 'slider' && canSlider ? (
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

          {requestedControl !== 'json' && uiKind === 'rgb' && Array.isArray(value) ? (
            <div className="grid grid-cols-3 gap-2">
              {['R', 'G', 'B'].map((label: string, index: number) => (
                <div key={label} className="space-y-1">
                  <div className="text-[10px] text-gray-500">{label}</div>
                  <Input
                    type="number"
                    value={String(value[index] ?? '')}
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

          {requestedControl !== 'json' && uiKind === 'tuple2' && Array.isArray(value) ? (
            <div className="grid grid-cols-2 gap-2">
              {['X', 'Y'].map((label: string, index: number) => (
                <div key={label} className="space-y-1">
                  <div className="text-[10px] text-gray-500">{label}</div>
                  <Input
                    type="number"
                    value={String(value[index] ?? '')}
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

          {requestedControl !== 'json' && uiKind === 'string' && isString ? (
            requestedControl === 'textarea' ? (
              <Textarea value={value} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)} className="h-24 font-mono text-[11px]" />
            ) : (
              <Input value={value} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)} className="h-8" />
            )
          ) : null}

          {uiKind === 'json' || requestedControl === 'json' ? (
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
        </>
      )}
    </div>
  );
}
