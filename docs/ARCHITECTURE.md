# Agricole DZ 360 — Architecture

> Document de cadrage écrit en phase 0, **tenu à jour à chaque phase**. Les sept phases sont
> terminées ; les choix qui ont changé en chemin sont consignés dans le journal des décisions de
> [`CLAUDE.md`](../CLAUDE.md) §5, qui fait foi en cas d'écart.
> Dernière mise à jour : 2026-11-18.

---

## 1. Décisions déjà prises (vos réponses)

| Sujet | Décision | Conséquence technique |
|---|---|---|
| Emplacement du code | **`apps/agri28/`** dans `abdoualger1648-del/AgroBest`, branche `claude/28-days-ai-agriculture-3ga039` | monorepo npm workspaces ; `CLAUDE.md` et `docs/` restent à la racine, la plateforme Winbest pourra vivre à côté |
| Usage | PWA installée sur téléphone | Mobile-first strict, hors ligne complet, poids surveillé |
| Chiffres algériens | **Prix précis quand une source fiable existe**, sinon fourchette ; source + date de relevé dans chaque leçon ; mention « à vérifier localement » sur les doses, traitements, règlements et aides | Champ `sources[]` obligatoire dans le JSON de leçon + fichier `content/sources.json` ; test qui refuse une leçon citant un prix sans source datée |
| Rythme | **Libre** : dès qu'un jour est validé, le suivant s'ouvre | Verrouillage = « jour N−1 validé », pas de contrainte de date. La série (streak) reste affichée mais devient informative, jamais bloquante |
| Déploiement | GitHub Pages | `base` Vite = `/AgroBest/` en production, scope du service worker identique, `404.html` = copie de `index.html` pour les liens profonds |

### Décisions techniques que je prends (dites-moi si vous n'êtes pas d'accord)

