import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';
import { CheckIcon } from './Icon';

interface CopyButtonProps {
  text: string;
  label: string;
  copiedLabel: string;
  /** Appelé après une copie réussie (alimente le carnet de prompts). */
  onCopied?: () => void;
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* permission refusée ou contexte non sécurisé : on tente le repli */
  }

  // Repli pour les navigateurs anciens et les contextes sans presse-papiers.
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

export function CopyButton({ text, label, copiedLabel, onCopied }: CopyButtonProps) {
  const { t } = useTranslation('common');
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <>
      <Button
        block
        onClick={() => {
          void copyToClipboard(text).then((ok) => {
            setCopied(ok);
            setFailed(!ok);
            if (ok) {
              onCopied?.();
              window.setTimeout(() => setCopied(false), 2500);
            }
          });
        }}
      >
        {copied ? <CheckIcon width="20" height="20" /> : null}
        {copied ? copiedLabel : label}
      </Button>
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? copiedLabel : ''}
      </span>
      {failed ? <p className="mt-2 text-sm text-danger">{t('status.error')}</p> : null}
    </>
  );
}
