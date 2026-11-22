import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAdministrateur } from './useAdministrateur';
import { useCompte } from '@/store/compte';
import { serviceEnMemoire } from '@/compte';
import { oublierDroits } from '@/compte/droits';

/**
 * Le hook est monté UNE FOIS pour toute la vie de l'application dans
 * `App.tsx`. Sa dépendance vide gardait donc sa première réponse : quelqu'un
 * qui se connectait après le démarrage n'était jamais reconnu comme
 * administrateur, et celui qui se déconnectait le restait.
 */

const eventuel = serviceEnMemoire();
if (!eventuel) throw new Error('Ce test suppose le service de comptes en mémoire.');
const service = eventuel;

const ADMIN = 'admin@example.dz';
const MDP = 'orge2026';

beforeEach(() => {
  vi.stubEnv('VITE_EDITION', 'apk');
  service.reinitialiser();
  oublierDroits();
  useCompte.setState({ uid: null });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('useAdministrateur', () => {
  it('reste faux tant que personne n’est connecté', () => {
    const { result } = renderHook(() => useAdministrateur());
    expect(result.current).toBe(false);
  });

  it('devient vrai pour un compte qui se connecte APRÈS le montage', async () => {
    // Le cas que la dépendance vide ratait.
    const { result } = renderHook(() => useAdministrateur());
    expect(result.current).toBe(false);

    await service.sInscrire(ADMIN, MDP);
    service.nommerAdministrateur(ADMIN);
    oublierDroits();
    const uid = (await service.relire())?.uid ?? null;
    useCompte.setState({ uid });

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  it('redevient faux à la déconnexion, sans attendre un rechargement', async () => {
    await service.sInscrire(ADMIN, MDP);
    service.nommerAdministrateur(ADMIN);
    const uid = (await service.relire())?.uid ?? null;
    useCompte.setState({ uid });

    const { result } = renderHook(() => useAdministrateur());
    await waitFor(() => {
      expect(result.current).toBe(true);
    });

    useCompte.setState({ uid: null });
    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });

  it('recalcule les droits pour le compte suivant sur le même appareil', async () => {
    // Le vrai parcours : on ne change pas de compte sans se déconnecter, et
    // c'est la déconnexion qui vide le cache de droits.
    await useCompte.getState().sInscrire(ADMIN, MDP);
    service.nommerAdministrateur(ADMIN);
    oublierDroits();
    await useCompte.getState().charger();

    const { result } = renderHook(() => useAdministrateur());
    await waitFor(() => {
      expect(result.current).toBe(true);
    });

    await useCompte.getState().seDeconnecter();
    await waitFor(() => {
      expect(result.current).toBe(false);
    });

    // Quelqu'un d'autre prend le téléphone. Il n'administre pas, et la
    // réponse précédente ne doit pas lui profiter.
    await useCompte.getState().sInscrire('brahim@example.dz', MDP);
    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });
});
