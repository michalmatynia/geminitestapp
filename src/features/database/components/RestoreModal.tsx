"use client";

import { Button, Label, Checkbox, SharedModal } from "@/shared/ui";
import { useState } from "react";




type RestoreModalProps = {
  backupName: string;
  onClose: () => void;
  onConfirm: (truncate: boolean) => void;
};

export const RestoreModal = ({
  backupName,
  onClose,
  onConfirm,
}: RestoreModalProps): React.JSX.Element => {
  const [truncate, setTruncate] = useState(true);

  return (
    <SharedModal
      open={true}
      onClose={onClose}
      title="Restore Database"
    >
      <div className="w-full max-w-md rounded-lg bg-gray-900 p-6 shadow-lg">
        <h2 className="mb-4 text-xl font-bold">Restore Database</h2>
        <p className="mb-4 text-gray-300">
          Are you sure you want to restore backup <strong>{backupName}</strong>?
        </p>
        <Label className="mb-6 flex cursor-pointer items-center gap-2">
          <Checkbox
            className="size-4 accent-emerald-500"
            checked={truncate}
            onCheckedChange={(checked: boolean | "indeterminate"): void => setTruncate(Boolean(checked))}
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
    </SharedModal>
  );
};
