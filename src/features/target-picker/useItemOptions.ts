import { useMemo } from 'react';
import type { GameData } from '@/shared/data/types';
import { useNames } from '@/shared/i18n';
import type { ComboOption } from '@/shared/ui/SearchCombobox';

/** "IronIngot" → "iron ingot": the game id doubles as an English search alias. */
const idWords = (id: string) => id.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();

// ponytail: the other language is matched through the game id, not its locale file;
// load both locales here if ids stop resembling English names.
export function useItemOptions(data: GameData): ComboOption[] {
  const name = useNames();
  return useMemo(
    () =>
      Object.values(data.items)
        .map((i) => ({ value: i.id, label: name(i.nameKey), keywords: idWords(i.id), icon: i.icon }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [data, name],
  );
}
