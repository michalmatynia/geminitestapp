import type { ResolveFolderTreeIconInput } from './useFolderTreeAppearance';
import type { LucideIcon } from 'lucide-react';


export function resolveFolderTreeIconSet<TName extends string>(
  resolveIcon: (input: ResolveFolderTreeIconInput) => LucideIcon,
  inputs: Record<TName, ResolveFolderTreeIconInput>
): Record<TName, LucideIcon> {
  return Object.fromEntries(
    Object.entries(inputs).map(([name, input]) => [
      name,
      resolveIcon(input as ResolveFolderTreeIconInput),
    ])
  ) as Record<TName, LucideIcon>;
}
