import { useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { PageHeader } from '@/components/PageHeader';
import {
  DOSSIERS_MULTI,
  dossiersAutorises,
  peutCreerUnDossier,
  peutDemanderNiveau,
} from '@/domain/access';
import { formatDate } from '@/lib/format';
import { usePreferences } from '@/store/preferences';
import { useCourse } from '@/store/course';
import { useCompte } from '@/store/compte';
import { useEtatCompte, useNiveau } from '@/hooks/useAcces';

/**
 * Liste des dossiers : en ouvrir un autre, en créer, en supprimer.
 *
 * Un dossier = une activité (l'élevage ovin, l'apiculture…), avec son propre
 * parcours de 28 jours et son propre Dossier de projet. Le nombre autorisé
 * dépend du niveau du compte, et le niveau se demande comme l'activation.
 */
export function DossiersPage() {
  const { t } = useTranslation('dossiers');
  const lang = usePreferences((state) => state.lang);

  const projects = useCourse((state) => state.projects);
  const actif = useCourse((state) => state.project);
  const changerDeProjet = useCourse((state) => state.changerDeProjet);
  const supprimerProjet = useCourse((state) => state.supprimerProjet);

  const niveau = useNiveau();
  const etat = useEtatCompte();
  const demandeNiveauLe = useCompte((state) => state.demandeNiveauLe);
  const demanderNiveau = useCompte((state) => state.demanderNiveau);
  const enCours = useCompte((state) => state.enCours);

  const [aSupprimer, setASupprimer] = useState<string | null>(null);

  const maximum = dossiersAutorises(niveau);
  const placeLibre = peutCreerUnDossier(niveau, projects.length);
  const peutDemander = peutDemanderNiveau(etat, niveau);

  return (
    <>
      <PageHeader title={t('titre')} description={t('sousTitre')} />

      <p className="mb-4 text-sm text-muted">
        {t('compteur', { n: projects.length, max: maximum })}
        {niveau === 'multi' ? ` · ${t('niveauAccorde')}` : ''}
      </p>

      <ul className="mb-5 flex flex-col gap-3">
        {projects.map((projet) => {
          const estActif = projet.id === actif?.id;
          return (
            <li key={projet.id}>
              <Card className={estActif ? 'border-primary/50' : undefined}>
                <p className="font-semibold">{projet.name}</p>
                <p className="mt-1 text-sm text-muted">
                  {estActif ? t('enCours') : formatDate(new Date(projet.updatedAt), lang)}
                </p>

                {!estActif ? (
                  <Button
                    block
                    variant="secondary"
                    className="mt-3"
                    onClick={() => void changerDeProjet(projet.id)}
                  >
                    {t('ouvrir')}
                  </Button>
                ) : null}

                {/* La suppression se confirme dans l'écran, sans boîte de
                    dialogue du navigateur : celles-ci ne sont ni traduites,
                    ni toujours accessibles au clavier. */}
                {aSupprimer === projet.id ? (
                  <div className="mt-3 rounded-xl border border-danger/40 p-3">
                    <p className="font-semibold">{t('supprimerTitre', { nom: projet.name })}</p>
                    <p className="mt-1 text-sm text-muted">{t('supprimerTexte')}</p>
                    <Button
                      block
                      className="mt-3 bg-danger text-on-primary hover:bg-danger"
                      onClick={() => {
                        setASupprimer(null);
                        void supprimerProjet(projet.id);
                      }}
                    >
                      {t('supprimerConfirmer')}
                    </Button>
                    <Button
                      block
                      variant="ghost"
                      className="mt-2"
                      onClick={() => setASupprimer(null)}
                    >
                      {t('supprimerAnnuler')}
                    </Button>
                  </div>
                ) : projects.length > 1 ? (
                  <Button
                    block
                    variant="ghost"
                    className="mt-2"
                    onClick={() => setASupprimer(projet.id)}
                  >
                    {t('supprimer')}
                  </Button>
                ) : null}
              </Card>
            </li>
          );
        })}
      </ul>

      {placeLibre ? (
        <Link to="/dossiers/nouveau" className="block">
          <Button block>{t('creer')}</Button>
        </Link>
      ) : niveau === 'multi' ? (
        <p className="text-sm text-muted">{t('plafondAtteint', { max: maximum })}</p>
      ) : (
        <Card className="border-primary/40 bg-surface-2">
          <h2 className="font-semibold">{t('plafondTitre')}</h2>
          <p className="mt-1 text-sm text-muted">{t('plafondTexte', { max: DOSSIERS_MULTI })}</p>

          {demandeNiveauLe !== null ? (
            <p role="status" className="mt-3 text-sm font-medium text-primary">
              {t('demandeEnvoyee', { date: formatDate(new Date(demandeNiveauLe), lang) })}
            </p>
          ) : peutDemander ? (
            <Button block className="mt-3" disabled={enCours} onClick={() => void demanderNiveau()}>
              {t('demander')}
            </Button>
          ) : (
            <p className="mt-3 text-sm text-muted">{t('activationDabord')}</p>
          )}
        </Card>
      )}
    </>
  );
}
