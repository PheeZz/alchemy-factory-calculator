import { useT } from '@/shared/i18n';

export function App() {
  const t = useT();
  return <main>{t('app.title')}</main>;
}
