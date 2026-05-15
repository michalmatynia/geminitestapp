'use client';

import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export type Slots = [string, string, string, string];
export const INITIAL_SLOTS: Slots = ['living', 'bedroom', 'studio', 'amenity'];

interface Ctx { slots: Slots; setSlots: (s: Slots) => void; }
const FloorPlanCtx = createContext<Ctx>({ slots: INITIAL_SLOTS, setSlots: () => {} });

export function useFloorPlanSlots() { return useContext(FloorPlanCtx); }

export function FloorPlanSlotsProvider({ children }: { children: ReactNode }) {
  const [slots, setSlots] = useState<Slots>(INITIAL_SLOTS);
  const value = useMemo(() => ({ slots, setSlots }), [slots]);
  return <FloorPlanCtx.Provider value={value}>{children}</FloorPlanCtx.Provider>;
}
