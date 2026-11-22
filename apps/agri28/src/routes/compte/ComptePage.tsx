import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { BoutonsFournisseurs } from './BoutonsFournisseurs';
import { estErreurFournisseur, impasseFournisseur } from '@/compte/port';
import { fournisseursDisponibles } from '@/config';
import { Field, inputClass } from '@/components/Field';
import { PageHeader } from '@/components/PageHeader';
import {
  LONGUEUR_MOT_DE_PASSE_MIN,
  validerEmail,
  validerMotDePasse,
  type ProblemeEmail,
  type ProblemeMotDePasse,
} from '@/domain/identifiants';
import { useCompte } from '@/store/compte';
import { useEtatCompte } from '@/hooks/useAcces';
import { EtatCompteCarte } from './EtatCompteCarte';

type Mode = 'inscription' | 'connexion';

const ERREURS_EMAIL: Record<ProblemeEmail, string> = {
  vide: 'erreurs.emailVide',
  format: 'erreurs.emailFormat',
};
const ERREURS_MOT_DE_PASSE: Record<ProblemeMotDePasse, string> = {
  vide: 'erreurs.motDePasseVide',
  trop_court: 'erreurs.motDePasseTropCourt',
};

export function ComptePage() {
  const { t } = useTranslation('compte');
  const navigate = useNavigate();
  const etat = useEtatCompte();

  const sInscrire = useCompte((state) => state.sInscrire);
  const reinitialiserMotDePasse = useCompte((state) => state.reinitialiserMotDePasse);
  const seConnecter = useCompte((state) => state.seConnecter);
  const enCours = useCompte((state) => state.enCours);
  const derniereErreur = useCompte((state) => state.derniereErreur);

  const [mode, setMode] = useState<Mode>('inscription');
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [problemeEmail, setProblemeEmail] = useState<ProblemeEmail | null>(null);
  const [problemeMotDePasse, setProblemeMotDePasse] = useState<ProblemeMotDePasse | null>(null);
  const [reinitialisationEnvoyee, setReinitialisationEnvoyee] = useState(false);

  // Déjà connecté : on montre l'état du compte au lieu d'un formulaire.
  if (etat.statut !== 'anonyme') return <EtatCompteCarte />;

  /**
   * Mot de passe oublié. Le message affiché est le même que l'adresse ait un
   * compte ou non : dire « adresse inconnue » permettrait de savoir qui est
   * inscrit.
   */
  async function oublie() {
    const faute = validerEmail(email);
    setProblemeEmail(faute);
    setReinitialisationEnvoyee(false);
    if (faute) return;
    if (await reinitialiserMotDePasse(email)) setReinitialisationEnvoyee(true);
  }

  async function envoyer(evenement: FormEvent) {
    evenement.preventDefault();
    const fauteEmail = validerEmail(email);
    const fauteMotDePasse = validerMotDePasse(motDePasse);
    setProblemeEmail(fauteEmail);
    setProblemeMotDePasse(fauteMotDePasse);
    setReinitialisationEnvoyee(false);
    if (fauteEmail || fauteMotDePasse) return;

    const reussi =
      mode === 'inscription'
        ? await sInscrire(email, motDePasse)
        : await seConnecter(email, motDePasse);
    if (!reussi) return;

    // Quelqu'un qui se reconnecte — le cas courant après une réinstallation —
    // a déjà confirmé son adresse : l'envoyer sur l'écran d'attente serait
    // absurde. On ne l'y envoie que si la confirmation manque réellement.
    const aConfirmer = useCompte.getState().etat.statut === 'non_verifie';
    await navigate(aConfirmer ? '/compte/confirmation' : '/');
  }

  return (
    <>
      <PageHeader title={t('titre')} description={t('sousTitre')} />

      <div className="mb-5 flex gap-2" role="tablist">
        {(['inscription', 'connexion'] as const).map((valeur) => (
          <button
            key={valeur}
            type="button"
            role="tab"
            aria-selected={mode === valeur}
            onClick={() => setMode(valeur)}
            className={`min-h-11 flex-1 rounded-xl border px-3 py-2 text-sm font-semibold ${
              mode === valeur
                ? 'border-primary bg-primary text-on-primary'
                : 'border-border bg-surface text-fg'
            }`}
          >
            {t(`onglets.${valeur}`)}
          </button>
        ))}
      </div>

      <form onSubmit={(evenement) => void envoyer(evenement)} noValidate>
        <Field
          id="compte-email"
          label={t('champs.email')}
          help={mode === 'inscription' ? t('champs.emailAide') : undefined}
          error={problemeEmail ? t(ERREURS_EMAIL[problemeEmail]) : undefined}
        >
          <input
            id="compte-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            className={inputClass}
            value={email}
            onChange={(evenement) => setEmail(evenement.target.value)}
          />
        </Field>

        <Field
          id="compte-mot-de-passe"
          label={t('champs.motDePasse')}
          help={
            mode === 'inscription'
              ? t('champs.motDePasseAide', { min: LONGUEUR_MOT_DE_PASSE_MIN })
              : undefined
          }
          error={
            problemeMotDePasse
              ? t(ERREURS_MOT_DE_PASSE[problemeMotDePasse], { min: LONGUEUR_MOT_DE_PASSE_MIN })
              : undefined
          }
        >
          <input
            id="compte-mot-de-passe"
            type="password"
            autoComplete={mode === 'inscription' ? 'new-password' : 'current-password'}
            className={inputClass}
            value={motDePasse}
            onChange={(evenement) => setMotDePasse(evenement.target.value)}
          />
        </Field>

        {/* Une erreur venue des boutons de fournisseur s'affiche AVEC eux,
            pas sous le champ email : le store ne porte qu'une erreur, c'est
            donc ici qu'on décide à qui elle appartient. */}
        {derniereErreur && !estErreurFournisseur(derniereErreur) ? (
          <>
            <p role="alert" className="mb-2 text-sm font-medium text-danger">
              {t(`erreurs.${derniereErreur}`)}
            </p>
            {/* Sans boutons de fournisseur — donc dans l'APK — un compte créé
                avec Google n'a pas de mot de passe, et le message d'erreur
                seul ne mène nulle part. La phrase nomme la sortie. */}
            {impasseFournisseur(derniereErreur, fournisseursDisponibles()) ? (
              <p className="mb-4 text-sm text-muted">{t('fournisseurs.impasse')}</p>
            ) : null}
          </>
        ) : null}

        <Button type="submit" block disabled={enCours}>
          {t(mode === 'inscription' ? 'actions.creerCompte' : 'actions.seConnecter')}
        </Button>

        {mode === 'connexion' ? (
          <Button
            block
            variant="ghost"
            className="mt-2"
            disabled={enCours}
            onClick={() => void oublie()}
          >
            {t('actions.motDePasseOublie')}
          </Button>
        ) : null}

        {reinitialisationEnvoyee ? (
          <p role="status" className="mt-3 text-sm font-medium text-primary">
            {t('confirmation.reinitialisationEnvoyee')}
          </p>
        ) : null}
      </form>

      <BoutonsFournisseurs />

      <Card className="mt-6 bg-surface-2">
        <h2 className="mb-1 font-semibold">{t('confidentialite.titre')}</h2>
        <p className="text-sm text-muted">{t('confidentialite.texte')}</p>
      </Card>
    </>
  );
}
