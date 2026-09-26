import { useMemo, useRef, useState } from 'react';
import type { GameData } from '@/shared/data/types';
import { useT } from '@/shared/i18n';
import { cx } from '@/shared/lib/cx';
import { Button, IconButton } from '@/shared/ui/Button';
import { FIELD } from '@/shared/ui/NumberInput';
import { Panel } from '@/shared/ui/Panel';
import { GlowBadge } from '@/shared/ui/GlowBadge';
import { Icon } from '@/shared/ui/Icon';
import { toast } from '@/shared/ui/Toast';
import { Tooltip } from '@/shared/ui/Tooltip';
import { downloadExport, importFile } from './io';
import { sanitizePlan } from './stale';
import { useActiveFactory, useFactoryStore, type Factory } from './store';

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

/** Ids from an older build or a hand-edited file: they are skipped in the solve, listed here. */
function StaleIds({ data }: { data: GameData }) {
  const t = useT();
  const plan = useActiveFactory().plan;
  const unknown = useMemo(() => sanitizePlan(data, plan).unknown, [data, plan]);
  if (unknown.length === 0) return null;
  return (
    <Tooltip content={unknown.join(', ')}>
      <button type="button" className="mt-2 rounded-full">
        <GlowBadge tone="ember">
          <Icon name="alert" size={12} />
          {t('factory.staleIds', { n: unknown.length })}
        </GlowBadge>
      </button>
    </Tooltip>
  );
}

function BackupActions({ data }: { data: GameData }) {
  const t = useT();
  const input = useRef<HTMLInputElement>(null);
  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const res = importFile(await file.text());
    toast(res.ok ? t('io.imported', { n: res.factories.length }) : t(`io.error.${res.error}`), res.ok ? 'info' : 'error');
  };
  return (
    <div className="mt-3 flex gap-2 border-t border-line pt-3">
      <Button size="sm" icon="download" onClick={() => downloadExport(data.build.id)}>
        {t('io.export')}
      </Button>
      <Button size="sm" icon="upload" onClick={() => input.current?.click()}>
        {t('io.import')}
      </Button>
      <input
        ref={input}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          void onFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </div>
  );
}

export function FactoryList({ data }: { data: GameData }) {
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
      <StaleIds data={data} />
      <BackupActions data={data} />
    </Panel>
  );
}