1. **React 19 + TypeScript strict + Vite 7**, conformément à la mission.
2. **Tailwind CSS v4** avec une couche de jetons (variables CSS) pour le thème clair/sombre, et **uniquement des utilitaires logiques** (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`, `text-start`) → le RTL devient automatique.
3. **Dexie 4** au-dessus d'IndexedDB (tables typées, versions/migrations intégrées), derrière une couche « repository » : le reste du code ne connaît jamais IndexedDB.
4. **Zustand** pour l'état d'interface (jour en cours, minuteur, langue, thème), hydraté depuis Dexie. Pas de Redux.
5. **i18next + react-i18next** pour les libellés d'interface ; le **contenu pédagogique passe par un pipeline séparé** (fichiers `content/`), jamais par i18next.
6. **Zod** pour valider le contenu (leçons, modèles) et les imports/exports de données. Un test échoue si une leçon est mal formée ou si AR et FR ne correspondent pas.
7. **react-router v7** en mode déclaratif, `basename = import.meta.env.BASE_URL`.
8. **Tests** : Vitest + Testing Library + `fake-indexeddb` (unitaires et composants), Playwright (bout en bout, hors ligne, RTL). Playwright et Chromium sont déjà installés dans cet environnement.
9. **Pas de backend, pas de télémétrie, aucune donnée qui quitte le téléphone** en v1. C'est aussi un argument pédagogique (leçon « confidentialité »).

### Points que je dois vous soumettre avant la Phase 3 (contenu)

- **Chiffres en arabe** : chiffres occidentaux (`1 500 DA`) ou chiffres arabo-indiens (`١٥٠٠`) ? Je recommande les **chiffres occidentaux** (`numberingSystem: 'latn'`), usage courant en Algérie pour les prix et les factures.
- **Tutoiement ou vouvoiement** en français, et registre en arabe (arabe standard moderne simple, ou tournures dialectales algériennes pour les exemples de terrain) ? Je recommande : **vouvoiement en FR**, **arabe standard simple en AR** avec quelques termes locaux entre parenthèses (fellah, carte de fellah…).
- **Nom public de l'application** (affiché, et nom de la PWA). Proposition : *« 28 يوم / 28 jours — Mon projet agricole avec l'IA »*.

---

## 2. Architecture générale

```
┌─────────────────────────────────────────────────────────────┐
│  Interface (React 19)                                        │
│  Écrans : Accueil · Onboarding · Mon projet · Jour N ·        │
│           Dossier · Carnet · Modèles · Badges · Paramètres   │
├─────────────────────────────────────────────────────────────┤
│  Couche domaine (TypeScript pur, testable sans DOM)          │
│  parcours (déverrouillage, validation) · minuteur ·          │
│  série · quiz · variables de prompt · construction dossier   │
├──────────────────────┬──────────────────────────────────────┤
│  Contenu (lecture)   │  Données utilisateur (lecture/écriture)│
│  content/*.json      │  Dexie / IndexedDB                    │
│  chargé à la demande │  profil · projet · progression ·      │
│  validé par Zod      │  dossier · carnet · badges            │
├──────────────────────┴──────────────────────────────────────┤
│  Exports à la demande (chargés seulement quand on exporte)   │
│  docx · exceljs · pdf-lib                                    │
├─────────────────────────────────────────────────────────────┤
│  PWA : service worker Workbox, précache coque + semaine 1     │
└─────────────────────────────────────────────────────────────┘
```

Principe directeur : **le contenu est une donnée, pas du code**. Ajouter un jour ou corriger un prix = modifier un fichier JSON, sans toucher à React.

---

## 3. Arborescence

État réel après la phase 1 ; les dossiers marqués *(phase N)* n'existent pas encore.

```
/                                  ← racine du dépôt (monorepo npm workspaces)
├── CLAUDE.md                      # stack, conventions, décisions, journal des phases
├── package.json                   # workspaces + scripts relayés vers l'application
├── .github/workflows/ci.yml       # types · lint · format · contenu · tests · build · e2e
├── docs/
│   ├── ARCHITECTURE.md            # ce document
│   ├── lesson-schema.md
│   └── examples/day-01.fr.sample.json
│
└── apps/agri28/
    ├── index.html                 # pose thème/langue/direction avant le premier rendu
    ├── vite.config.ts             # base, PWA, alias @/, configuration Vitest
    ├── tsconfig.json              # strict + noUncheckedIndexedAccess
    ├── eslint.config.js           # analyse typée ; Dexie interdit hors de src/db/
    ├── playwright.config.ts       # e2e sur le build, base /AgroBest/, profil mobile
    ├── vitest.setup.ts            # jest-dom, fake-indexeddb, matchMedia
    │
    ├── content/                   # ← CONTENU PÉDAGOGIQUE (hors du code)
    │   ├── guardrails.json        # 8 garde-fous, FR + AR
    │   ├── days/day-01.{fr,ar}.json  # jour 1 (BROUILLON, relu en phase 3)
    │   ├── templates/templates.json  # 5 modèles vierges, bilingues
    │   ├── tools.json             # outils IA : gratuité, disponibilité en Algérie, date de vérif.
    │   ├── wilayas.json           # 69 wilayas (loi 26-06, JO n° 25 du 5 avril 2026)
    │   └── sources.json           # sources consultées, datées, avec niveau de confiance
    │
    ├── scripts/
    │   ├── validate-content.ts    # Zod (mêmes schémas que l'app) + parité AR/FR + prix sans source
    │   └── generate-icons.mjs     # icônes PWA rendues par Chromium
    │
    ├── public/
    │   ├── favicon.svg
    │   └── icons/                 # 192, 512, maskable 512, apple-touch 180
    │
    ├── e2e/smoke.spec.ts          # 6 tests : navigation, RTL, thème, lien profond, PWA
    │
    └── src/
        ├── main.tsx               # profil → langue/thème → i18n → rendu
        ├── App.tsx                # routes
        ├── components/            # AppShell, BottomNav, Button, Card, Icon, ComingSoon…
        ├── routes/                # HomePage, MorePage, SettingsPage, Placeholder, NotFound
        ├── lib/                   # lang, appearance (thème + direction), format (Intl)
        ├── store/preferences.ts   # Zustand, hydraté depuis IndexedDB
        ├── db/                    # Dexie + repositories (seul endroit qui connaît Dexie)
        ├── i18n/                  # init + locales/{fr,ar}/{common,nav,home,settings,screens}
        ├── pwa/                   # mise à jour du service worker (+ stub de test)
        ├── styles/index.css       # jetons de couleur, thème clair/sombre, base
        ├── test/                  # garde-fou RTL, utilitaire de rendu
        │
        ├── domain/                # logique pure : course, streak, quiz, prompt, timer, dossier
        ├── content/               # schémas Zod, chargeur à la demande, catalogues, markdown
        ├── hooks/                 # useTimer (cadence le minuteur du domaine)
        └── export/                # model (pur) · docx · xlsx · certificate · calendar (.ics)
```

## 4. Modèle de données (IndexedDB via Dexie)

Base `agri28`, version 1. Tous les identifiants sont des `uuid` v4 sauf indication.

### `profile` (une seule ligne, `id = 1`)
```ts
{
  id: 1,
  lang: 'fr' | 'ar',
  theme: 'light' | 'dark' | 'system',
  reminderTime: string | null,        // 'HH:mm'
  reminderEnabled: boolean,
  onboardingDone: boolean,
  createdAt: number, updatedAt: number,
  schemaVersion: number
}
```

### `projects` — le fil rouge « Mon projet »
```ts
{
  id: string,
  name: string,
  type: 'ovin' | 'bovin' | 'avicole' | 'maraichage' | 'serre'
      | 'cereales' | 'arboriculture' | 'apiculture' | 'autre',
  typeOther?: string,
  scale: {                            // superficie OU taille de cheptel selon le type
    value: number,
    unit: 'ha' | 'm2' | 'tete' | 'ruche' | 'sujet'
  },
  wilayaCode: string,                 // '16', '31'… (cf. content/wilayas.json)
  commune?: string,
  objective: string,                  // texte libre, jour 1
  horizonMonths: number,              // défaut 12
  budgetCeilingDA?: number,
  waterSource?: 'forage' | 'reseau' | 'pluvial' | 'bassin' | 'autre' | 'inconnu',
  startMonth?: number,                // 1-12, utile au calendrier cultural
  createdAt: number, updatedAt: number
}
```
> v1 : un seul projet actif, mais le modèle en accepte plusieurs (utile plus tard : plusieurs parcelles, plusieurs ateliers).

### `progress` — un enregistrement par jour et par projet
```ts
{
  id: string,                         // `${projectId}:${day}`
  projectId: string,
  day: number,                        // 1..28
  week: number,                       // 1..4
  status: 'locked' | 'available' | 'in_progress' | 'done',
  startedAt?: number, completedAt?: number,
  timeSpentSec: number,
  sectionsDone: { concept: boolean, practice: boolean, quiz: boolean, review: boolean },
  quiz?: { answers: Record<string, string>, score: number, total: number, attempts: number },
  confidence?: 1 | 2 | 3 | 4 | 5,
  captures: Record<string, string>,   // réponses saisies pendant la pratique
  note?: string
}
```
**Règle de déverrouillage (mode libre)** : `day 1` toujours disponible ; `day N` disponible dès que `day N−1` est `done`. Un bouton « rattraper » n'est donc plus nécessaire pour avancer ; il reste une action **« ouvrir quand même »** (déverrouillage manuel, tracé dans `events`) pour ceux qui veulent sauter un jour, car bloquer un adulte sur un contenu qu'il connaît déjà est contre-productif.

### `stats` (une ligne, dérivable mais mise en cache)
```ts
{ id: 1, currentStreakDays: number, bestStreakDays: number, lastActiveDate: string /* YYYY-MM-DD */, daysDone: number }
```

### `dossierItems` — les briques du Dossier de projet
```ts
{
  id: string, projectId: string,
  day: number,                        // jour qui a produit la brique
  kind: 'fiche_projet' | 'objectifs' | 'budget' | 'calendrier' | 'risques'
      | 'equipe' | 'achats' | 'suivi' | 'rapport' | 'libre',
  title: string,
  lang: 'fr' | 'ar',
  blocks: DossierBlock[],             // représentation neutre, voir ci-dessous
  sourceLessonId: string,
  pinned: boolean,
  createdAt: number, updatedAt: number, version: number
}
```
```ts
type DossierBlock =
  | { type: 'heading';   level: 1|2|3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list';      ordered: boolean; items: string[] }
  | { type: 'kv';        rows: { key: string; value: string }[] }
  | { type: 'table';     columns: { key: string; label: string; numeric?: boolean }[];
                         rows: Record<string, string | number>[]; totalsRow?: boolean }
  | { type: 'note';      variant: 'info' | 'warning'; text: string }   // garde-fous
```
> **Pourquoi cette représentation neutre** : un seul format alimente trois sorties — l'affichage React, le `.docx` et le `.xlsx`. Les `table` deviennent des feuilles Excel, tout le reste devient des paragraphes Word. Aucune duplication de mise en forme.

### `promptEntries` — carnet de prompts agricoles
```ts
{
  id: string, projectId: string,
  day?: number, templateId?: string,
  title: string, lang: 'fr' | 'ar',
  text: string,                       // prompt final, avec les variables déjà remplacées, éditable
  tool: 'claude' | 'chatgpt' | 'gemini' | 'notebooklm' | 'autre',
  tags: string[],                     // 'budget', 'sanitaire', 'irrigation'…
  resultNote?: string,                // ce que l'IA a répondu / ce que j'en retiens
  rating?: 1|2|3|4|5, favorite: boolean,
  createdAt: number, updatedAt: number
}
```
Recherche : index Dexie sur `title`, `tags`, `day` + filtre plein texte en mémoire (le volume reste petit).

### `badges`
```ts
{ id: 'week-1' | 'week-2' | 'week-3' | 'week-4' | 'final', earnedAt: number, meta?: Record<string, unknown> }
```

### `events` — journal léger (debug, export, déverrouillages manuels)
```ts
{ id: string, ts: number, type: string, payload?: unknown }   // limité à ~500 entrées
```

### `kv` — divers
`{ key: string, value: unknown }` : état du minuteur pour reprise après fermeture, version de contenu vue, dernier écran, etc.

### Sauvegarde / restauration
```json
{ "app": "agri28", "schemaVersion": 1, "exportedAt": "2026-11-17T…Z",
  "profile": {…}, "projects": [...], "progress": [...], "stats": {…},
  "dossierItems": [...], "promptEntries": [...], "badges": [...] }
```
Validé par Zod à l'import, avec fonctions de migration par version. Import = **remplacer** ou **fusionner** (choix explicite, aperçu avant écriture).

---

## 5. Schéma JSON d'une leçon

Détaillé et commenté dans [`docs/lesson-schema.md`](./lesson-schema.md), exemple complet dans [`docs/examples/day-01.fr.sample.json`](./examples/day-01.fr.sample.json).

Structure résumée :

```jsonc
{
  "schema": 1,
  "id": "day-01", "day": 1, "week": 1, "lang": "fr",
  "title": "…", "subtitle": "…", "durationMin": 15,
  "objectives": ["…"],
  "tools": ["claude", "chatgpt", "gemini"],       // identifiants de content/tools.json
  "requiresProject": false,                       // le jour 1 crée le projet
  "produces": { "dossierKind": "fiche_projet", "label": "Fiche projet (v1)" },
  "guardrails": ["ai_not_agronomist", "verify_prices"],   // identifiants de content/guardrails.json
  "sections": {
    "concept":  { "durationMin": 3, "body": [ /* blocs */ ], "keyPoints": ["…"] },
    "practice": { "durationMin": 7, "intro": [ /* blocs */ ],
                  "steps": [ { "id": "s1", "instruction": "…",
                               "prompt": { "id": "p1", "tool": "claude",
                                           "template": "… {{project.type}} … {{project.scale}} … {{project.wilaya}} …" },
                               "capture": { "id": "c1", "type": "textarea", "label": "…",
                                            "dossier": { "block": "paragraph" } } } ] },
    "quiz":     { "durationMin": 3, "questions": [ { "id": "q1", "text": "…",
                                                     "choices": [ { "id": "a", "text": "…" } ],
                                                     "answer": "b", "explanation": "…" } ] },
    "review":   { "durationMin": 2, "checklist": ["…"],
                  "confidencePrompt": "…", "dossierPreview": true }
  },
  "sources": [ { "label": "…", "url": "https://…", "checkedOn": "2026-11-17" } ],
  "verifyLocally": ["…"]                          // avertissements propres à cette leçon
}
```

Règles tenues par la validation automatique :
- `day` ∈ 1..28, `week = ceil(day/7)`, `id = day-NN` cohérent avec le nom de fichier ;
- somme des `durationMin` des sections = 15 ;
- quiz : exactement 3 questions, 3 ou 4 choix, une bonne réponse, une explication non vide ;
- chaque variable `{{…}}` d'un prompt existe dans le contexte projet ;
- chaque `tools[]` et `guardrails[]` existe dans le catalogue ;
- **toute leçon contenant un montant en DA ou une référence réglementaire doit avoir au moins une entrée `sources[]` datée** ;
- parité AR/FR : mêmes `id` de sections, d'étapes, de questions et de captures.

---

## 6. Stratégie i18n et RTL

**Deux circuits séparés.**
1. *Libellés d'interface* → i18next, `src/i18n/locales/<lang>/<namespace>.json`. Clés plates et explicites (`day.timer.start`), jamais de phrase concaténée.
2. *Contenu pédagogique* → `content/days/day-NN.<lang>.json`, chargé par `import()` dynamique. Un jour manquant dans une langue n'empêche pas l'application de fonctionner : message explicite + proposition de lire l'autre langue.

**Direction du texte.**
- Un `DirectionProvider` pose `lang` et `dir` sur `<html>` ; la valeur vient du profil (IndexedDB), avec la langue de l'appareil comme présélection au premier lancement (écran de choix de langue avant tout le reste).
- **Aucune propriété physique en CSS** : uniquement `margin-inline`, `padding-inline`, `inset-inline`, `text-align: start/end`, et les utilitaires logiques Tailwind (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`). Une règle ESLint/stylelint refuse `margin-left`, `left:`, `text-align: right` dans `src/`.
- Icônes directionnelles (flèches « suivant », chevrons, barre de progression) : miroir automatique via `[dir="rtl"] .mirror { transform: scaleX(-1) }`, et flèches choisies par direction logique.
- Nombres, dates, monnaie : helpers `formatNumber`, `formatDA`, `formatDate` basés sur `Intl` avec locales `fr-DZ` / `ar-DZ`, système de numération `latn` (à confirmer, cf. §1).
- Polices auto-hébergées, sous-ensemblées, en woff2 : **Noto Sans Arabic** (AR) et **Inter** (FR), `font-display: swap`, préchargement de la police de la langue active seulement. Budget : ≤ 120 Ko par langue.
- Tests : un test Playwright par écran clé en `ar` vérifie `dir="rtl"`, l'absence de débordement horizontal et le miroir des commandes ; captures d'écran de référence.

