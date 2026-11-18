import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { notificationSupport, showOpenReminder } from './reminder';

class FakeNotification {
  static permission: NotificationPermission = 'granted';
  static instances: { title: string; options?: NotificationOptions }[] = [];
  constructor(title: string, options?: NotificationOptions) {
    FakeNotification.instances.push({ title, ...(options ? { options } : {}) });
  }
  static requestPermission(): Promise<NotificationPermission> {
    return Promise.resolve(FakeNotification.permission);
  }
}

const base = { enabled: true, doneToday: false, title: 'Agricole DZ 360', body: 'Jour 3' };

describe('rappel à l’ouverture', () => {
  beforeEach(() => {
    FakeNotification.instances = [];
    FakeNotification.permission = 'granted';
    vi.stubGlobal('Notification', FakeNotification);
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('notifie quand la journée n’est pas faite', () => {
    expect(showOpenReminder(base)).toBe(true);
    expect(FakeNotification.instances).toHaveLength(1);
    expect(FakeNotification.instances[0]?.title).toBe('Agricole DZ 360');
  });

  it('ne notifie pas deux fois le même jour', () => {
    const now = Date.now();
    expect(showOpenReminder({ ...base, now })).toBe(true);
    expect(showOpenReminder({ ...base, now: now + 60_000 })).toBe(false);
    expect(FakeNotification.instances).toHaveLength(1);
  });

  it('notifie à nouveau le lendemain', () => {
    const now = Date.now();
    showOpenReminder({ ...base, now });
    expect(showOpenReminder({ ...base, now: now + 36 * 60 * 60 * 1000 })).toBe(true);
  });

  it('se tait si la journée est déjà validée', () => {
    expect(showOpenReminder({ ...base, doneToday: true })).toBe(false);
  });

  it('se tait si le rappel est désactivé', () => {
    expect(showOpenReminder({ ...base, enabled: false })).toBe(false);
  });

  it('se tait si la permission n’est pas accordée', () => {
    FakeNotification.permission = 'denied';
    expect(showOpenReminder(base)).toBe(false);
    expect(notificationSupport()).toBe('denied');
  });

  it('se tait si l’appareil ne connaît pas les notifications', () => {
    vi.unstubAllGlobals();
    vi.stubGlobal('Notification', undefined);
    expect(notificationSupport()).toBe('unsupported');
    expect(showOpenReminder(base)).toBe(false);
  });
});
