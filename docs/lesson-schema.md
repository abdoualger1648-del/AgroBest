# Schéma d'une leçon — `content/days/day-NN.<lang>.json`

> Version du schéma : **1**. Toute évolution incrémente `schema` et ajoute une migration dans `src/content/schema.ts`.

Un fichier = **un jour** × **une langue**. Les deux langues partagent la même ossature : mêmes identifiants de sections, d'étapes, de captures et de questions. C'est cette parité que le test de contenu vérifie.

---

## 1. Types (lus comme des schémas Zod)

```ts
// ——— blocs de prose réutilisables ———
type Block =
  | { type: 'p';     text: Md }                                  // paragraphe
  | { type: 'ul';    items: Md[] }                               // liste à puces
  | { type: 'ol';    items: Md[] }                               // liste numérotée
  | { type: 'quote'; text: Md }
  | { type: 'note';  variant: 'info' | 'warning' | 'danger'; text: Md }
  | { type: 'example'; label?: Md; text: Md }                    // cas concret de terrain
  | { type: 'table'; columns: Md[]; rows: Md[][] };

// Md = chaîne en Markdown restreint : **gras**, *italique*, `code`,
// [lien](https://…), retours à la ligne. Aucun HTML brut (rendu par src/content/markdown.ts).

// ——— prompt prêt à copier ———
type Prompt = {
  id: string;                     // unique dans le jour, stable entre AR et FR
  title: Md;
  tool: ToolId;                   // doit exister dans content/tools.json
  template: string;               // contient des variables {{project.*}}
  hint?: Md;                      // « collez la réponse dans le champ ci-dessous »
  followUps?: string[];           // relances prêtes à copier
};

// ——— saisie de l'utilisateur, qui alimente le Dossier ———
type Capture = {
  id: string;
  type: 'textarea' | 'text' | 'number' | 'select' | 'checklist';
  label: Md;
  placeholder?: Md;
  required?: boolean;             // défaut false : on ne bloque jamais la validation du jour
  options?: { value: string; label: Md }[];   // pour select / checklist
  unit?: string;                  // 'DA', 'ha', 'têtes'…
  dossier?: {                     // comment cette saisie entre dans le Dossier
    kind: DossierKind;
    block: 'paragraph' | 'list' | 'kv' | 'table';
    key?: Md;                     // libellé si block = 'kv'
  };
};

type Step = {
  id: string;
  instruction: Md;
  prompt?: Prompt;
  capture?: Capture;
  optional?: boolean;
};

type Question = {
  id: string;
  text: Md;
  choices: { id: string; text: Md }[];   // 3 ou 4 choix
  answer: string;                        // id du bon choix
  explanation: Md;                       // affichée après réponse, bonne ou mauvaise
};

// ——— le fichier complet ———
type Lesson = {
  schema: 1;
  id: `day-${string}`;            // 'day-01' … 'day-28', cohérent avec le nom de fichier
  day: number;                    // 1..28
  week: 1 | 2 | 3 | 4;            // = ceil(day / 7)
  lang: 'fr' | 'ar';
  title: Md;
  subtitle: Md;                   // une phrase : à quoi sert ce jour
  durationMin: 15;
  objectives: Md[];               // 2 à 4, formulés « je serai capable de… »
  tools: ToolId[];                // outils utilisés ce jour
  requiresProject: boolean;       // false seulement au jour 1
  produces?: { dossierKind: DossierKind; label: Md };   // brique ajoutée au Dossier
  guardrails: GuardrailId[];      // identifiants de content/guardrails.json
  sections: {
    concept:  { durationMin: 3; body: Block[]; keyPoints: Md[] };
    practice: { durationMin: 7; intro?: Block[]; steps: Step[] };
    quiz:     { durationMin: 3; questions: Question[] };        // exactement 3
    review:   { durationMin: 2; checklist: Md[]; confidencePrompt: Md; dossierPreview: boolean };
  };
  sources?: { label: Md; url: string; checkedOn: string }[];    // 'YYYY-MM-DD'
  verifyLocally?: Md[];           // avertissements propres à ce jour
  nextTeaser?: Md;                // « demain : … »
};
```

