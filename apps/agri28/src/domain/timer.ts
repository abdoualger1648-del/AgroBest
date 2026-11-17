export const SESSION_SECONDS = 15 * 60;

export interface TimerState {
  /** Durée visée, en secondes. */
  durationSec: number;
  /** Secondes déjà écoulées, hors période en cours. */
  elapsedSec: number;
  /** Instant de démarrage de la période en cours, ou null si en pause. */
  runningSince: number | null;
}

export function createTimer(durationSec: number = SESSION_SECONDS): TimerState {
  return { durationSec, elapsedSec: 0, runningSince: null };
}

export function isRunning(state: TimerState): boolean {
  return state.runningSince !== null;
}

export function start(state: TimerState, now: number): TimerState {
  if (state.runningSince !== null) return state;
  return { ...state, runningSince: now };
}

export function pause(state: TimerState, now: number): TimerState {
  if (state.runningSince === null) return state;
  return {
    ...state,
    elapsedSec: elapsed(state, now),
    runningSince: null,
  };
}

export function toggle(state: TimerState, now: number): TimerState {
  return isRunning(state) ? pause(state, now) : start(state, now);
}

export function reset(state: TimerState): TimerState {
  return { ...state, elapsedSec: 0, runningSince: null };
}

/** Secondes écoulées, période en cours comprise. */
export function elapsed(state: TimerState, now: number): number {
  if (state.runningSince === null) return state.elapsedSec;
  return state.elapsedSec + Math.max(0, Math.floor((now - state.runningSince) / 1000));
}

/** Secondes restantes, jamais négatives. */
export function remaining(state: TimerState, now: number): number {
  return Math.max(0, state.durationSec - elapsed(state, now));
}

export function isFinished(state: TimerState, now: number): boolean {
  return remaining(state, now) === 0;
}

export function progressRatio(state: TimerState, now: number): number {
  if (state.durationSec === 0) return 1;
  return Math.min(1, elapsed(state, now) / state.durationSec);
}

/**
 * Reprise après fermeture de l'application : le temps passé hors de l'écran
 * ne compte pas. On repart en pause, avec le temps déjà accumulé.
 */
export function restore(state: TimerState, now: number): TimerState {
  return pause(state, now);
}