**Exports et RTL.**
- `.docx` (bibliothèque `docx`) : paragraphes avec `bidirectional: true`, runs avec `rightToLeft: true`, alignement `end`, police de script complexe déclarée. *À valider dès l'installation en lisant les types du paquet, puis par ouverture réelle du fichier.*
- `.xlsx` (`exceljs`) : `worksheet.views = [{ rightToLeft: true }]` — option documentée dans le README d'ExcelJS.
- `.pdf` (certificat) : **pas de texte PDF natif en arabe**. Les bibliothèques JS (pdf-lib, jsPDF) ne lient pas les lettres arabes. Je dessine donc le certificat sur un `<canvas>` (le navigateur, lui, lie correctement les lettres), j'exporte en PNG haute résolution, puis j'intègre l'image dans un PDF A4 paysage avec `pdf-lib`. Compromis assumé : le texte du certificat n'est pas sélectionnable.

---

## 7. Écrans et routes

| Route | Écran | Contenu |
|---|---|---|
| `/` | Accueil | jour en cours, progression 0→28, semaine, série, état du Dossier, bouton « Commencer les 15 minutes » |
| `/bienvenue` | Onboarding | choix de la langue, thème, création du projet (si pas encore fait) |
| `/projet` | Mon projet | fiche modifiable, utilisée pour pré-remplir tous les prompts |
| `/jour/:day` | Journée | minuteur 15 min visible, 4 étapes (Concept · Pratique · Quiz · Bilan), validation finale |
| `/dossier` | Dossier de projet | briques par thème, aperçu, export `.docx` / `.xlsx` |
| `/carnet` | Carnet de prompts | liste, recherche, édition, favoris, export |
| `/modeles` | Bibliothèque de modèles | fiche projet, budget, calendrier, registre des risques, rapport mensuel |
| `/badges` | Badges & certificat | 4 badges de semaine + certificat PDF |
| `/parametres` | Paramètres | langue, thème, heure de rappel, export/import, réinitialisation |

