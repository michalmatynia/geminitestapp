"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";

import { Input } from "./input";
import { Button, type ButtonProps } from "./button";

export type FileUploadButtonProps = Omit<ButtonProps, "type" | "onClick"> & {
  accept?: string;
  multiple?: boolean;
  onFilesSelected: (files: File[]) => void | Promise<void>;
  onError?: (error: unknown) => void;
};

export function FileUploadButton({
  accept,
  multiple,
  onFilesSelected,
  onError,
  children,
  ...buttonProps
}: FileUploadButtonProps): React.JSX.Element {
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const list = event.target.files;
    event.target.value = "";
    if (!list || list.length === 0) return;
    const files = Array.from(list);

    try {
      await onFilesSelected(files);
    } catch (error) {
      if (onError) {
        onError(error);
      } else {
        console.error("FileUploadButton: upload failed", error);
      }
    }
  };

  return (
    <>
      <Input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        disabled={buttonProps.disabled}
        onChange={(e) => {
          void handleChange(e);
        }}
      />
      <Button
        type="button"
        {...buttonProps}
        onClick={() => inputRef.current?.click()}
      >
        {children}
      </Button>
    </>
  );
}

export type FileUploadTriggerProps = {
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  asChild?: boolean;
  className?: string;
  onFilesSelected: (files: File[]) => void | Promise<void>;
  onError?: (error: unknown) => void;
  children: React.ReactNode;
};

export function FileUploadTrigger({
  accept,
  multiple,
  disabled,
  asChild,
  className,
  onFilesSelected,
  onError,
  children,
}: FileUploadTriggerProps): React.JSX.Element {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const Comp = asChild ? Slot : "span";

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const list = event.target.files;
    event.target.value = "";
    if (!list || list.length === 0) return;
    const files = Array.from(list);

    try {
      await onFilesSelected(files);
    } catch (error) {
      if (onError) {
        onError(error);
      } else {
        console.error("FileUploadTrigger: upload failed", error);
      }
    }
  };

  return (
    <>
      <Input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          void handleChange(e);
        }}
      />
      <Comp
        className={className}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        onClick={() => {
          if (!disabled) inputRef.current?.click();
        }}
        onKeyDown={(event: React.KeyboardEvent): void => {
          if (disabled) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
      >
        {children}
      </Comp>
    </>
  );
}
