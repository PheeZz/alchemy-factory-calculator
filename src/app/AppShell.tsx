import { useEffect } from 'react';
import type { GameData, GameLocale } from '@/shared/data/types';
import { usePalette } from '@/features/command-palette/model/usePalette';
import { redo, undo } from '@/features/factory/history';
import { CommandPalette } from '@/features/command-palette/ui/CommandPalette';
import { ItemCard } from '@/features/item-card/ui/ItemCard';
import { ComparePage } from '@/features/compare/ui/ComparePage';
import { FuelTiersPage } from '@/features/fuel-tiers/ui/FuelTiersPage';
import { NetworkPage } from '@/features/network/ui/NetworkPage';
import { ProfitPage } from '@/features/profit-tiers/ui/ProfitPage';
import { TechPage } from '@/features/tech/ui/TechPage';
import { CalculatorPage } from '@/pages/calculator/CalculatorPage';
import { GameLocaleProvider } from '@/shared/i18n';
import { useViewStore } from '@/shared/lib/view';
import { Header } from './Header';

export function AppShell({ data, locale }: { data: GameData; locale: GameLocale }) {
  const view = useViewStore((s) => s.view);
  // Ctrl+K / ⌘K anywhere, including inside inputs (palette convention); Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y outside inputs.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const key = e.key.toLowerCase();
      if (key === 'k') {
        e.preventDefault();
        usePalette.getState().setOpen(true);
        return;
      }
      // Inside a text field the browser's own undo wins (typing correction), not the plan history.
      const el = e.target;
      if (el instanceof Element && el.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((key === 'z' && e.shiftKey) || key === 'y') {
        e.preventDefault();
        redo();
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, []);
  return (
    <GameLocaleProvider locale={locale}>
      <div className="flex h-dvh flex-col">
        <Header build={data.build} />
        {view === 'fuel' ? (
          <FuelTiersPage data={data} />
        ) : view === 'profit' ? (
          <ProfitPage data={data} />
        ) : view === 'tech' ? (
          <TechPage data={data} />
        ) : view === 'network' ? (
          <NetworkPage data={data} />
        ) : view === 'compare' ? (
          <ComparePage data={data} />
        ) : (
          <CalculatorPage data={data} />
        )}
      </div>
      <CommandPalette data={data} />
      <ItemCard data={data} />
    </GameLocaleProvider>
  );
}
