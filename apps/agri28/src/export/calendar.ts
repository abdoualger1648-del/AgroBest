/**
 * Rappel quotidien par fichier .ics (décision D8).
 *
 * Le web ne garantit aucune notification programmée sans serveur : un
 * événement récurrent déposé dans l'agenda du téléphone, lui, sonne même
 * application fermée, sans connexion et sans compte.
 */

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Horodatage UTC au format iCalendar : 20261118T073000Z */
export function toIcsUtc(date: Date): string {
  return (
    `${String(date.getUTCFullYear())}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

/** Échappement iCalendar : virgules, points-virgules, barres obliques, retours à la ligne. */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

export interface ReminderOptions {
  /** Heure locale « HH:mm ». */
  time: string;
  summary: string;
  description: string;
  /** Pour des tests déterministes. */
  now?: Date;
  uid?: string;
}

/** Événement quotidien récurrent, à 15 minutes, avec une alarme à l'heure dite. */
export function buildReminderIcs(options: ReminderOptions): string {
  const now = options.now ?? new Date();
  const [hoursRaw = '7', minutesRaw = '0'] = options.time.split(':');
  const hours = Math.min(23, Math.max(0, Number(hoursRaw) || 0));
  const minutes = Math.min(59, Math.max(0, Number(minutesRaw) || 0));

  const start = new Date(now);
  start.setHours(hours, minutes, 0, 0);
  if (start.getTime() <= now.getTime()) start.setDate(start.getDate() + 1);
  const end = new Date(start.getTime() + 15 * 60 * 1000);

  const uid = options.uid ?? `agri28-${String(start.getTime())}@local`;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Agricole DZ 360//Rappel quotidien//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${toIcsUtc(now)}`,
    `DTSTART:${toIcsUtc(start)}`,
    `DTEND:${toIcsUtc(end)}`,
    'RRULE:FREQ=DAILY;COUNT=28',
    `SUMMARY:${escapeIcsText(options.summary)}`,
    `DESCRIPTION:${escapeIcsText(options.description)}`,
    'BEGIN:VALARM',
    'TRIGGER:PT0M',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeIcsText(options.summary)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return `${lines.join('\r\n')}\r\n`;
}

export function reminderIcsBlob(options: ReminderOptions): Blob {
  return new Blob([buildReminderIcs(options)], { type: 'text/calendar;charset=utf-8' });
}
