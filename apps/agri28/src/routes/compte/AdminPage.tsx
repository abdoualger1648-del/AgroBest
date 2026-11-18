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
import { useAdministration } from '@/store/administration';
import { useEtatCompte } from '@/hooks/useAcces';

/**
 * Écran d'administration (D49) : les demandes en attente, et un bouton pour
 * y répondre. Les règles de sécurité Firestore refusent de toute façon
 * l'écriture à quiconque d'autre — l'écran n'est qu'un confort.
 */
export function AdminPage() {
  const { t } = useTranslation('compte');
  const lang = usePreferences((state) => state.lang);

  const phase = useAdministration((state) => state.phase);
  const demandes = useAdministration((state) => state.demandes);
  const code = useAdministration((state) => state.code);
  const rafraichir = useAdministration((state) => state.rafraichir);
  const marquerVu = useAdministration((state) => state.marquerVu);

  const [accordeRecemment, setAccordeRecemment] = useState<DemandeEnAttente['nature'] | null>(null);

  const monEtat = useEtatCompte();
  const monUid = useCompte((state) => state.uid);
  const rafraichirCompte = useCompte((state) => state.rafraichir);
  const jeSuisInactif = monEtat.statut !== 'actif' && monEtat.statut !== 'anonyme';

  // L'effet n'écrit aucun état lui-même : il déclenche la lecture, et le
  // store s'en charge. Un écran quitté pendant la lecture ne provoque donc
  // pas d'écriture tardive sur un composant démonté.
  useEffect(() => {
    void rafraichir();
  }, [rafraichir]);

  // Les demandes affichées cessent d'être « nouvelles » dès qu'on les voit.
  useEffect(() => {
    if (phase === 'pret') marquerVu();
  }, [phase, demandes, marquerVu]);

  async function mActiver() {
    if (!monUid) return;
    try {
      await serviceCompte.activerCompte(monUid);
    } catch (erreur) {
      useAdministration.setState({
        phase: 'erreur',
        code: erreur instanceof ErreurCompte ? erreur.code : 'inconnue',
      });
      return;
    }
    await rafraichirCompte();
    await rafraichir();
  }

  async function accorder(demande: DemandeEnAttente) {
    setAccordeRecemment(demande.nature);
    try {
      if (demande.nature === 'activation') await serviceCompte.activerCompte(demande.uid);
      else await serviceCompte.accorderNiveau(demande.uid);
    } catch (erreur) {
      useAdministration.setState({
        phase: 'erreur',
        code: erreur instanceof ErreurCompte ? erreur.code : 'inconnue',
      });
      return;
    }
    await rafraichir();
  }

  if (phase === 'inconnu' || phase === 'chargement') {
    return <p className="text-muted">{t('admin.chargement')}</p>;
  }
  if (phase === 'refuse') {
    return <PageHeader title={t('admin.titre')} description={t('admin.refus')} />;
  }
  if (phase === 'erreur') {
    return (
      <>
        <PageHeader title={t('admin.titre')} />
        <p role="alert" className="text-sm font-medium text-danger">
          {t(`erreurs.${code ?? 'inconnue'}`)}
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

      {accordeRecemment ? (
        <p role="status" className="mb-4 text-sm font-medium text-primary">
          {accordeRecemment === 'niveau' ? t('admin.accorde') : t('admin.active')}
        </p>
      ) : null}

      {demandes.length === 0 ? (
        <p className="text-muted">{t('admin.aucune')}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {demandes.map((demande) => (
            <li key={`${demande.uid}-${demande.nature}`}>
              <Card>
                <p className="font-semibold break-all">{demande.email}</p>
                <p className="mt-1 text-sm font-medium text-primary">
                  {demande.nature === 'niveau'
                    ? t('admin.natureNiveau')
                    : t('admin.natureActivation')}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {t('admin.demandeLe', { date: formatDate(new Date(demande.demandeLe), lang) })}
                </p>
                <Button block className="mt-3" onClick={() => void accorder(demande)}>
                  {demande.nature === 'niveau' ? t('admin.accorder') : t('admin.activer')}
                </Button>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
