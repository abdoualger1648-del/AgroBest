import { create } from 'zustand';
import { etatCompte, type EtatCompte } from '@/domain/access';
import { normaliserEmail } from '@/domain/identifiants';
import {
  enregistrerCompte,
  getCompte,
  oublierCompte,
  versCompteEnregistre,
} from '@/db/repositories/compte';
import { ErreurCompte, type CodeErreurCompte, type ServiceCompte } from '@/compte/port';
import { serviceCompte } from '@/compte';
import { oublierDroits } from '@/compte/droits';

interface CompteState {
  /** État dérivé, recalculé à chaque écriture — jamais pendant le rendu (D19). */
  etat: EtatCompte;
  /** Identifiant du compte chez le service : sert à la demande d'activation. */
  uid: string | null;
  /** Dernière synchronisation réussie avec le service, `null` si jamais. */
  synchroniseLe: number | null;
  charge: boolean;
  /** Une opération réseau est en cours : les boutons doivent attendre. */
  enCours: boolean;
  derniereErreur: CodeErreurCompte | null;

  charger: () => Promise<void>;
  sInscrire: (email: string, motDePasse: string) => Promise<boolean>;
  seConnecter: (email: string, motDePasse: string) => Promise<boolean>;
  seDeconnecter: () => Promise<void>;
  /** Relit l'état auprès du service ; sans réseau, garde le cache local. */
  rafraichir: () => Promise<boolean>;
  renvoyerVerification: () => Promise<boolean>;
  demanderActivation: () => Promise<boolean>;
  oublierErreur: () => void;
}

const ANONYME: EtatCompte = { statut: 'anonyme' };

function codeDe(erreur: unknown): CodeErreurCompte {
  return erreur instanceof ErreurCompte ? erreur.code : 'inconnue';
}

/**
 * Enveloppe commune à toutes les opérations réseau : un seul endroit pose
 * `enCours`, retient le code d'erreur et le relâche. Sans cela, chaque action
 * oublierait un cas et laisserait un bouton figé.
 */
async function operation<T>(
  set: (patch: Partial<CompteState>) => void,
  travail: () => Promise<T>,
): Promise<T | null> {
  set({ enCours: true, derniereErreur: null });
  try {
    return await travail();
  } catch (erreur) {
    set({ derniereErreur: codeDe(erreur) });
    return null;
  } finally {
    set({ enCours: false });
  }
}

export function creerStoreCompte(service: ServiceCompte = serviceCompte) {
  return create<CompteState>((set, get) => {
    /** Écrit l'état venu du service dans le cache local, puis dans le store. */
    async function appliquer(infos: Awaited<ReturnType<ServiceCompte['relire']>>) {
      if (!infos) {
        await oublierCompte();
        set({ etat: ANONYME, uid: null, synchroniseLe: null });
        return;
      }
      const record = await enregistrerCompte(infos);
      set({
        etat: etatCompte(versCompteEnregistre(record)),
        uid: record.uid,
        synchroniseLe: record.synchroniseLe,
      });
    }

    return {
      etat: ANONYME,
      uid: null,
      synchroniseLe: null,
      charge: false,
      enCours: false,
      derniereErreur: null,

      // Le cache local fait foi au démarrage : l'application doit être
      // utilisable avant même de savoir s'il y a du réseau.
      charger: async () => {
        const record = await getCompte();
        set({
          etat: etatCompte(versCompteEnregistre(record)),
          uid: record?.uid ?? null,
          synchroniseLe: record?.synchroniseLe ?? null,
          charge: true,
        });
      },

      sInscrire: async (email, motDePasse) => {
        const infos = await operation(set, () =>
          service.sInscrire(normaliserEmail(email), motDePasse),
        );
        if (!infos) return false;
        await appliquer(infos);
        return true;
      },

      seConnecter: async (email, motDePasse) => {
        const infos = await operation(set, () =>
          service.seConnecter(normaliserEmail(email), motDePasse),
        );
        if (!infos) return false;
        await appliquer(infos);
        return true;
      },

      seDeconnecter: async () => {
        await operation(set, () => service.seDeconnecter());
        oublierDroits();
        await oublierCompte();
        set({ etat: ANONYME, uid: null, synchroniseLe: null });
      },

      // Hors ligne, un échec ne doit RIEN changer : quelqu'un d'activé qui
      // perd le réseau garde son accès (D46).
      rafraichir: async () => {
        if (!get().charge) await get().charger();
        const infos = await operation(set, () => service.relire());
        if (infos === null) return false;
        await appliquer(infos);
        return true;
      },

      renvoyerVerification: async () => {
        const resultat = await operation(set, async () => {
          await service.renvoyerVerification();
          return true as const;
        });
        return resultat === true;
      },

      demanderActivation: async () => {
        const infos = await operation(set, () => service.demanderActivation());
        if (!infos) return false;
        await appliquer(infos);
        return true;
      },

      oublierErreur: () => set({ derniereErreur: null }),
    };
  });
}

export const useCompte = creerStoreCompte();
