import { create } from 'zustand';
import { plusRecente, resumerDemandes, type ResumeDemandes } from '@/domain/demandes';
import { resumerComptes, type CompteAdministre, type ResumeComptes } from '@/domain/comptes';
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
  /** Tous les comptes, triés par adresse (phase 13). */
  comptes: CompteAdministre[];
  resumeComptes: ResumeComptes;
  code: CodeErreurCompte | null;
  vuJusquA: number;
  resume: ResumeDemandes;
  rafraichir: () => Promise<void>;
  /**
   * Applique une décision sur un compte, puis relit la liste.
   *
   * Un seul point de passage pour les quatre actions : l'écran n'appelle
   * jamais le service directement, donc aucune ne peut oublier de rafraîchir,
   * ni d'attraper son erreur.
   */
  agir: (action: ActionAdmin, uid: string) => Promise<boolean>;
  /** Marque les demandes affichées comme vues : le compteur « nouvelles » retombe. */
  marquerVu: () => void;
  /** Prévient une seule fois par lot de demandes nouvelles. */
  notifierSiNouvelles: (titre: string, corps: (nombre: number) => string) => boolean;
}

export type ActionAdmin = 'activer' | 'desactiver' | 'accorderNiveau' | 'retirerNiveau';

const RESUME_VIDE: ResumeDemandes = { total: 0, activations: 0, niveaux: 0, nouvelles: 0 };
const COMPTES_VIDE: ResumeComptes = { total: 0, actifs: 0, enAttente: 0, multi: 0 };

const APPELS: Record<ActionAdmin, (uid: string) => Promise<void>> = {
  activer: (uid) => serviceCompte.activerCompte(uid),
  desactiver: (uid) => serviceCompte.desactiverCompte(uid),
  accorderNiveau: (uid) => serviceCompte.accorderNiveau(uid),
  retirerNiveau: (uid) => serviceCompte.retirerNiveau(uid),
};

export const useAdministration = create<AdministrationState>((set, get) => ({
  phase: 'inconnu',
  demandes: [],
  comptes: [],
  resumeComptes: COMPTES_VIDE,
  code: null,
  vuJusquA: lireRepere(CLE_VU),
  resume: RESUME_VIDE,

  rafraichir: async () => {
    set({ phase: 'chargement', code: null });
    try {
      if (!(await estAdministrateur())) {
        set({
          phase: 'refuse',
          demandes: [],
          comptes: [],
          resume: RESUME_VIDE,
          resumeComptes: COMPTES_VIDE,
        });
        return;
      }
      // Les deux listes sont lues ensemble : un écran qui montrerait des
      // demandes à jour et des comptes périmés serait pire qu'inutile.
      const [demandes, comptes] = await Promise.all([
        serviceCompte.listerDemandes(),
        serviceCompte.listerComptes(),
      ]);
      set({
        phase: 'pret',
        demandes,
        comptes,
        resumeComptes: resumerComptes(comptes),
        resume: resumerDemandes(demandes, get().vuJusquA),
      });
    } catch (erreur) {
      set({
        phase: 'erreur',
        code: erreur instanceof ErreurCompte ? erreur.code : 'inconnue',
      });
    }
  },

  agir: async (action, uid) => {
    try {
      await APPELS[action](uid);
    } catch (erreur) {
      set({
        phase: 'erreur',
        code: erreur instanceof ErreurCompte ? erreur.code : 'inconnue',
      });
      return false;
    }
    await get().rafraichir();
    return true;
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

/**
 * Vide l'état d'administration. Appelé à la déconnexion.
 *
 * Un téléphone passe de main en main : la liste de TOUS les comptes, avec
 * leurs adresses, n'a aucune raison de survivre au départ de celui qui
 * administre. Les repères « vu » et « déjà notifié » restent dans
 * `localStorage`, eux : ils décrivent l'appareil, pas la session.
 */
export function reinitialiserAdministration(): void {
  useAdministration.setState({
    phase: 'inconnu',
    demandes: [],
    comptes: [],
    resume: RESUME_VIDE,
    resumeComptes: COMPTES_VIDE,
    code: null,
  });
}
