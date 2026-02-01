"use client";

import { Button } from "@/shared/ui";
import { Box, Eye, Edit2, Trash2, Loader2, Globe, Lock } from "lucide-react";
import type { Asset3DRecord } from "../types";
import { cn } from "@/shared/utils";

export interface Asset3DCardProps {
  asset: Asset3DRecord;
  onPreview: (asset: Asset3DRecord) => void;
  onEdit: (asset: Asset3DRecord) => void;
  onDelete: (asset: Asset3DRecord) => void;
  isDeleting?: boolean;
  className?: string;
}

export function Asset3DCard({
  asset,
  onPreview,
  onEdit,
  onDelete,
  isDeleting = false,
  className,
}: Asset3DCardProps): React.JSX.Element {
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${((bytes / 1024)).toFixed(1)} KB`;
    return `${((bytes / 1024 / 1024)).toFixed(2)} MB`;
  };

  const formatDate = (date: Date | string): string => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const displayName = asset.name || asset.filename.replace(/^\d+-/, "");

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card/60 overflow-hidden transition-colors group hover:border-blue-500/60",
        className
      )}
    >
      {/* Preview Area */}
      <div
        className="h-40 bg-muted/30 flex items-center justify-center cursor-pointer relative"
        onClick={(): void => onPreview(asset)}
      >
        <div className="flex flex-col items-center gap-2 text-muted-foreground group-hover:text-blue-400 transition-colors">
          <Box className="h-12 w-12" />
          <span className="text-xs flex items-center gap-1">
            <Eye className="h-3 w-3" />
            Click to preview
          </span>
        </div>

        {/* Visibility Badge */}
        <div
          className={cn(
            "absolute top-2 right-2 px-2 py-1 rounded text-xs flex items-center gap-1",
            asset.isPublic
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-muted text-muted-foreground"
          )}
        >
          {asset.isPublic ? (
            <>
              <Globe className="h-3 w-3" />
              Public
            </>
          ) : (
            <>
              <Lock className="h-3 w-3" />
              Private
            </>
          )}
        </div>

        {/* Category Badge */}
        {asset.category && (
          <div className="absolute top-2 left-2 px-2 py-1 rounded text-xs bg-blue-500/10 text-blue-300">
            {asset.category}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p
              className="text-sm font-medium text-foreground truncate"
              title={displayName}
            >
              {displayName}
            </p>
            {asset.description && (
              <p
                className="text-xs text-muted-foreground truncate mt-0.5"
                title={asset.description}
              >
                {asset.description}
              </p>
            )}
          </div>
        </div>

        {/* Tags */}
        {asset.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {asset.tags.slice(0, 3).map((tag: string) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 text-xs bg-muted text-muted-foreground rounded"
              >
                {tag}
              </span>
            ))}
            {asset.tags.length > 3 && (
              <span className="px-1.5 py-0.5 text-xs bg-muted text-muted-foreground rounded">
                +{asset.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Meta & Actions */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
          <div className="text-xs text-muted-foreground">
            <span>{formatFileSize(asset.size)}</span>
            <span className="mx-1">•</span>
            <span>{formatDate(asset.createdAt)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-blue-400"
              onClick={(e: React.MouseEvent): void => {
                e.stopPropagation();
                onEdit(asset);
              }}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-red-400"
              onClick={(e: React.MouseEvent): void => {
                e.stopPropagation();
                onDelete(asset);
              }}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