---

## 2. Variables de prompt disponibles

Résolues par `src/domain/prompt.ts` à partir du projet actif. Une variable inconnue est remplacée par un marqueur visible `[à compléter : …]`, jamais par du vide.

| Variable | Exemple rendu (FR) | Exemple rendu (AR) |
|---|---|---|
| `{{project.name}}` | Élevage ovin Aïn Defla | تربية الأغنام عين الدفلى |
| `{{project.type}}` | élevage ovin | تربية الأغنام |
| `{{project.scale}}` | 60 têtes | 60 رأسًا |
| `{{project.area}}` | 4 ha | 4 هكتار |
| `{{project.wilaya}}` | Aïn Defla | عين الدفلى |
| `{{project.commune}}` | — | — |
| `{{project.objective}}` | vendre 40 agneaux en 12 mois | … |
| `{{project.horizonMonths}}` | 12 | 12 |
| `{{project.budgetCeiling}}` | 1 200 000 DA | 1 200 000 د.ج |
| `{{project.waterSource}}` | forage | بئر |
| `{{project.startMonth}}` | mars | مارس |
| `{{today}}` | 17 novembre 2026 | 17 نوفمبر 2026 |
| `{{lang}}` | français | العربية |

Convention : les prompts se terminent toujours par une consigne de prudence adaptée au sujet, par exemple *« Si une information dépend de la réglementation algérienne ou d'un prix local, dis-le clairement et demande-moi de vérifier. »*

---

## 3. Règles vérifiées automatiquement (`scripts/validate-content.ts`)

1. `id`, `day`, `week` cohérents entre eux et avec le nom de fichier ; `lang` = suffixe du fichier.
2. `concept.durationMin + practice.durationMin + quiz.durationMin + review.durationMin === 15`.
3. `quiz.questions.length === 3` ; 3 ou 4 choix ; `answer` présent parmi les `choices` ; `explanation` non vide.
4. `objectives.length` entre 2 et 4.
5. Chaque `tools[]` existe dans `content/tools.json` avec une date de vérification de moins de 6 mois.
6. Chaque `guardrails[]` existe dans `content/guardrails.json`.
7. Toute variable `{{…}}` d'un `template` appartient à la liste du §2.
8. Les identifiants (`steps[].id`, `capture.id`, `prompt.id`, `questions[].id`) sont uniques dans le fichier.
9. **Parité AR/FR** : même ensemble d'identifiants, même nombre de questions, de choix, d'étapes et de captures ; mêmes `tools`, `guardrails`, `produces.dossierKind`.
10. **Chiffres et droit** : si le texte contient un montant (`DA`, `DZD`, `دج`, `د.ج`) **ou** la référence à un texte réglementaire précis (« loi n° », décret, arrêté, *Journal officiel*, « article 7 »), le fichier doit contenir au moins une entrée `sources[]` datée. Sinon la validation échoue.
    *Nommer une institution ne déclenche rien* : « demandez à la Chambre d'agriculture » est une consigne de vérification, pas une affirmation à sourcer.
11. Aucun lien `http://` (HTTPS uniquement) ; aucune URL raccourcie.
12. Markdown restreint : aucune balise HTML, aucune image distante.

---

## 4. Conventions de rédaction

- **Un jour = une idée.** Si un jour demande deux concepts, c'est qu'il en faut deux jours.
- **Toujours partir du terrain** : l'exemple ouvre la leçon, la théorie vient après.
- Phrases courtes, pas de jargon informatique non expliqué, aucun terme anglais non traduit sans glose.
- La pratique produit **quelque chose de concret** à chaque fois : un texte, un tableau, une liste. Jamais un exercice sans sortie.
- Les garde-fous sont **dans le flux de la leçon**, à l'endroit où le risque existe, pas dans une page séparée que personne ne lit.
- Les prix sont écrits avec leur date de relevé et une marge : *« gasoil ≈ X DA/l (relevé novembre 2026) — vérifiez le prix du jour chez votre fournisseur »*.
