import { z } from 'zod';

/**
 * Schémas du contenu pédagogique. Source de vérité unique : utilisés à la fois
 * par l'application (chargement d'une leçon) et par `npm run validate:content`.
 * Référence rédigée : docs/lesson-schema.md.
 */

export const LANGS = ['fr', 'ar'] as const;
export const langSchema = z.enum(LANGS);

const md = z.string().min(1);

// ——— blocs de prose ———
export const blockSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('p'), text: md }),
  z.object({ type: z.literal('ul'), items: z.array(md).min(1) }),
  z.object({ type: z.literal('ol'), items: z.array(md).min(1) }),
  z.object({ type: z.literal('quote'), text: md }),
  z.object({
    type: z.literal('note'),
    variant: z.enum(['info', 'warning', 'danger']),
    text: md,
  }),
  z.object({ type: z.literal('example'), label: md.optional(), text: md }),
  z.object({
    type: z.literal('table'),
    columns: z.array(md).min(1),
    rows: z.array(z.array(md)).min(1),
  }),
]);

// ——— prompt prêt à copier ———
export const promptSchema = z.object({
  id: z.string().min(1),
  title: md,
  tool: z.string().min(1),
  template: z.string().min(20),
  hint: md.optional(),
  followUps: z.array(md).optional(),
});

export const DOSSIER_KINDS = [
  'fiche_projet',
  'objectifs',
  'budget',
  'calendrier',
  'risques',
  'equipe',
  'achats',
  'suivi',
  'rapport',
  'libre',
] as const;
export const dossierKindSchema = z.enum(DOSSIER_KINDS);

// ——— saisie qui alimente le Dossier ———
export const captureSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['textarea', 'text', 'number', 'select', 'checklist']),
  label: md,
  placeholder: md.optional(),
  required: z.boolean().optional(),
  options: z.array(z.object({ value: z.string().min(1), label: md })).optional(),
  unit: z.string().optional(),
  dossier: z
    .object({
      kind: dossierKindSchema,
      block: z.enum(['paragraph', 'list', 'kv', 'table']),
      key: md.optional(),
    })
    .optional(),
});

export const stepSchema = z.object({
  id: z.string().min(1),
  instruction: md,
  prompt: promptSchema.optional(),
  capture: captureSchema.optional(),
  optional: z.boolean().optional(),
});

export const questionSchema = z.object({
  id: z.string().min(1),
  text: md,
  choices: z
    .array(z.object({ id: z.string().min(1), text: md }))
    .min(3)
    .max(4),
  answer: z.string().min(1),
  explanation: md,
});

