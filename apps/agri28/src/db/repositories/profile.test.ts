import { beforeEach, describe, expect, it } from 'vitest';
import { db, SCHEMA_VERSION } from '../db';
import { buildDefaultProfile, clearProfile, getProfile, updateProfile } from './profile';

describe('profil (IndexedDB)', () => {
  beforeEach(async () => {
    await clearProfile();
  });

  it('crée un profil par défaut au premier accès', async () => {
    expect(await db.profile.count()).toBe(0);

    const profile = await getProfile();

    expect(profile.id).toBe(1);
    expect(['fr', 'ar']).toContain(profile.lang);
    expect(profile.theme).toBe('system');
    expect(profile.onboardingDone).toBe(false);
    expect(profile.schemaVersion).toBe(SCHEMA_VERSION);
    expect(profile.activeProjectId).toBeNull();
    expect(await db.profile.count()).toBe(1);
  });

  it('renvoie le même profil aux appels suivants', async () => {
    const first = await getProfile();
    const second = await getProfile();
    expect(second.createdAt).toBe(first.createdAt);
    expect(await db.profile.count()).toBe(1);
  });

  it('enregistre une modification de manière persistante', async () => {
    await getProfile();
    const updated = await updateProfile({ lang: 'ar', theme: 'dark', onboardingDone: true });

    expect(updated.lang).toBe('ar');
    expect(updated.theme).toBe('dark');
    expect(updated.onboardingDone).toBe(true);

    const reread = await getProfile();
    expect(reread.lang).toBe('ar');
    expect(reread.theme).toBe('dark');
  });

  it('met à jour updatedAt sans toucher à createdAt', async () => {
    const created = buildDefaultProfile(1000);
    await db.profile.put(created);

    const updated = await updateProfile({ theme: 'light' });

    expect(updated.createdAt).toBe(1000);
    expect(updated.updatedAt).toBeGreaterThan(1000);
  });
});
