import { useT } from '@/shared/i18n';
import { Select } from '@/shared/ui/Select';
import { useFactoryStore } from './store';

export function FactorySwitcher({ className }: { className?: string }) {
  const t = useT();
  const factories = useFactoryStore((s) => s.factories);
  const activeId = useFactoryStore((s) => s.activeId);
  const setActive = useFactoryStore((s) => s.setActive);
  return (
    <Select aria-label={t('header.factory')} value={activeId} onChange={(e) => setActive(e.target.value)} className={className}>
      {factories.map((f) => (
        <option key={f.id} value={f.id}>
          {f.name}
        </option>
      ))}
    </Select>
  );
}
