import { useEffect } from 'react';
import { MotionConfig } from 'motion/react';
import { useLangStore } from '@/shared/i18n';
import { ParticlesBackground } from '@/shared/ui/ParticlesBackground';
import { ToastViewport } from '@/shared/ui/Toast';
import { AppShell } from './AppShell';
import { bootstrap } from './bootstrap';
import { LoadErrorScreen, LoadingScreen } from './StatusScreens';
import { useGameData } from './useGameData';
import { useShareLinks } from './useShareLinks';

export function App() {
  const lang = useLangStore((s) => s.lang);
  useShareLinks();
  const game = useGameData(lang, bootstrap);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <MotionConfig reducedMotion="user">
      <ParticlesBackground />
      {game.status === 'ready' ? (
        <AppShell data={game.data} locale={game.locale} />
      ) : game.status === 'error' ? (
        <LoadErrorScreen error={game.error} onRetry={game.retry} />
      ) : (
        <LoadingScreen />
      )}
      <ToastViewport />
    </MotionConfig>
  );
}
