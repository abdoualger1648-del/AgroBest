import { useRegisterSW } from 'virtual:pwa-register/react';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';

/**
 * Mise à jour « sur demande » : jamais de remplacement silencieux pendant
 * qu'une leçon est en cours. L'utilisateur décide du moment.
 */
export function UpdateToast() {
  const { t } = useTranslation('common');
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed start-4 end-4 bottom-20 z-20 mx-auto max-w-screen-sm rounded-2xl border border-border bg-surface p-4 shadow-lg"
    >
      <p className="font-semibold">{t('update.title')}</p>
      <p className="mt-1 text-sm text-muted">{t('update.body')}</p>
      <div className="mt-3 flex gap-2">
        <Button
          onClick={() => {
            void updateServiceWorker(true);
          }}
        >
          {t('update.reload')}
        </Button>
        <Button variant="ghost" onClick={() => setNeedRefresh(false)}>
          {t('update.later')}
        </Button>
      </div>
    </div>
  );
}
