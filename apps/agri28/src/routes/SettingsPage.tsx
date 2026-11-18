import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { CheckIcon } from '@/components/Icon';
import { inputClass } from '@/components/Field';
import { usePreferences } from '@/store/preferences';
import { useCourse } from '@/store/course';
import { SUPPORTED_LANGS, type Lang } from '@/lib/lang';
import { THEME_PREFERENCES, type ThemePreference } from '@/lib/appearance';
import { formatDate } from '@/lib/format';
import { reminderIcsBlob } from '@/export/calendar';
import { downloadBlob, safeFilename } from '@/export/download';
import {
  backupBlob,
  eraseEverything,
  exportBackup,
  InvalidBackupError,
  readBackupFile,
  restoreBackup,
  summarizeBackup,
  type BackupFile,
  type BackupSummary,
} from '@/db/backup';
import {
  notificationSupport,
  requestNotificationPermission,
  type NotificationSupport,
} from '@/pwa/reminder';

const APP_VERSION = '0.1.0';

interface OptionRowProps {
  label: string;
  selected: boolean;
  onSelect: () => void;
  name: string;
}

function OptionRow({ label, selected, onSelect, name }: OptionRowProps) {
  return (
    <label className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 hover:bg-surface-2">
      <span className="flex items-center gap-3">
        <input
          type="radio"
          name={name}
          checked={selected}
          onChange={onSelect}
          className="size-5 accent-[var(--c-primary)]"
        />
        <span className="font-medium">{label}</span>
      </span>
      {selected ? <CheckIcon className="text-primary" width="20" height="20" /> : null}
    </label>
  );
}

function ReminderSection() {
  const { t } = useTranslation('settings');
  const { reminderEnabled, reminderTime, setReminder } = usePreferences();
  const [permission, setPermission] = useState<NotificationSupport>(() => notificationSupport());

  const time = reminderTime ?? '07:00';

  return (
    <Card as="section" className="mb-4">
      <h2 className="font-semibold">{t('reminder.label')}</h2>
      <p className="mt-1 text-sm text-muted">{t('reminder.help')}</p>

      <label className="mt-3 flex min-h-12 items-center gap-3">
        <input
          type="checkbox"
          checked={reminderEnabled}
          onChange={(event) => void setReminder(event.target.checked, time)}
          className="size-5 accent-[var(--c-primary)]"
        />
        <span className="font-medium">{t('reminder.notify')}</span>
      </label>

      <label htmlFor="reminder-time" className="mt-3 mb-1 block font-medium">
        {t('reminder.time')}
      </label>
      <input
        id="reminder-time"
        type="time"
        className={inputClass}
        value={time}
        onChange={(event) => void setReminder(reminderEnabled, event.target.value)}
      />

      <Button
        variant="secondary"
        block
        className="mt-3"
        onClick={() =>
          downloadBlob(
            reminderIcsBlob({
              time,
              summary: t('reminder.summary'),
              description: t('reminder.description'),
            }),
            safeFilename(t('reminder.summary'), 'ics'),
          )
        }
      >
        {t('reminder.ics')}
      </Button>
      <p className="mt-1 text-sm text-muted">{t('reminder.icsHelp')}</p>

      {permission === 'unsupported' ? (
        <p className="mt-3 text-sm text-muted">{t('reminder.notifyUnsupported')}</p>
      ) : permission === 'granted' ? (
        <p className="mt-3 text-sm text-muted">
          {t('reminder.notifyGranted')} {t('reminder.notifyHelp')}
        </p>
      ) : permission === 'denied' ? (
        <p className="mt-3 text-sm text-muted">{t('reminder.notifyDenied')}</p>
      ) : (
        <Button
          variant="ghost"
          block
          className="mt-3"
          onClick={() => {
            void requestNotificationPermission().then(setPermission);
          }}
        >
          {t('reminder.notify')}
        </Button>
      )}
    </Card>
  );
}

