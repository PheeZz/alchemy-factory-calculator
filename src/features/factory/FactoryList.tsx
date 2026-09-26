import { useState } from 'react';
import { useT } from '@/shared/i18n';
import { cx } from '@/shared/lib/cx';
import { IconButton } from '@/shared/ui/Button';
import { FIELD } from '@/shared/ui/NumberInput';
import { Panel } from '@/shared/ui/Panel';
import { toast } from '@/shared/ui/Toast';
import { useFactoryStore, type Factory } from './store';

function RenameField({ factory, onDone }: { factory: Factory; onDone: () => void }) {
  const t = useT();
  const rename = useFactoryStore((s) => s.renameFactory);
  const [name, setName] = useState(factory.name);
  const commit = () => {
    if (name.trim()) rename(factory.id, name.trim());
    onDone();
  };
  return (
    <input
      autoFocus
      aria-label={t('factory.nameLabel')}
      value={name}
      onChange={(e) => setName(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') onDone();
      }}
      className={cx(FIELD, 'h-9')}
    />
  );
}

export function FactoryList() {
  const t = useT();
  const { factories, activeId, setActive, createFactory, duplicateFactory, deleteFactory } = useFactoryStore();
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <Panel
      title={t('factory.list')}
      actions={<IconButton icon="plus" size="sm" label={t('factory.new')} onClick={() => createFactory()} />}
    >
      <ul className="flex flex-col gap-1">
        {factories.map((f) => {
          const active = f.id === activeId;
          return (
            <li key={f.id} className={cx('group flex items-center gap-1 rounded-xl pr-1', active && 'bg-arcane/12')}>
              {editing === f.id ? (
                <RenameField factory={f} onDone={() => setEditing(null)} />
              ) : (
                <button
                  type="button"
                  aria-current={active || undefined}
                  onClick={() => setActive(f.id)}
                  onDoubleClick={() => setEditing(f.id)}
                  className={cx(
                    'flex h-9 min-w-0 flex-1 items-center gap-2 rounded-xl px-3 text-left text-sm',
                    active ? 'text-ink' : 'text-muted hover:text-ink',
                  )}
                >
                  <span className={cx('size-1.5 shrink-0 rounded-full', active ? 'bg-arcane shadow-[0_0_8px_var(--color-arcane)]' : 'bg-white/20')} />
                  <span className="truncate">{f.name}</span>
                </button>
              )}
              {active && editing !== f.id && (
                <span className="flex">
                  <IconButton icon="pencil" size="sm" label={t('factory.rename')} className="border-transparent bg-transparent" onClick={() => setEditing(f.id)} />
                  <IconButton icon="copy" size="sm" label={t('factory.duplicate')} className="border-transparent bg-transparent" onClick={() => duplicateFactory(f.id)} />
                  <IconButton
                    icon="trash"
                    size="sm"
                    variant="danger"
                    label={t('factory.delete')}
                    className="border-transparent"
                    onClick={() => {
                      deleteFactory(f.id);
                      toast(t('factory.deleted', { name: f.name }));
                    }}
                  />
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
