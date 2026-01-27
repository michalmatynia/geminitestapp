"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Checkbox } from "@/shared/ui/checkbox";

type RestoreModalProps = {
  backupName: string;
  onClose: () => void;
  onConfirm: (truncate: boolean) => void;
};

export const RestoreModal = ({
  backupName,
  onClose,
  onConfirm,
}: RestoreModalProps) => {
  const [truncate, setTruncate] = useState(true);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-gray-900 p-6 shadow-lg">
        <h2 className="mb-4 text-xl font-bold">Restore Database</h2>
        <p className="mb-4 text-gray-300">
          Are you sure you want to restore backup <strong>{backupName}</strong>?
        </p>
        <Label className="mb-6 flex cursor-pointer items-center gap-2">
          <Checkbox
            className="size-4 accent-emerald-500"
            checked={truncate}
            onCheckedChange={(checked) => setTruncate(Boolean(checked))}
          />
          <span className="text-sm text-gray-300">
            Truncate (delete) existing data before restore
          </span>
        </Label>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => onConfirm(truncate)}
            className="bg-red-600 hover:bg-red-700"
          >
            Restore
          </Button>
        </div>
      </div>
    </div>
  );
};
