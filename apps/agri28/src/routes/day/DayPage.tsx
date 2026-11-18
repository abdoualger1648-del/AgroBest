import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { Lesson } from '@/content/schema';
import { LessonNotFoundError, loadLesson } from '@/content/loader';
import { appliquerVariante } from '@/content/variantes';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { GuardrailNotice } from '@/components/GuardrailNotice';
import { SessionTimer } from '@/components/SessionTimer';
import { PageHeader } from '@/components/PageHeader';
import { ChevronEndIcon } from '@/components/Icon';
import { useTimer } from '@/hooks/useTimer';
import { SESSION_SECONDS } from '@/domain/timer';
import { computeDayStatuses } from '@/domain/course';
import { useAccesJour } from '@/hooks/useAcces';
import { BlocageAcces } from '@/components/BlocageAcces';
import { scoreQuiz } from '@/domain/quiz';
import { usePreferences } from '@/store/preferences';
import { selectDayProgress, useCourse } from '@/store/course';
import { ConceptStep } from './ConceptStep';
import { PracticeStep } from './PracticeStep';
import { QuizStep } from './QuizStep';
import { ReviewStep } from './ReviewStep';

const STEPS = ['concept', 'practice', 'quiz', 'review'] as const;

export function DayPage() {
  const params = useParams();
  const day = Number(params['day'] ?? '1');
  const navigate = useNavigate();
  const { t } = useTranslation(['day', 'common']);
  const lang = usePreferences((state) => state.lang);

  const project = useCourse((state) => state.project);
  const progress = useCourse((state) => state.progress);
  const loaded = useCourse((state) => state.loaded);
  const startDay = useCourse((state) => state.startDay);
  const saveDay = useCourse((state) => state.saveDay);
  const unlockDay = useCourse((state) => state.unlockDay);
  const completeDay = useCourse((state) => state.completeDay);

  const dayProgress = useCourse((state) => selectDayProgress(state, day));
  const acces = useAccesJour(day);
  const statuses = useMemo(() => computeDayStatuses(progress), [progress]);
  const status = statuses.get(day) ?? 'locked';

  const [leconBrute, setLesson] = useState<Lesson | null>(null);
  const [missing, setMissing] = useState(false);
  const [step, setStep] = useState(0);
  const [captures, setCaptures] = useState<Record<string, string>>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [confidence, setConfidence] = useState<number | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  // La leçon affichée s'adapte au type d'activité du dossier (phase 10) :
  // l'exemple de terrain, les questions posées et les indices changent pour
  // un apiculteur ou un maraîcher. Le gabarit des prompts, lui, ne bouge
  // jamais — c'est lui qui porte les garde-fous.
  const lesson = useMemo(
    () => (leconBrute ? appliquerVariante(leconBrute, project?.type ?? null) : null),
    [leconBrute, project?.type],
  );

  const timer = useTimer(SESSION_SECONDS, true);

  // Changement de jour ou de langue : on repart d'un état propre.
  // Ajustement pendant le rendu, pas dans un effet (motif recommandé par React).
  const viewKey = `${String(day)}:${lang}`;
  const [currentKey, setCurrentKey] = useState(viewKey);
  const [restoredKey, setRestoredKey] = useState<string | null>(null);

  if (currentKey !== viewKey) {
    setCurrentKey(viewKey);
    setLesson(null);
    setMissing(false);
    setStep(0);
    setCaptures({});
    setAnswers({});
    setConfidence(undefined);
    setRestoredKey(null);
  }

  // Reprise d'une journée déjà commencée : on réaffiche les saisies, une seule fois.
  if (dayProgress && restoredKey !== viewKey) {
    setRestoredKey(viewKey);
    setCaptures(dayProgress.captures);
    if (dayProgress.quiz) setAnswers(dayProgress.quiz.answers);
    if (dayProgress.confidence !== undefined) setConfidence(dayProgress.confidence);
  }

  useEffect(() => {
    let cancelled = false;

    loadLesson(day, lang)
      .then((loadedLesson) => {
        if (!cancelled) setLesson(loadedLesson);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof LessonNotFoundError) setMissing(true);
        else throw error;
      });

    return () => {
      cancelled = true;
    };
  }, [day, lang]);

  useEffect(() => {
    if (status !== 'locked' && project && lesson) void startDay(day);
  }, [day, lesson, project, startDay, status]);

  const persist = useCallback(() => {
    if (!project) return;
    void saveDay(day, { captures, timeSpentSec: timer.elapsedSec });
  }, [captures, day, project, saveDay, timer.elapsedSec]);

  if (loaded && !project) {
    return (
      <>
        <PageHeader title={t('day:missing.title')} />
        <Link to="/bienvenue">
          <Button block>{t('day:locked.goToCurrent', { day: 1 })}</Button>
        </Link>
      </>
    );
  }

  // L'accès passe AVANT le verrou pédagogique : sans cela, le bouton
  // « ouvrir quand même » du verrou pédagogique ouvrirait n'importe quelle
  // leçon sans activation.
  if (!acces.ouvert) {
    return <BlocageAcces motif={acces.motif} jour={day} />;
  }

  if (status === 'locked') {
    return (
      <>
        <PageHeader
          title={t('day:locked.title')}
          description={t('day:locked.description', { previous: day - 1 })}
        />
        <Button block variant="secondary" onClick={() => void unlockDay(day)}>
          {t('day:locked.unlock')}
        </Button>
      </>
    );
  }

  if (missing) {
    return (
      <PageHeader
        title={t('day:missing.title')}
        description={t('day:missing.description', { day })}
      />
    );
  }

  if (!lesson) return <p className="text-muted">{t('common:status.loading')}</p>;

  const isLast = step === STEPS.length - 1;
  const quizOutcome = scoreQuiz(lesson.sections.quiz.questions, answers);

  async function validate() {
    if (!lesson || !project) return;
    setSubmitting(true);
    try {
      await completeDay(day, lesson, lang, {
        captures,
        quiz: {
          answers,
          score: quizOutcome.score,
          total: quizOutcome.total,
          attempts: (dayProgress?.quiz?.attempts ?? 0) + 1,
        },
        ...(confidence ? { confidence: confidence as 1 | 2 | 3 | 4 | 5 } : {}),
        timeSpentSec: timer.elapsedSec,
      });
      await navigate('/');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="sticky top-0 z-10 -mx-4 mb-4 border-b border-border bg-bg/95 px-4 py-3 backdrop-blur">
        <SessionTimer timer={timer} totalSec={SESSION_SECONDS} />
        {timer.finished ? (
          <p className="mt-2 text-sm text-warning">{t('day:timer.finished')}</p>
        ) : null}
      </div>

      <header className="mb-4">
        <p className="text-sm font-medium text-muted">
          {t('day:list.day', { day })} · {t('day:list.week', { week: lesson.week })}
        </p>
        <h1 className="mt-1 text-2xl font-bold">{lesson.title}</h1>
        <p className="mt-2 text-muted">{lesson.subtitle}</p>
        {lesson.draft ? (
          <p className="mt-2 inline-block rounded-lg border border-warning/50 bg-warning/10 px-2 py-1 text-xs font-semibold">
            {t('day:draft.label')} — {t('day:draft.note')}
          </p>
        ) : null}
        {dayProgress?.status === 'done' ? (
          <p className="mt-2 text-sm text-success">{t('day:review.alreadyDone')}</p>
        ) : null}
      </header>

      <nav
        aria-label={t('day:stepOf', { current: step + 1, total: STEPS.length })}
        className="mb-5"
      >
        <ol className="flex gap-1">
          {STEPS.map((name, index) => (
            <li key={name} className="flex-1">
              <div
                className={`h-1.5 rounded-full ${index <= step ? 'bg-primary' : 'bg-surface-2'}`}
                aria-hidden="true"
              />
              <p
                className={`mt-1 text-center text-xs ${index === step ? 'font-semibold text-primary' : 'text-muted'}`}
              >
                {t(`day:steps.${name}`)}
              </p>
            </li>
          ))}
        </ol>
      </nav>

      {step === 0 ? <ConceptStep lesson={lesson} /> : null}
      {step === 1 ? (
        <PracticeStep
          lesson={lesson}
          project={project}
          captures={captures}
          onCapture={(id, value) => setCaptures((current) => ({ ...current, [id]: value }))}
        />
      ) : null}
      {step === 2 ? (
        <QuizStep
          lesson={lesson}
          answers={answers}
          onAnswer={(questionId, choiceId) =>
            setAnswers((current) => ({ ...current, [questionId]: choiceId }))
          }
        />
      ) : null}
      {step === 3 ? (
        <ReviewStep
          lesson={lesson}
          captures={captures}
          confidence={confidence}
          onConfidence={setConfidence}
        />
      ) : null}

      {step === 0 ? <GuardrailNotice ids={lesson.guardrails} /> : null}

      {step === 3 && lesson.verifyLocally && lesson.verifyLocally.length > 0 ? (
        <Card className="mt-4 border-warning/50 bg-warning/10">
          <h3 className="mb-1 font-semibold">{t('day:verifyLocally.title')}</h3>
          <ul className="list-disc space-y-1 ps-5 text-sm">
            {lesson.verifyLocally.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </Card>
      ) : null}

      <div className="mt-6 flex gap-3">
        {step > 0 ? (
          <Button
            variant="secondary"
            onClick={() => {
              persist();
              setStep((current) => current - 1);
            }}
          >
            {t('day:nav.back')}
          </Button>
        ) : null}

        {isLast ? (
          <Button block disabled={submitting} onClick={() => void validate()}>
            {t('day:nav.finish')}
          </Button>
        ) : (
          <Button
            block
            onClick={() => {
              persist();
              setStep((current) => current + 1);
            }}
          >
            {t('day:nav.next')}
            <ChevronEndIcon className="mirror" width="20" height="20" />
          </Button>
        )}
      </div>
    </>
  );
}
