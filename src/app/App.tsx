import { useEffect } from 'react';
import { MotionConfig } from 'motion/react';
import { useFactoryStore } from '@/features/factory/store';
import { demoGameData, demoLocales } from '@/features/graph/fixtures/demo-gamedata';
import { demoPlanPatch, demoResult } from '@/features/graph/fixtures/demo-result';
import { CalculatorPage } from '@/pages/calculator/CalculatorPage';
import { useLangStore } from '@/shared/i18n';
import { ParticlesBackground } from '@/shared/ui/ParticlesBackground';
import { ToastViewport } from '@/shared/ui/Toast';

// ponytail: fixture wiring until integration (Task 4) swaps in loaded data + live solver.
// `?error` previews the solver error state.
function useDemoSeed() {
  useEffect(() => {
    const s = useFactoryStore.getState();
    const plan = s.factories.find((f) => f.id === s.activeId)?.plan;
    if (!plan || plan.targets.length > 0) return;
    demoPlanPatch.targets.forEach(s.addTarget);
    demoPlanPatch.imports.forEach((i) => !plan.imports.includes(i) && s.toggleImport(i));
    s.setFuel(demoPlanPatch.fuel);
    s.setFertilizer(demoPlanPatch.fertilizer);
  }, []);
}

const demoError = new URLSearchParams(location.search).has('error');

export function App() {
  const lang = useLangStore((s) => s.lang);
  useDemoSeed();
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <MotionConfig reducedMotion="user">
      <ParticlesBackground />
      <CalculatorPage
        data={demoGameData}
        locale={demoLocales[lang]}
        result={demoResult}
        status={demoError ? 'error' : 'idle'}
        error={demoError ? { code: 'unreachable', item: 'Salt' } : undefined}
      />
      <ToastViewport />
    </MotionConfig>
  );
}