function DataSection() {
  const { t } = useTranslation(['settings', 'common']);
  const lang = usePreferences((state) => state.lang);
  const hydrate = usePreferences((state) => state.hydrate);
  const load = useCourse((state) => state.load);
  const [pending, setPending] = useState<{ file: BackupFile; summary: BackupSummary } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function onExport() {
    const backup = await exportBackup();
    downloadBlob(
      backupBlob(backup),
      safeFilename(`agricole-dz-360-${backup.exportedAt.slice(0, 10)}`, 'json'),
    );
  }

  async function onFile(file: File) {
    setError(null);
    setMessage(null);
    try {
      const backup = await readBackupFile(file);
      setPending({ file: backup, summary: summarizeBackup(backup) });
    } catch (caught) {
      setPending(null);
      setError(
        caught instanceof InvalidBackupError
          ? t('settings:data.importError')
          : t('common:status.error'),
      );
    }
  }

  async function confirmRestore() {
    if (!pending) return;
    await restoreBackup(pending.file);
    await hydrate();
    await load();
    setPending(null);
    setMessage(t('settings:data.importDone'));
  }

  async function confirmReset() {
    await eraseEverything();
    await hydrate();
    await load();
    setConfirmingReset(false);
    setMessage(t('settings:data.resetDone'));
  }

  return (
    <Card as="section" className="mb-4">
      <h2 className="font-semibold">{t('settings:data.label')}</h2>
      <p className="mt-1 text-sm text-muted">{t('settings:data.help')}</p>

      <Button variant="secondary" block className="mt-3" onClick={() => void onExport()}>
        {t('settings:data.export')}
      </Button>

      <Button variant="secondary" block className="mt-2" onClick={() => fileInput.current?.click()}>
        {t('settings:data.import')}
      </Button>
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        aria-label={t('settings:data.import')}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void onFile(file);
          event.target.value = '';
        }}
      />

      {pending ? (
        <div className="mt-3 rounded-xl border border-warning/50 bg-warning/10 p-3">
          <p className="text-sm">
            {pending.summary.projectName ?? '—'} ·{' '}
            {formatDate(new Date(pending.summary.exportedAt), lang)} · {pending.summary.daysDone} ·{' '}
            {pending.summary.dossierItems} · {pending.summary.prompts}
          </p>
          <div className="mt-2 flex gap-2">
            <Button onClick={() => void confirmRestore()}>{t('common:actions.confirm')}</Button>
            <Button variant="ghost" onClick={() => setPending(null)}>
              {t('common:actions.cancel')}
            </Button>
          </div>
        </div>
      ) : null}

      {confirmingReset ? (
        <div className="mt-3 rounded-xl border border-danger/50 bg-danger/10 p-3">
          <p className="mb-2 text-sm">{t('settings:data.resetConfirm')}</p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => void confirmReset()}>
              {t('common:actions.confirm')}
            </Button>
            <Button variant="ghost" onClick={() => setConfirmingReset(false)}>
              {t('common:actions.cancel')}
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="ghost" block className="mt-2" onClick={() => setConfirmingReset(true)}>
          {t('settings:data.reset')}
        </Button>
      )}

      {message ? (
        <p role="status" className="mt-2 text-sm text-success">
          {message}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </Card>
  );
}

export function SettingsPage() {
  const { t } = useTranslation(['settings', 'common']);
  const { lang, theme, setLang, setTheme } = usePreferences();

  return (
    <>
      <PageHeader title={t('settings:title')} description={t('settings:subtitle')} />

      <Card as="section" className="mb-4">
        <h2 className="font-semibold">{t('settings:language.label')}</h2>
        <div className="mt-2 flex flex-col">
          {SUPPORTED_LANGS.map((code: Lang) => (
            <OptionRow
              key={code}
              name="lang"
              label={t(`common:languages.${code}`)}
              selected={lang === code}
              onSelect={() => {
                void setLang(code);
              }}
            />
          ))}
        </div>
        <p className="mt-2 text-sm text-muted">{t('settings:language.help')}</p>
      </Card>

      <Card as="section" className="mb-4">
        <h2 className="font-semibold">{t('settings:theme.label')}</h2>
        <div className="mt-2 flex flex-col">
          {THEME_PREFERENCES.map((option: ThemePreference) => (
            <OptionRow
              key={option}
              name="theme"
              label={t(`settings:theme.${option}`)}
              selected={theme === option}
              onSelect={() => {
                void setTheme(option);
              }}
            />
          ))}
        </div>
      </Card>

      <ReminderSection />
      <DataSection />

      <Card as="section">
        <h2 className="font-semibold">{t('settings:about.label')}</h2>
        <p className="mt-1 text-sm text-muted">
          {t('settings:about.version', { version: APP_VERSION })}
        </p>
      </Card>
    </>
  );
}
