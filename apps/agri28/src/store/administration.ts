import { create } from 'zustand';
import { plusRecente, resumerDemandes, type ResumeDemandes } from '@/domain/demandes';
import { ErreurCompte, type CodeErreurCompte, type DemandeEnAttente } from '@/compte/port';
import { serviceCompte } from '@/compte';
import { estAdministrateur } from '@/compte/droits';
import { afficherNotification } from '@/pwa/reminder';

/**
 * Demandes en attente, côté administrateur (phase 11).
 *
 * Le repère « vu » et le repère « déjà notifié » sont distincts : la
 * notification ne doit pas se répéter à chaque ouverture, mais le compteur,
 * lui, reste tant que les demandes n'ont pas été traitées.
 */

const CLE_VU = 'agri28.adminVu';
const CLE_NOTIFIE = 'agri28.adminNotifie';

function lireRepere(cle: string): number {
  try {
    return Number(localStorage.getItem(cle) ?? '0') || 0;
  } catch {
    return 0;
  }
}

function ecrireRepere(cle: string, valeur: number): void {
  try {
    localStorage.setItem(cle, String(valeur));
  } catch {
    /* stockage bloqué : le compteur se répétera, sans conséquence */
  }
}

export type PhaseAdmin = 'inconnu' | 'chargement' | 'refuse' | 'pret' | 'erreur';

interface AdministrationState {
  phase: PhaseAdmin;
  demandes: DemandeEnAttente[];
  code: CodeErreurCompte | null;
  vuJusquA: number;
  resume: ResumeDemandes;
  rafraichir: () => Promise<void>;
  /** Marque les demandes affichées comme vues : le compteur « nouvelles » retombe. */
  marquerVu: () => void;
  /** Prévient une seule fois par lot de demandes nouvelles. */
  notifierSiNouvelles: (titre: string, corps: (nombre: number) => string) => boolean;
}

const RESUME_VIDE: ResumeDemandes = { total: 0, activations: 0, niveaux: 0, nouvelles: 0 };

export const useAdministration = create<AdministrationState>((set, get) => ({
  phase: 'inconnu',
  demandes: [],
  code: null,
  vuJusquA: lireRepere(CLE_VU),
  resume: RESUME_VIDE,

  rafraichir: async () => {
    set({ phase: 'chargement', code: null });
    try {
      if (!(await estAdministrateur())) {
        set({ phase: 'refuse', demandes: [], resume: RESUME_VIDE });
        return;
      }
      const demandes = await serviceCompte.listerDemandes();
      set({
        phase: 'pret',
        demandes,
        resume: resumerDemandes(demandes, get().vuJusquA),
      });
    } catch (erreur) {
      set({
        phase: 'erreur',
        code: erreur instanceof ErreurCompte ? erreur.code : 'inconnue',
      });
    }
  },

  marquerVu: () => {
    const { demandes } = get();
    // On retient la date de la demande la plus récente, pas l'horloge : celle-ci
    // marquerait comme lues des demandes écrites pendant le chargement.
    const vuJusquA = Math.max(get().vuJusquA, plusRecente(demandes));
    ecrireRepere(CLE_VU, vuJusquA);
    set({ vuJusquA, resume: resumerDemandes(demandes, vuJusquA) });
  },

  notifierSiNouvelles: (titre, corps) => {
    const { demandes, resume } = get();
    if (resume.nouvelles === 0) return false;

    const limite = plusRecente(demandes);
    if (limite <= lireRepere(CLE_NOTIFIE)) return false;

    const montree = afficherNotification(titre, corps(resume.nouvelles), 'agri28-admin');
    if (montree) ecrireRepere(CLE_NOTIFIE, limite);
    return montree;
  },
}));
