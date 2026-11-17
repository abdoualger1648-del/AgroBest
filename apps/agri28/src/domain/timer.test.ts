import { describe, expect, it } from 'vitest';
import {
  SESSION_SECONDS,
  createTimer,
  elapsed,
  isFinished,
  isRunning,
  pause,
  progressRatio,
  remaining,
  reset,
  restore,
  start,
  toggle,
} from './timer';

const T0 = 1_700_000_000_000;

describe('minuteur de 15 minutes', () => {
  it('démarre à 15:00, à l’arrêt', () => {
    const timer = createTimer();
    expect(timer.durationSec).toBe(SESSION_SECONDS);
    expect(remaining(timer, T0)).toBe(900);
    expect(isRunning(timer)).toBe(false);
  });

  it('décompte pendant qu’il tourne', () => {
    const timer = start(createTimer(), T0);
    expect(isRunning(timer)).toBe(true);
    expect(elapsed(timer, T0 + 60_000)).toBe(60);
    expect(remaining(timer, T0 + 60_000)).toBe(840);
  });

  it('gèle le temps en pause et repart où il s’était arrêté', () => {
    const running = start(createTimer(), T0);
    const paused = pause(running, T0 + 120_000);
    expect(elapsed(paused, T0 + 600_000)).toBe(120);

    const resumed = start(paused, T0 + 600_000);
    expect(elapsed(resumed, T0 + 630_000)).toBe(150);
  });

  it('bascule entre marche et pause', () => {
    const timer = toggle(createTimer(), T0);
    expect(isRunning(timer)).toBe(true);
    expect(isRunning(toggle(timer, T0 + 1000))).toBe(false);
  });

  it('ne descend jamais sous zéro et se déclare terminé', () => {
    const timer = start(createTimer(60), T0);
    expect(remaining(timer, T0 + 120_000)).toBe(0);
    expect(isFinished(timer, T0 + 120_000)).toBe(true);
    expect(progressRatio(timer, T0 + 120_000)).toBe(1);
  });

  it('se remet à zéro', () => {
    const timer = reset(start(createTimer(), T0));
    expect(elapsed(timer, T0 + 60_000)).toBe(0);
    expect(isRunning(timer)).toBe(false);
  });

  it('ne compte pas le temps passé application fermée', () => {
    const running = start(createTimer(), T0);
    // L'utilisateur ferme l'application pendant une heure puis revient.
    const restored = restore(running, T0 + 30_000);
    expect(elapsed(restored, T0 + 3_600_000)).toBe(30);
    expect(isRunning(restored)).toBe(false);
  });

  it('ignore une horloge qui recule', () => {
    const timer = start(createTimer(), T0);
    expect(elapsed(timer, T0 - 60_000)).toBe(0);
  });
});
