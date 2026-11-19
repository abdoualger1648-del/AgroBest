import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { PageHeader } from '@/components/PageHeader';
import { ChevronEndIcon } from '@/components/Icon';
import { questionsNiveau } from '@/content/testNiveau';
import {
  AXES_NIVEAU,
  estComplet,
  evaluer,
  type NiveauParcours,
  type ReponsesNiveau,
  type ScoresNiveau,
} from '@/domain/niveau';
import { usePreferences } from '@/store/preferences';
import { useCourse } from '@/store/course';
import { formatNumber, formatPercent } from '@/lib/format';
import { NiveauBadge } from './NiveauBadge';

type Etape = { vue: 'intro' } | { vue: 'question'; index: number } | { vue: 'resultat' };

export function TestNiveauPage() {
  const { t } = useTranslation(['niveau', 'common']);
  const navigate = useNavigate();
  const lang = usePreferences((state) => state.lang);
  const enregistrerNiveau = usePreferences((state) => state.enregistrerNiveau);
  const project = useCourse((state) => state.project);

  const questions = useMemo(() => questionsNiveau(), []);

  const [etape, setEtape] = useState<Etape>({ vue: 'intro' });
  const [reponses, setReponses] = useState<ReponsesNiveau>({});
  const [resultat, setResultat] = useState<{
    niveau: NiveauParcours;
    scores: ScoresNiveau;
  } | null>(null);
  const [enregistrement, setEnregistrement] = useState(false);

  const total = questions.length;

  async function valider() {
    if (!estComplet(questions, reponses)) return;
    setEnregistrement(true);
    const { niveau, scores } = evaluer(questions, reponses);
    setResultat({ niveau, scores });
    await enregistrerNiveau(niveau, scores);
    setEnregistrement(false);
    setEtape({ vue: 'resultat' });
  }

  if (etape.vue === 'intro') {
    return (
      <>
        <PageHeader title={t('niveau:titre')} description={t('niveau:sousTitre')} />
        <Card className="mb-4">
          <h2 className="font-semibold">{t('niveau:intro.titre')}</h2>
          <p className="mt-2 text-muted">{t('niveau:intro.texte')}</p>
          <p className="mt-3 text-sm text-muted">{t('niveau:intro.duree')}</p>
        </Card>
        <Button block onClick={() => setEtape({ vue: 'question', index: 0 })}>
          {t('niveau:intro.commencer')}
          <ChevronEndIcon className="mirror" width="20" height="20" />
        </Button>
      </>
    );
  }

  if (etape.vue === 'question') {
    const question = questions[etape.index];
    if (!question) return null;
    const choisie = reponses[question.id];
    const dernier = etape.index === total - 1;
    const numero = etape.index + 1;

    return (
      <>
        <PageHeader title={t('niveau:titre')} />

        <p className="text-sm text-muted">
          {t('niveau:progression', {
            n: formatNumber(numero, lang),
            total: formatNumber(total, lang),
          })}
        </p>
        <div
          className="mt-2 mb-5 h-2 w-full overflow-hidden rounded-full bg-surface-2"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={numero}
          aria-label={t('niveau:titre')}
        >
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ inlineSize: `${String(Math.round((numero / total) * 100))}%` }}
          />
        </div>

        <fieldset className="mb-5">
          <legend className="mb-1 text-lg font-semibold text-balance">{question.text[lang]}</legend>
          {question.aide ? <p className="mb-3 text-sm text-muted">{question.aide[lang]}</p> : null}

          <div className="mt-3 space-y-2">
            {question.options.map((option) => {
              const id = `${question.id}-${option.id}`;
              const actif = choisie === option.id;
              return (
                <label
                  key={option.id}
                  htmlFor={id}
                  className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                    actif ? 'border-primary bg-surface-2' : 'border-border bg-surface'
                  }`}
                >
                  <input
                    id={id}
                    type="radio"
                    name={question.id}
                    value={option.id}
                    checked={actif}
                    onChange={() => {
                      setReponses((precedentes) => ({
                        ...precedentes,
                        [question.id]: option.id,
                      }));
                    }}
                    className="mt-1 size-5 shrink-0 accent-primary"
                  />
                  <span className="text-start">{option.label[lang]}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => {
              setEtape(
                etape.index === 0 ? { vue: 'intro' } : { vue: 'question', index: etape.index - 1 },
              );
            }}
          >
            {t('niveau:precedent')}
          </Button>
          {dernier ? (
            <Button
              className="flex-1"
              disabled={choisie === undefined || enregistrement}
              onClick={() => void valider()}
            >
              {t('niveau:voirResultat')}
            </Button>
          ) : (
            <Button
              className="flex-1"
              disabled={choisie === undefined}
              onClick={() => setEtape({ vue: 'question', index: etape.index + 1 })}
            >
              {t('niveau:suivant')}
              <ChevronEndIcon className="mirror" width="20" height="20" />
            </Button>
          )}
        </div>
      </>
    );
  }

  if (!resultat) return null;

  return (
    <>
      <PageHeader title={t('niveau:resultat.titre')} />

      <Card className="mb-4">
        <NiveauBadge niveau={resultat.niveau} />
        <h2 className="mt-3 font-semibold">{t('niveau:resultat.ceQueCaChange')}</h2>
        <p className="mt-1 text-muted">{t(`niveau:niveaux.${resultat.niveau}.description`)}</p>
      </Card>

      <Card className="mb-4">
        <h2 className="font-semibold">{t('niveau:resultat.detail')}</h2>
        <dl className="mt-3 space-y-3">
          {AXES_NIVEAU.map((axe) => (
            // `dt` et `dd` sont enfants DIRECTS de ce div : une liste de
            // définitions n'accepte pas de niveau intermédiaire, et axe-core
            // le refuse à juste titre. La barre vit donc dans le `dd`, dont
            // elle est la valeur au même titre que le pourcentage.
            <div key={axe}>
              <dt className="text-sm">{t(`niveau:axes.${axe}`)}</dt>
              <dd className="mt-1 flex items-center gap-3">
                <div
                  className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={resultat.scores[axe]}
                  aria-label={t(`niveau:axes.${axe}`)}
                >
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ inlineSize: `${String(resultat.scores[axe])}%` }}
                  />
                </div>
                <span className="text-end text-sm font-semibold tabular-nums">
                  {formatPercent(resultat.scores[axe] / 100, lang)}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      <p className="mb-4 text-sm text-muted">{t('niveau:resultat.rappel')}</p>

      <Button
        block
        onClick={() => {
          void navigate(project ? '/' : '/bienvenue');
        }}
      >
        {project ? t('niveau:resultat.reprendre') : t('niveau:resultat.continuer')}
        <ChevronEndIcon className="mirror" width="20" height="20" />
      </Button>
    </>
  );
}
