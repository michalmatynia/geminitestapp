import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function removeUndefined<T extends object>(obj: T): T {
  const newObj = { ...obj };
  Object.keys(newObj).forEach((key) => {
    if (newObj[key as keyof T] === undefined) {
      delete newObj[key as keyof T];
    }
  });
  return newObj;
}