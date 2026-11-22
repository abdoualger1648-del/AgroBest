import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { inputClass } from '@/components/Field';
import { formatDate, formatNumber } from '@/lib/format';
import {
  FILTRES_COMPTES,
  actionsPossibles,
  filtrerComptes,
  type CompteAdministre,
  type FiltreComptes,
} from '@/domain/comptes';
import { useAdministration, type ActionAdmin } from '@/store/administration';
import { usePreferences } from '@/store/preferences';
import { useCompte } from '@/store/compte';

/** Action en attente de confirmation : rien de destructif ne part d'un seul clic. */
interface Confirmation {
  uid: string;
  action: Extract<ActionAdmin, 'desactiver' | 'retirerNiveau'>;
  email: string;
}

function Etiquette({ texte, fort = false }: { texte: string; fort?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        fort ? 'bg-primary text-on-primary' : 'bg-surface-2 text-fg'
      }`}
    >
      {texte}
    </span>
  );
}

function LigneCompte({
  compte,
  monUid,
  onAction,
  confirmation,
  setConfirmation,
  occupe,
}: {
  compte: CompteAdministre;
  monUid: string | null;
  onAction: (action: ActionAdmin, uid: string) => void;
  confirmation: Confirmation | null;
  setConfirmation: (valeur: Confirmation | null) => void;
  occupe: boolean;
}) {
  const { t } = useTranslation(['compte', 'common']);
  const lang = usePreferences((state) => state.lang);
  const actions = actionsPossibles(compte, monUid);
  const soiMeme = monUid !== null && compte.uid === monUid;
  const enCours = confirmation?.uid === compte.uid ? confirmation : null;

  return (
    <Card as="li">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="font-semibold break-all">{compte.email}</p>
        {soiMeme ? <Etiquette texte={t('compte:admin.moi')} fort /> : null}
      </div>

      {/* L'identifiant est ici, et nulle part ailleurs : c'est lui qui
          désigne un administrateur dans la console Firestore (D56). Le
          montrer sur cette liste permet d'en désigner un second sans que la
          personne ait à lire le sien dans son propre écran de compte — où il
          ne lui dirait rien (D137). La donnée était déjà chargée. */}
      <p className="mt-1 font-mono text-xs break-all text-muted">
        <span className="sr-only">{t('compte:admin.identifiantDe')} </span>
        {compte.uid}
      </p>

      <div className="mt-2 flex flex-wrap gap-2">
        <Etiquette
          texte={compte.actif ? t('compte:admin.etatActif') : t('compte:admin.etatInactif')}
        />
        <Etiquette
          texte={
            compte.niveau === 'multi'
              ? t('compte:admin.niveauMulti')
              : t('compte:admin.niveauStandard')
          }
        />
      </div>

      <div className="mt-2 space-y-0.5 text-sm text-muted">
        {compte.activeLe !== null ? (
          <p>{t('compte:admin.activeLe', { date: formatDate(new Date(compte.activeLe), lang) })}</p>
        ) : null}
        {compte.desactiveLe !== null ? (
          <p>
            {t('compte:admin.desactiveLe', {
              date: formatDate(new Date(compte.desactiveLe), lang),
            })}
          </p>
        ) : null}
        {compte.niveauLe !== null ? (
          <p>{t('compte:admin.niveauLe', { date: formatDate(new Date(compte.niveauLe), lang) })}</p>
        ) : null}
        {compte.demandeLe === null && compte.demandeNiveauLe === null && !compte.actif ? (
          <p>{t('compte:admin.jamaisDemande')}</p>
        ) : null}
      </div>

      {enCours ? (
        <div className="mt-3 rounded-xl border border-warning/50 bg-warning/10 p-3">
          <p className="text-sm">
            {t(
              enCours.action === 'desactiver'
                ? 'compte:admin.confirmerDesactiver'
                : 'compte:admin.confirmerRetirerNiveau',
              { email: enCours.email },
            )}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              disabled={occupe}
              onClick={() => {
                onAction(enCours.action, enCours.uid);
              }}
            >
              {t('common:actions.confirm')}
            </Button>
            <Button variant="secondary" onClick={() => setConfirmation(null)}>
              {t('common:actions.cancel')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {actions.activer ? (
            <Button
              disabled={occupe}
              onClick={() => {
                onAction('activer', compte.uid);
              }}
            >
              {t('compte:admin.activer')}
            </Button>
          ) : null}
          {actions.desactiver ? (
            <Button
              variant="secondary"
              onClick={() =>
                setConfirmation({ uid: compte.uid, action: 'desactiver', email: compte.email })
              }
            >
              {t('compte:admin.desactiver')}
            </Button>
          ) : null}
          {actions.accorderNiveau ? (
            <Button
              variant="secondary"
              disabled={occupe}
              onClick={() => {
                onAction('accorderNiveau', compte.uid);
              }}
            >
              {t('compte:admin.accorder')}
            </Button>
          ) : null}
          {actions.retirerNiveau ? (
            <Button
              variant="secondary"
              onClick={() =>
                setConfirmation({ uid: compte.uid, action: 'retirerNiveau', email: compte.email })
              }
            >
              {t('compte:admin.retirerNiveau')}
            </Button>
          ) : null}
          {soiMeme ? (
            <p className="w-full text-sm text-muted">{t('compte:admin.protectionSoi')}</p>
          ) : null}
        </div>
      )}
    </Card>
  );
}

/**
 * Tous les comptes inscrits, avec les quatre décisions de l'administrateur
 * (phase 13).
 *
 * Le filtrage et la recherche viennent de `src/domain/comptes.ts` : cet écran
 * ne décide de rien, il affiche. Les deux actions qui RETIRENT un droit
 * passent par une confirmation, et aucune n'est proposée sur son propre
 * compte — un administrateur ne se ferme pas l'accès par un clic malheureux.
 */
export function ListeComptes() {
  const { t } = useTranslation(['compte', 'common']);
  const lang = usePreferences((state) => state.lang);

  const comptes = useAdministration((state) => state.comptes);
  const resume = useAdministration((state) => state.resumeComptes);
  const agir = useAdministration((state) => state.agir);
  const monUid = useCompte((state) => state.uid);

  const [filtre, setFiltre] = useState<FiltreComptes>('tous');
  const [recherche, setRecherche] = useState('');
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const visibles = useMemo(
    () => filtrerComptes(comptes, filtre, recherche),
    [comptes, filtre, recherche],
  );

  function onAction(action: ActionAdmin, uid: string) {
    setOccupe(true);
    void (async () => {
      const ok = await agir(action, uid);
      setOccupe(false);
      setConfirmation(null);
      if (!ok) return;
      setMessage(
        action === 'desactiver'
          ? t('compte:admin.desactive')
          : action === 'retirerNiveau'
            ? t('compte:admin.niveauRetire')
            : action === 'accorderNiveau'
              ? t('compte:admin.accorde')
              : t('compte:admin.active'),
      );
    })();
  }

  return (
    <section aria-labelledby="comptes-titre" className="mt-8">
      <h2 id="comptes-titre" className="text-xl font-bold">
        {t('compte:admin.comptesTitre')}
      </h2>
      <p className="mt-1 text-sm text-muted">{t('compte:admin.comptesSousTitre')}</p>

      {comptes.length === 0 ? (
        <p className="mt-4 text-muted">{t('compte:admin.comptesAucun')}</p>
      ) : (
        <>
          <p className="mt-3 text-sm text-muted">
            {t('compte:admin.resume', {
              total: formatNumber(resume.total, lang),
              actifs: formatNumber(resume.actifs, lang),
              attente: formatNumber(resume.enAttente, lang),
              multi: formatNumber(resume.multi, lang),
            })}
          </p>

          <div className="mt-4">
            <label htmlFor="recherche-compte" className="text-sm font-medium">
              {t('compte:admin.recherche')}
            </label>
            <input
              id="recherche-compte"
              type="search"
              className={`${inputClass} mt-1`}
              value={recherche}
              onChange={(evenement) => setRecherche(evenement.target.value)}
              aria-describedby="recherche-aide"
            />
            <p id="recherche-aide" className="mt-1 text-sm text-muted">
              {t('compte:admin.rechercheAide')}
            </p>
          </div>

          <div
            role="group"
            aria-label={t('compte:admin.comptesTitre')}
            className="mt-3 flex flex-wrap gap-2"
          >
            {FILTRES_COMPTES.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={filtre === option}
                onClick={() => setFiltre(option)}
                className={`min-h-11 rounded-xl border px-4 py-2 text-sm font-semibold ${
                  filtre === option
                    ? 'border-primary bg-primary text-on-primary'
                    : 'border-border bg-surface text-fg'
                }`}
              >
                {t(`compte:admin.filtres.${option}`)}
              </button>
            ))}
          </div>

          {message ? (
            <p role="status" className="mt-4 text-sm font-medium text-primary">
              {message}
            </p>
          ) : null}

          {visibles.length === 0 ? (
            <p className="mt-4 text-muted">{t('compte:admin.comptesAucunFiltre')}</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {visibles.map((compte) => (
                <LigneCompte
                  key={compte.uid}
                  compte={compte}
                  monUid={monUid}
                  onAction={onAction}
                  confirmation={confirmation}
                  setConfirmation={setConfirmation}
                  occupe={occupe}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