Navigation basse à 4 entrées (Accueil · Jour · Dossier · Plus) : gros boutons, atteignable au pouce.

---

## 8. Rappel quotidien — contrainte réelle, à décider en Phase 5

Sans backend, **il n'existe pas de notification programmée fiable sur le web**. Ce que je prévois, du plus fiable au moins fiable :
1. **Fichier `.ics` téléchargeable** (« ajouter le rappel à mon agenda ») : fonctionne sur tous les téléphones, hors ligne, c'est l'agenda du système qui sonne. Repli le plus solide.
2. **Periodic Background Sync** (Chrome/Android, PWA installée) : vérification quotidienne, notification si le jour n'est pas fait. Horaire approximatif, non garanti par la norme.
3. **Notification à l'ouverture** de l'application si le jour du quotidien n'est pas validé.

Je ne promettrai pas dans l'interface une notification à l'heure exacte si la plateforme ne la garantit pas : le texte des paramètres dira ce qui est réellement possible sur l'appareil détecté.

---

## 9. Qualité, accessibilité, performance

- **Accessibilité** : contraste AA, cibles tactiles ≥ 44 px, focus visible, libellés ARIA, `prefers-reduced-motion`, tailles en `rem` (respect du réglage système), navigation clavier complète, pas d'information portée par la seule couleur.
- **Budget performance** : JS initial ≤ 180 Ko gzip ; un jour de contenu ≤ 25 Ko ; bibliothèques d'export chargées **uniquement** au moment de l'export ; LCP < 2,5 s en 3G ; application entièrement utilisable hors ligne après la première visite.
- **Tests** : logique de domaine 100 % couverte, validation du contenu en CI, parcours bout en bout « jour 1 → validation → brique dans le dossier », test hors ligne (`setOffline(true)`), test RTL.

