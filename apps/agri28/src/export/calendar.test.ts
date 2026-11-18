import { describe, expect, it } from 'vitest';
import { buildReminderIcs, escapeIcsText, toIcsUtc } from './calendar';

const now = new Date('2026-11-18T06:00:00Z');

describe('rappel .ics', () => {
  it('produit un événement quotidien valide', () => {
    const ics = buildReminderIcs({
      time: '07:30',
      summary: 'Mes 15 minutes',
      description: 'Agricole DZ 360',
      now,
      uid: 'test@local',
    });

    expect(ics.startsWith('BEGIN:VCALENDAR')).toBe(true);
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
    expect(ics).toContain('RRULE:FREQ=DAILY;COUNT=28');
    expect(ics).toContain('SUMMARY:Mes 15 minutes');
    expect(ics).toContain('BEGIN:VALARM');
    expect(ics).toContain('UID:test@local');
    // Les lignes iCalendar se terminent par CRLF.
    expect(ics.includes('\r\n')).toBe(true);
  });

  it('programme la prochaine occurrence, jamais une heure déjà passée', () => {
    const morning = new Date('2026-11-18T10:00:00');
    const ics = buildReminderIcs({ time: '08:00', summary: 's', description: 'd', now: morning });
    const start = /DTSTART:(\d{8}T\d{6}Z)/.exec(ics)?.[1] ?? '';
    expect(start.slice(0, 8)).toBe('20261119'); // reporté au lendemain
  });

  it('échappe les caractères réservés', () => {
    expect(escapeIcsText('a, b; c\nd')).toBe('a\\, b\\; c\\nd');
    const ics = buildReminderIcs({
      time: '07:00',
      summary: 'Projet, jour 1; suite',
      description: 'ligne 1\nligne 2',
      now,
    });
    expect(ics).toContain('SUMMARY:Projet\\, jour 1\\; suite');
    expect(ics).toContain('DESCRIPTION:ligne 1\\nligne 2');
  });

  it('supporte une heure mal formée sans planter', () => {
    const ics = buildReminderIcs({ time: '99:99', summary: 's', description: 'd', now });
    expect(ics).toContain('DTSTART:');
  });

  it('formate les horodatages en UTC', () => {
    expect(toIcsUtc(new Date(Date.UTC(2026, 10, 18, 7, 5, 9)))).toBe('20261118T070509Z');
  });
});
