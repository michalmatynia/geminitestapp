"use client";

import React from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";

type DatabaseSaveQueryPresetDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newQueryPresetName: string;
  setNewQueryPresetName: React.Dispatch<React.SetStateAction<string>>;
  queryTemplateValue: string;
  onCancel: () => void;
  onSave: () => void;
};

export function DatabaseSaveQueryPresetDialog({
  open,
  onOpenChange,
  newQueryPresetName,
  setNewQueryPresetName,
  queryTemplateValue,
  onCancel,
  onSave,
}: DatabaseSaveQueryPresetDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border border-border bg-card text-white">
        <DialogHeader>
          <DialogTitle className="text-lg">Save Query Preset</DialogTitle>
          <DialogDescription className="text-sm text-gray-400">
            Name this query to reuse it in other database nodes.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-gray-400">Preset name</Label>
            <Input
              className="mt-2 w-full rounded-md border border-border bg-card/70 text-sm text-white"
              value={newQueryPresetName}
              onChange={(event) => setNewQueryPresetName(event.target.value)}
              placeholder="My query preset"
            />
          </div>
          <div>
            <Label className="text-xs text-gray-400">Query preview</Label>
            <Textarea
              readOnly
              className="mt-2 min-h-[120px] w-full rounded-md border border-border bg-card/70 text-xs text-gray-200"
              value={queryTemplateValue}
            />
          </div>
        </div>
        <DialogFooter className="mt-4 gap-2 sm:gap-2">
          <Button
            type="button"
            className="rounded-md border text-xs text-white hover:bg-muted/60"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="rounded-md border border-emerald-500/40 text-xs text-emerald-200 hover:bg-emerald-500/10"
            onClick={onSave}
          >
            Save preset
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