### Mesures de la phase 6

Les trois exigences ci-dessus ne sont plus déclaratives : chacune a sa mesure, qui tourne en CI.

| Exigence | Mesure | Résultat |
|---|---|---|
| Contraste AA | `src/styles/tokens.test.ts` lit le vrai `index.css`, en extrait les jetons des deux thèmes et calcule le rapport WCAG de 14 paires | 31 assertions ; plus faible rapport mesuré **5,27** pour un minimum exigé de 4,5 |
| Absence de violation WCAG | `e2e/accessibilite.spec.ts` passe axe-core sur 9 écrans en français, 5 en arabe (RTL) et 3 en thème sombre | 0 violation |
| Clavier et cibles tactiles | `e2e/qualite.spec.ts` : premier arrêt de tabulation = lien d'évitement, contour de focus ≥ 2 px, journée entière déroulée au clavier, tout élément interactif ≥ 24 px et actions principales ≥ 44 px | conforme |
| Hors ligne | `e2e/qualite.spec.ts` : une journée complète puis le Dossier **et ses exports** sans réseau | conforme |
| Budget de poids | `npm run check:bundle` mesure sur `dist/` le chargement initial et le pré-cache en gzip, et vérifie que les bibliothèques d'export et les jours 8 à 28 en sont bien absents | initial **155 Ko** (plafond 180), pré-cache **322 Ko** gzip (plafond 400) |

