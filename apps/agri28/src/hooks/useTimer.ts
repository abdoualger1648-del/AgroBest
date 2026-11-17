import { useCallback, useEffect, useState } from 'react';
import {
  SESSION_SECONDS,
  createTimer,
  elapsed,
  isRunning as timerIsRunning,
  remaining,
  toggle as toggleTimer,
  type TimerState,
} from '@/domain/timer';

export interface UseTimer {
  remainingSec: number;
  elapsedSec: number;
  running: boolean;
  finished: boolean;
  toggle: () => void;
}

/**
 * Minuteur de séance. La logique vit dans src/domain/timer.ts (pure et testée) ;
 * ce hook ne fait que la cadencer et la resynchroniser quand l'écran revient.
 */
export function useTimer(durationSec: number = SESSION_SECONDS, autoStart = true): UseTimer {
  const [state, setState] = useState<TimerState>(() => {
    const timer = createTimer(durationSec);
    return autoStart ? { ...timer, runningSince: Date.now() } : timer;
  });
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!timerIsRunning(state)) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [state]);

  // Sur mobile, les minuteurs d'arrière-plan sont ralentis : on resynchronise
  // à la seconde près dès que l'écran redevient visible.
  useEffect(() => {
    const onVisibility = () => setNow(Date.now());
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const toggle = useCallback(() => {
    const instant = Date.now();
    setNow(instant);
    setState((current) => toggleTimer(current, instant));
  }, []);

  return {
    remainingSec: remaining(state, now),
    elapsedSec: elapsed(state, now),
    running: timerIsRunning(state),
    finished: remaining(state, now) === 0,
    toggle,
  };
}
