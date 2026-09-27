import type { Stack } from '@/shared/data/types';

/** id → display name (the UI passes its locale lookup). */
export type NameOf = (id: string) => string;

/** Up to 3 decimals, no float noise, no trailing zeros. */
export const formatQty = (n: number) => String(Number(n.toFixed(3)));

export const stacksText = (stacks: Stack[], names: NameOf) => stacks.map((s) => `${formatQty(s.qty)} ${names(s.item)}`).join('; ');