Le plafond « un jour ≤ 25 Ko » est tenu avec une large marge : le plus gros fichier de leçon pèse 3,9 Ko gzip.
- **Garde-fous pédagogiques** : stockés une seule fois dans `content/guardrails.json`, référencés par identifiant, affichés dans un encart visible et repris dans les exports. Texte de base : *l'IA ne remplace ni l'agronome, ni le vétérinaire, ni le juriste, ni le comptable ; toute dose, tout traitement, tout texte réglementaire et tout prix doit être vérifié auprès d'une source locale fiable.*
- **Outils cités** : aucun outil n'entre dans le contenu avant vérification web (nom exact, gratuité, accessibilité depuis l'Algérie). `content/tools.json` conserve la date de vérification et un indicateur `availabilityDZ: 'oui' | 'partielle' | 'incertaine'`. Tout ce qui reste incertain vous sera signalé nommément.

---

## 10. Découpage des phases suivantes

| Phase | Livrable | Sortie attendue |
|---|---|---|
| 1 | Squelette : projet Vite, routage, i18n AR/FR + RTL, thème clair/sombre, PWA installable, écrans vides, tests de base, CI | L'application s'installe sur votre téléphone et fonctionne hors ligne, vide |
| 2 | Moteur de parcours : chargement des leçons, minuteur 15 min, validation, progression, série, verrouillage, profil « Mon projet » | Le jour 1 se déroule de bout en bout avec un contenu de test |
| 3 | Contenu jours 1 à 7, FR + AR, vérifié et sourcé | Vous validez le ton et la qualité avant la suite |
| 4 | Contenu semaines 2, puis 3, puis 4 (un GO entre chaque) | |
| 5 | Dossier de projet, exports `.docx`/`.xlsx`, carnet, badges, certificat, rappels | |
| 6 | Qualité : accessibilité, performance, hors ligne, relecture complète du contenu et des chiffres | Mesures en CI, voir §9 |
| 7 | Déploiement GitHub Pages + README + guide de mise à jour du contenu | `deploy.yml`, [`README.md`](../README.md), [`CONTENU.md`](CONTENU.md) |

