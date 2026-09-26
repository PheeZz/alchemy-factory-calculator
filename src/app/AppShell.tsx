import type { GameData, GameLocale } from '@/shared/data/types';
import { FuelTiersPage } from '@/features/fuel-tiers/ui/FuelTiersPage';
import { CalculatorPage } from '@/pages/calculator/CalculatorPage';
import { GameLocaleProvider } from '@/shared/i18n';
import { useViewStore } from '@/shared/lib/view';
import { Header } from './Header';

export function AppShell({ data, locale }: { data: GameData; locale: GameLocale }) {
  const view = useViewStore((s) => s.view);
  return (
    <GameLocaleProvider locale={locale}>
      <div className="flex h-dvh flex-col">
        <Header buildId={data.build.id} />
        {view === 'fuel' ? <FuelTiersPage data={data} /> : <CalculatorPage data={data} />}
      </div>
    </GameLocaleProvider>
  );
}