export const sourceRefSchema = z.object({
  label: md,
  url: z.string().url().startsWith('https://'),
  checkedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const lessonSchema = z
  .object({
    schema: z.literal(1),
    id: z.string().regex(/^day-\d{2}$/),
    day: z.number().int().min(1).max(28),
    week: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
    lang: langSchema,
    draft: z.boolean().optional(),
    title: md,
    subtitle: md,
    durationMin: z.literal(15),
    objectives: z.array(md).min(2).max(4),
    tools: z.array(z.string().min(1)),
    requiresProject: z.boolean(),
    produces: z.object({ dossierKind: dossierKindSchema, label: md }).optional(),
    guardrails: z.array(z.string().min(1)),
    sections: z.object({
      concept: z.object({
        durationMin: z.number().int().positive(),
        body: z.array(blockSchema).min(1),
        keyPoints: z.array(md).min(1),
      }),
      practice: z.object({
        durationMin: z.number().int().positive(),
        intro: z.array(blockSchema).optional(),
        steps: z.array(stepSchema).min(1),
      }),
      quiz: z.object({
        durationMin: z.number().int().positive(),
        questions: z.array(questionSchema).length(3),
      }),
      review: z.object({
        durationMin: z.number().int().positive(),
        checklist: z.array(md).min(1),
        confidencePrompt: md,
        dossierPreview: z.boolean(),
      }),
    }),
    sources: z.array(sourceRefSchema).optional(),
    verifyLocally: z.array(md).optional(),
    nextTeaser: md.optional(),
  })
  .superRefine((lesson, ctx) => {
    const { concept, practice, quiz, review } = lesson.sections;
    const total =
      concept.durationMin + practice.durationMin + quiz.durationMin + review.durationMin;
    if (total !== lesson.durationMin) {
      ctx.addIssue({
        code: 'custom',
        message: `La somme des durées des sections vaut ${total} min au lieu de ${lesson.durationMin}.`,
        path: ['sections'],
      });
    }

    if (lesson.week !== Math.ceil(lesson.day / 7)) {
      ctx.addIssue({
        code: 'custom',
        message: `week vaut ${lesson.week} alors que le jour ${lesson.day} appartient à la semaine ${Math.ceil(lesson.day / 7)}.`,
        path: ['week'],
      });
    }

    if (lesson.id !== `day-${String(lesson.day).padStart(2, '0')}`) {
      ctx.addIssue({
        code: 'custom',
        message: `id « ${lesson.id} » incohérent avec day ${lesson.day}.`,
        path: ['id'],
      });
    }

    quiz.questions.forEach((question, index) => {
      if (!question.choices.some((choice) => choice.id === question.answer)) {
        ctx.addIssue({
          code: 'custom',
          message: `La bonne réponse « ${question.answer} » ne fait pas partie des choix.`,
          path: ['sections', 'quiz', 'questions', index, 'answer'],
        });
      }
      const ids = question.choices.map((choice) => choice.id);
      if (new Set(ids).size !== ids.length) {
        ctx.addIssue({
          code: 'custom',
          message: 'Identifiants de choix en double.',
          path: ['sections', 'quiz', 'questions', index, 'choices'],
        });
      }
    });

    const ids = [
      ...practice.steps.map((step) => `step:${step.id}`),
      ...practice.steps.flatMap((step) => (step.prompt ? [`prompt:${step.prompt.id}`] : [])),
      ...practice.steps.flatMap((step) => (step.capture ? [`capture:${step.capture.id}`] : [])),
      ...quiz.questions.map((question) => `question:${question.id}`),
    ];
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (duplicates.length > 0) {
      ctx.addIssue({
        code: 'custom',
        message: `Identifiants en double : ${[...new Set(duplicates)].join(', ')}.`,
        path: ['sections'],
      });
    }
  });

export type Block = z.infer<typeof blockSchema>;
export type Prompt = z.infer<typeof promptSchema>;
export type Capture = z.infer<typeof captureSchema>;
export type Step = z.infer<typeof stepSchema>;
export type Question = z.infer<typeof questionSchema>;
export type Lesson = z.infer<typeof lessonSchema>;
export type DossierKind = z.infer<typeof dossierKindSchema>;

// ——— catalogues ———
export const guardrailsFileSchema = z.object({
  schema: z.literal(1),
  guardrails: z
    .array(
      z.object({
        id: z.string().regex(/^[a-z0-9_]+$/),
        severity: z.enum(['info', 'warning', 'danger']),
        text: z.object({ fr: z.string().min(20), ar: z.string().min(20) }),
      }),
    )
    .min(1),
});

export const toolsFileSchema = z.object({
  schema: z.literal(1),
  note: z.string().optional(),
  tools: z
    .array(
      z.object({
        id: z.string().regex(/^[a-z0-9_]+$/),
        name: z.string().min(1),
        vendor: z.string().min(1),
        url: z.string().url().startsWith('https://'),
        freeTier: z.boolean(),
        availabilityDZ: z.enum(['oui', 'partielle', 'a_verifier', 'non']),
        checkedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        source: z.string().url().nullable(),
        note: z.object({ fr: z.string().min(1), ar: z.string().min(1) }),
      }),
    )
    .min(1),
});

export const wilayasFileSchema = z.object({
  schema: z.literal(1),
  note: z.string().optional(),
  source: z.object({ label: z.string(), url: z.string().url(), checkedOn: z.string() }),
  count: z.number().int().positive(),
  wilayas: z
    .array(
      z.object({
        code: z.string().regex(/^\d{2}$/),
        name_fr: z.string().min(1),
        name_ar: z.string().min(1),
        new2026: z.boolean().optional(),
        motherCode: z
          .string()
          .regex(/^\d{2}$/)
          .optional(),
      }),
    )
    .min(48),
});

const bilingual = z.object({ fr: z.string(), ar: z.string() });

/** Bloc de modèle : même forme que DossierBlock, mais bilingue. */
const templateBlockSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('heading'),
    level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    text: bilingual,
  }),
  z.object({ type: z.literal('paragraph'), text: bilingual }),
  z.object({ type: z.literal('note'), variant: z.enum(['info', 'warning']), text: bilingual }),
  z.object({ type: z.literal('list'), ordered: z.boolean(), items: z.array(bilingual) }),
  z.object({
    type: z.literal('kv'),
    rows: z.array(z.object({ key: bilingual, value: bilingual })),
  }),
  z.object({
    type: z.literal('table'),
    columns: z.array(
      z.object({ key: z.string(), label: bilingual, numeric: z.boolean().optional() }),
    ),
    rows: z.array(z.record(z.string(), z.union([z.string(), z.number()]))),
  }),
]);

export const templatesFileSchema = z.object({
  schema: z.literal(1),
  note: z.string().optional(),
  templates: z
    .array(
      z.object({
        id: z.string().regex(/^[a-z0-9_]+$/),
        kind: dossierKindSchema,
        title: bilingual,
        description: bilingual,
        blocks: z.array(templateBlockSchema).min(1),
      }),
    )
    .min(1),
});

export type TemplateDefinition = z.infer<typeof templatesFileSchema>['templates'][number];
export type TemplateBlock = z.infer<typeof templateBlockSchema>;

export type Guardrail = z.infer<typeof guardrailsFileSchema>['guardrails'][number];
export type Tool = z.infer<typeof toolsFileSchema>['tools'][number];
export type Wilaya = z.infer<typeof wilayasFileSchema>['wilayas'][number];
