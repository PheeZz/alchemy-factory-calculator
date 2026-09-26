import { useEffect } from 'react';
import type { GameData, GameLocale } from '@/shared/data/types';
import { usePalette } from '@/features/command-palette/model/usePalette';
import { CommandPalette } from '@/features/command-palette/ui/CommandPalette';
import { ItemCard } from '@/features/item-card/ui/ItemCard';
import { FuelTiersPage } from '@/features/fuel-tiers/ui/FuelTiersPage';
import { CalculatorPage } from '@/pages/calculator/CalculatorPage';
import { GameLocaleProvider } from '@/shared/i18n';
import { useViewStore } from '@/shared/lib/view';
import { Header } from './Header';

export function AppShell({ data, locale }: { data: GameData; locale: GameLocale }) {
  const view = useViewStore((s) => s.view);
  // Ctrl+K / ⌘K anywhere, including inside inputs: that is how command palettes are expected to work.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        usePalette.getState().setOpen(true);
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, []);
  return (
    <GameLocaleProvider locale={locale}>
      <div className="flex h-dvh flex-col">
        <Header buildId={data.build.id} />
        {view === 'fuel' ? <FuelTiersPage data={data} /> : <CalculatorPage data={data} />}
      </div>
      <CommandPalette data={data} />
      <ItemCard data={data} />
    </GameLocaleProvider>
  );
}
