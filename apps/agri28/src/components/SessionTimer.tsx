import { useTranslation } from 'react-i18next';
import { formatDuration } from '@/lib/format';
import type { UseTimer } from '@/hooks/useTimer';

interface SessionTimerProps {
  timer: UseTimer;
  totalSec: number;
}

/** Minuteur visible pendant toute la séance (15 minutes). */
export function SessionTimer({ timer, totalSec }: SessionTimerProps) {
  const { t } = useTranslation('day');
  const time = formatDuration(timer.remainingSec);
  const ratio = totalSec === 0 ? 0 : Math.min(1, timer.elapsedSec / totalSec);

  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={totalSec}
          aria-valuenow={timer.elapsedSec}
          aria-label={t('timer.label')}
        >
          <div
            className={`h-full rounded-full transition-[width] ${timer.finished ? 'bg-warning' : 'bg-primary'}`}
            style={{ inlineSize: `${ratio * 100}%` }}
          />
        </div>
      </div>
      <p className="font-semibold tabular-nums">
        <span className="sr-only">{t('timer.aria', { time })}</span>
        <span aria-hidden="true">{time}</span>
      </p>
      <button
        type="button"
        onClick={timer.toggle}
        className="min-h-11 rounded-xl px-3 text-sm font-semibold text-primary hover:bg-surface-2"
      >
        {timer.running ? t('timer.pause') : t('timer.resume')}
      </button>
    </div>
  );
}
