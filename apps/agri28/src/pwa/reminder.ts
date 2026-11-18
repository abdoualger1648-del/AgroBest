import { toDayKey } from '@/domain/streak';

/**
 * Rappel à l'ouverture (décision D8).
 *
 * Le web ne garantit aucune notification programmée sans serveur. On se limite
 * donc à ce qui est honnête : si l'utilisateur a autorisé les notifications et
 * que la journée n'est pas validée, on l'avertit à l'ouverture — une seule fois
 * par jour. Le vrai rappel à heure fixe passe par le fichier .ics.
 */

const LAST_NOTIFIED_KEY = 'agri28.lastReminder';

export type NotificationSupport = 'unsupported' | 'default' | 'granted' | 'denied';

/**
 * Certains navigateurs exposent `Notification` sans constructeur utilisable :
 * on vérifie donc le type, pas seulement la présence de la propriété.
 */
function notificationApi(): typeof Notification | null {
  if (typeof window === 'undefined') return null;
  const api = (window as { Notification?: typeof Notification }).Notification;
  return typeof api === 'function' ? api : null;
}

export function notificationSupport(): NotificationSupport {
  const api = notificationApi();
  if (!api) return 'unsupported';
  return api.permission;
}

export async function requestNotificationPermission(): Promise<NotificationSupport> {
  const api = notificationApi();
  if (!api) return 'unsupported';
  return api.requestPermission();
}

function alreadyNotifiedToday(now: number): boolean {
  try {
    return localStorage.getItem(LAST_NOTIFIED_KEY) === toDayKey(now);
  } catch {
    return false;
  }
}

function markNotified(now: number): void {
  try {
    localStorage.setItem(LAST_NOTIFIED_KEY, toDayKey(now));
  } catch {
    /* stockage bloqué : le rappel se répétera, sans conséquence */
  }
}

export interface OpenReminderInput {
  enabled: boolean;
  /** Vrai si la journée en cours est déjà validée. */
  doneToday: boolean;
  title: string;
  body: string;
  now?: number;
}

/**
 * Affiche le rappel si c'est justifié. Renvoie `true` quand une notification
 * a réellement été montrée, pour que l'appelant puisse le tester.
 */
export function showOpenReminder(input: OpenReminderInput): boolean {
  const now = input.now ?? Date.now();
  if (!input.enabled || input.doneToday) return false;
  if (notificationSupport() !== 'granted') return false;
  if (alreadyNotifiedToday(now)) return false;

  const api = notificationApi();
  if (!api) return false;
  try {
    new api(input.title, { body: input.body, tag: 'agri28-daily' });
  } catch {
    return false;
  }
  markNotified(now);
  return true;
}
