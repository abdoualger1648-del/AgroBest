import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/Card';
import { CheckIcon } from '@/components/Icon';
import { usePreferences } from '@/store/preferences';
import { SUPPORTED_LANGS, type Lang } from '@/lib/lang';
import { THEME_PREFERENCES, type ThemePreference } from '@/lib/appearance';

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

      <Card as="section" className="mb-4">
        <h2 className="font-semibold">{t('settings:reminder.label')}</h2>
        <p className="mt-1 text-sm text-muted">{t('settings:reminder.help')}</p>
      </Card>

      <Card as="section" className="mb-4">
        <h2 className="font-semibold">{t('settings:data.label')}</h2>
        <p className="mt-1 text-sm text-muted">{t('settings:data.help')}</p>
      </Card>

      <Card as="section">
        <h2 className="font-semibold">{t('settings:about.label')}</h2>
        <p className="mt-1 text-sm text-muted">
          {t('settings:about.version', { version: APP_VERSION })}
        </p>
      </Card>
    </>
  );
}