Les sept phases sont terminées. Ce découpage est conservé tel qu'il a été proposé, comme trace de
ce qui était prévu avant d'être construit.

---

## 11. Risques identifiés

| Risque | Gravité | Traitement |
|---|---|---|
| Arabe dans le `.docx` mal rendu selon la version de Word | moyenne | `bidirectional` + `rightToLeft` + police de script complexe ; fichier de test ouvert réellement en Phase 5 |
| Liaison des lettres arabes impossible en PDF natif | élevée | contournée par le rendu canvas → PNG → PDF |
| Notification quotidienne non garantie par le navigateur | moyenne | repli `.ics` + message honnête dans les paramètres |
| Prix algériens qui vieillissent | élevée | source + date de relevé par chiffre, avertissement systématique, chiffres regroupés dans peu de fichiers pour faciliter la mise à jour |
| Poids des bibliothèques d'export sur connexion faible | moyenne | chargement à la demande, jamais dans le paquet initial |
| Liens profonds sur GitHub Pages | faible | `404.html` = copie de `index.html` |
| Perte de données (IndexedDB effaçable par le téléphone) | moyenne | export JSON mis en avant, rappel après la semaine 1 |

---

## 12. Vérifications web déjà faites (Phase 0)

| Point | Résultat | Source |
|---|---|---|
| Feuille Excel en RTL | Option `rightToLeft` dans les vues de feuille ExcelJS, défaut `false` | README ExcelJS (miroir socket.dev) |
| RTL dans un `.docx` généré en JS | Les éléments OOXML `w:bidi` (paragraphe) et `w:rtl` (run) portent la direction ; un ticket ouvert sur `dolanmiu/docx` signale que l'alignement à droite n'est pas automatique → il faut poser l'alignement explicitement | GitHub `dolanmiu/docx` #3419, référence OOXML |
| Arabe en PDF côté navigateur | pdf-lib et jsPDF ne lient pas les lettres arabes ; le canvas du navigateur, si | documentation pdf-lib/naqqash, adaptateur `bidi-shaper` |

> `docx.js.org` n'est pas joignable depuis cette session (domaine hors de la liste réseau autorisée). L'API a donc été confirmée **en lisant les types TypeScript du paquet `docx`** présent dans l'environnement : `bidirectional?: boolean` sur les options de paragraphe, `rightToLeft?: boolean` sur celles d'un run, `AlignmentType.START` / `AlignmentType.END` (logiques, donc justes dans les deux directions) et `sizeComplexScript` pour la taille du script complexe. Question tranchée.
