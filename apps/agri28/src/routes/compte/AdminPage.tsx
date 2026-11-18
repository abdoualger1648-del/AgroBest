import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { PageHeader } from '@/components/PageHeader';
import { formatDate } from '@/lib/format';
import { serviceCompte } from '@/compte';
import { ErreurCompte, type DemandeEnAttente } from '@/compte/port';
import { usePreferences } from '@/store/preferences';
import { useCompte } from '@/store/compte';
import { useEtatCompte } from '@/hooks/useAcces';

type Etat =
  | { phase: 'chargement' }
  | { phase: 'refuse' }
  | { phase: 'pret'; demandes: DemandeEnAttente[] }
  | { phase: 'erreur'; code: string };

/**
 * Écran d'administration (D49) : la liste des demandes en attente, et un
 * bouton pour activer. Il n'est accessible qu'au compte désigné comme
 * administrateur dans Firestore — et les règles de sécurité refusent de
 * toute façon l'écriture à quiconque d'autre, l'écran n'étant qu'un confort.
 */
/** Lit les droits puis les demandes. Ne touche à aucun état React. */
async function lireEtat(): Promise<Etat> {
  try {
    if (!(await serviceCompte.estAdministrateur())) return { phase: 'refuse' };
    return { phase: 'pret', demandes: await serviceCompte.listerDemandes() };
  } catch (erreur) {
    return { phase: 'erreur', code: erreur instanceof ErreurCompte ? erreur.code : 'inconnue' };
  }
}

export function AdminPage() {
  const { t } = useTranslation('compte');
  const lang = usePreferences((state) => state.lang);
  const [etat, setEtat] = useState<Etat>({ phase: 'chargement' });
  const [activeRecemment, setActiveRecemment] = useState<string | null>(null);

  // L'administrateur est un compte comme les autres : il démarre en essai.
  // Les règles l'autorisent à écrire le champ « actif » de n'importe quel
  // compte, y compris le sien — lui imposer de se faire une demande à
  // lui-même pour ensuite y répondre n'aurait servi à rien.
  const monEtat = useEtatCompte();
  const monUid = useCompte((state) => state.uid);
  const rafraichir = useCompte((state) => state.rafraichir);
  const jeSuisInactif = monEtat.statut !== 'actif' && monEtat.statut !== 'anonyme';

  // L'effet n'écrit rien lui-même : il attend l'état calculé, et ne le pose
  // que si l'écran est toujours affiché. Un écran quitté pendant la lecture
  // ne provoque donc aucune écriture tardive.
  useEffect(() => {
    let affiche = true;
    void lireEtat().then((prochain) => {
      if (affiche) setEtat(prochain);
    });
    return () => {
      affiche = false;
    };
  }, []);

  async function mActiver() {
    if (!monUid) return;
    try {
      await serviceCompte.activerCompte(monUid);
    } catch (erreur) {
      setEtat({ phase: 'erreur', code: erreur instanceof ErreurCompte ? erreur.code : 'inconnue' });
      return;
    }
    await rafraichir();
    setEtat(await lireEtat());
  }

  async function activer(demande: DemandeEnAttente) {
    setActiveRecemment(demande.email);
    try {
      await serviceCompte.activerCompte(demande.uid);
    } catch (erreur) {
      setEtat({ phase: 'erreur', code: erreur instanceof ErreurCompte ? erreur.code : 'inconnue' });
      return;
    }
    setEtat(await lireEtat());
  }

  if (etat.phase === 'chargement') {
    return <p className="text-muted">{t('admin.chargement')}</p>;
  }
  if (etat.phase === 'refuse') {
    return <PageHeader title={t('admin.titre')} description={t('admin.refus')} />;
  }
  if (etat.phase === 'erreur') {
    return (
      <>
        <PageHeader title={t('admin.titre')} />
        <p role="alert" className="text-sm font-medium text-danger">
          {t(`erreurs.${etat.code}`)}
        </p>
      </>
    );
  }

  return (
    <>
      <PageHeader title={t('admin.titre')} description={t('admin.sousTitre')} />

      {jeSuisInactif && monUid ? (
        <Card className="mb-4 border-primary/40 bg-surface-2">
          <p className="font-semibold">{t('admin.monCompteTitre')}</p>
          <p className="mt-1 text-sm text-muted">{t('admin.monCompteTexte')}</p>
          <Button block className="mt-3" onClick={() => void mActiver()}>
            {t('admin.monCompteBouton')}
          </Button>
        </Card>
      ) : null}

      {activeRecemment ? (
        <p role="status" className="mb-4 text-sm font-medium text-primary">
          {t('admin.active')}
        </p>
      ) : null}

      {etat.demandes.length === 0 ? (
        <p className="text-muted">{t('admin.aucune')}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {etat.demandes.map((demande) => (
            <li key={demande.uid}>
              <Card>
                <p className="font-semibold break-all">{demande.email}</p>
                <p className="mt-1 text-sm text-muted">
                  {t('admin.demandeLe', { date: formatDate(new Date(demande.demandeLe), lang) })}
                </p>
                <Button block className="mt-3" onClick={() => void activer(demande)}>
                  {t('admin.activer')}
                </Button>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
