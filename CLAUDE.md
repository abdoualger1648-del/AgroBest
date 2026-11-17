# CLAUDE.md — 28 jours pour gérer mon projet agricole avec l'IA

Document de référence du projet : stack, conventions, structure, décisions.
**À mettre à jour à la fin de chaque phase.**

---

## 1. Produit

Parcours quotidien de **15 minutes pendant 28 jours** qui apprend à des agriculteurs et porteurs de
projets agricoles à utiliser les outils d'IA pour organiser, planifier et piloter leur projet.
Aucun codage demandé à l'utilisateur final.

- **Cible** : exploitants et entrepreneurs agricoles, débutants en IA, sur téléphone, connexion parfois faible.
- **Contexte par défaut** : Algérie (DA, unités locales, Chambre d'agriculture, carte de fellah, aides, aliments subventionnés).
- **Fil rouge** : « Mon projet », créé au jour 1 ; chaque jour ajoute une brique au **Dossier de projet**, exportable en `.docx` / `.xlsx`.
- **Langues** : arabe (RTL) et français en v1, anglais prévu.

Structure d'une journée : Concept 3 min · Pratique guidée 7 min · Quiz 3 min · Bilan 2 min, minuteur visible.

---

## 2. Stack

| Domaine | Choix | Raison |
|---|---|---|
| Build | Vite 8 | rapide, PWA simple |
| UI | React 19.3 + TypeScript 6 strict | demandé par la mission |
| Styles | Tailwind CSS v4 + jetons CSS | utilitaires **logiques** → RTL automatique, thème clair/sombre |
| Routage | react-router v8 (déclaratif) | `basename = import.meta.env.BASE_URL` |
| État | Zustand | léger, hydraté depuis IndexedDB |
| Stockage | Dexie 4 (IndexedDB) | typé, versions/migrations, 100 % local |
| i18n | i18next + react-i18next | namespaces par écran |
| Validation | Zod | contenu, imports/exports |
| PWA | vite-plugin-pwa (Workbox) | installable, hors ligne |
| Exports | `docx`, `exceljs`, `pdf-lib` | chargés **à la demande** uniquement |
| Tests | Vitest 5 + Testing Library + fake-indexeddb ; Playwright (e2e, RTL, chemin de base) | |
| Qualité | ESLint 10 (flat) + Prettier | garde-fou RTL par test, règle anti-import Dexie |
| CI/Déploiement | GitHub Actions → GitHub Pages | `base = '/WinBest/'` en production |

**Aucun backend en v1.** Aucune donnée ne quitte l'appareil. Aucune télémétrie.

---

## 3. Structure

Dépôt en **monorepo npm workspaces** : l'application vit dans `apps/agri28/`,
`CLAUDE.md` et `docs/` restent à la racine (décision D1 révisée).
Voir [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) §3 pour l'arborescence complète.

Règle fondatrice : **le contenu pédagogique vit dans `apps/agri28/content/`, jamais dans `src/`.**
Corriger un prix ou ajouter un jour = éditer un JSON, sans toucher à React.

Chemins ci-dessous relatifs à `apps/agri28/` :

- `src/domain/` : logique pure, sans DOM, testée à 100 % (parcours, minuteur, série, quiz, prompts, dossier).
- `src/db/repositories/` : seul endroit qui connaît Dexie.
- `src/content/` : schémas Zod + chargeur `import()` par jour et par langue.
- `src/export/` : `.docx`, `.xlsx`, certificat PDF — en chunks séparés.
- `content/` : `days/day-NN.<lang>.json`, `templates/`, `tools.json`, `guardrails.json`, `wilayas.json`, `sources.json`.
- `src/lib/` : langue, apparence (thème/direction), formatage `Intl`.
- `src/store/` : état d'interface Zustand, hydraté depuis IndexedDB.

Schéma d'une leçon : [`docs/lesson-schema.md`](docs/lesson-schema.md) · exemple : [`docs/examples/day-01.fr.sample.json`](docs/examples/day-01.fr.sample.json).

---

## 4. Conventions

### Code
- TypeScript `strict`, pas de `any` (sauf frontière de bibliothèque, commentée).
- Composants fonctionnels, un composant par fichier, nom de fichier = nom du composant.
- Pas d'accès direct à Dexie hors `src/db/` ; pas de `fetch` de contenu hors `src/content/`.
- Les textes affichés passent **toujours** par i18next ou par le contenu — aucune chaîne en dur dans le JSX.
- Commits en français, à l'impératif : `feat(parcours): ...`, `content(j03): ...`, `fix(rtl): ...`.

### CSS / RTL — non négociable
- **Interdites** : `margin-left/right`, `padding-left/right`, `left`, `right`, `text-align: left|right`, `float`.
- **Utilisées** : `margin-inline-*`, `padding-inline-*`, `inset-inline-*`, `text-align: start|end`, et les utilitaires Tailwind `ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`, `text-start`, `text-end`.
- `dir` et `lang` posés sur `<html>` par le `DirectionProvider`, valeur issue du profil.
- Icônes directionnelles en miroir via la classe `.mirror`.
- Nombres, dates, monnaie : helpers `formatNumber` / `formatDA` / `formatDate` (`Intl`, locales `fr-DZ` / `ar-DZ`).

### Accessibilité
Contraste AA · cibles tactiles ≥ 44 px · focus visible · libellés ARIA · `prefers-reduced-motion` ·
tailles en `rem` · navigation clavier · jamais d'information portée par la seule couleur.

### Contenu
- Un jour = une idée. La pratique produit toujours quelque chose de concret.
- **Garde-fous obligatoires** dans chaque leçon concernée, au point du risque :
  *l'IA ne remplace ni l'agronome, ni le vétérinaire, ni le juriste, ni le comptable ; toute dose, tout
  traitement, tout texte réglementaire et tout prix se vérifie auprès d'une source locale fiable.*
- **Chiffres algériens** : prix précis quand une source fiable existe (avec `sources[]` daté), sinon fourchette ; toujours la date de relevé. La validation refuse une leçon qui cite un montant en DA sans source datée.
- **Outils IA** : aucun outil n'entre dans le contenu avant vérification web (nom exact, gratuité, accessibilité depuis l'Algérie), consignée dans `content/tools.json` avec `checkedOn` et `availabilityDZ`. Tout doute est signalé à l'utilisateur du projet (vous).
- Parité AR/FR imposée par les tests : mêmes identifiants, même nombre de questions, d'étapes, de captures.

---

## 5. Décisions (journal)

| # | Décision | Date | Motif |
|---|---|---|---|
| D1 | **Révisée** : code dans `apps/agri28/`, monorepo npm workspaces ; `CLAUDE.md` et `docs/` à la racine | 2026-11-17 | choix utilisateur ; laisse la racine libre pour la plateforme Winbest |
| D2 | Déploiement GitHub Pages, `base = '/WinBest/'`, `404.html` = copie de `index.html` | 2026-11-17 | choix utilisateur ; liens profonds SPA |
| D3 | Rythme **libre** : le jour N s'ouvre dès que N−1 est validé, sans attente calendaire | 2026-11-17 | choix utilisateur ; la série reste informative, jamais bloquante |
| D4 | Prix précis quand une source fiable existe, sinon fourchette ; source + date obligatoires | 2026-11-17 | choix utilisateur |
| D5 | Certificat PDF = canvas → PNG → `pdf-lib` | 2026-11-17 | pdf-lib et jsPDF ne lient pas les lettres arabes ; le canvas du navigateur, si. Compromis : texte non sélectionnable |
| D6 | Dexie plutôt qu'`idb` brut ; repositories en façade | 2026-11-17 | migrations et typage, testabilité |
| D7 | Représentation neutre `DossierBlock` partagée par l'affichage, le `.docx` et le `.xlsx` | 2026-11-17 | une seule source de mise en forme |
| D8 | Rappel quotidien : `.ics` d'abord, Periodic Background Sync si disponible, notification à l'ouverture en dernier recours | 2026-11-17 | le web ne garantit pas de notification programmée sans backend |
| D9 | Tailwind v4 avec utilitaires logiques uniquement | 2026-11-17 | RTL sans feuille de style miroir |
| D10 | TypeScript **6.0.3** et non 7.0 | 2026-11-17 | `typescript-eslint` exige `typescript <6.1.0` ; TS 7 casserait l'analyse typée. À repasser en 7 quand typescript-eslint le prendra en charge |
| D11 | Polices **système** (pile arabe : Noto Sans Arabic, Geeza Pro, Tahoma…), pas de woff2 auto-hébergé en v1 | 2026-11-17 | zéro octet à télécharger, rendu correct hors ligne dès la première visite ; à réévaluer en phase 6 si le rendu arabe déçoit sur certains téléphones |
| D12 | Chiffres **occidentaux** dans les deux langues (`-u-nu-latn`) ; séparateurs selon CLDR (fr-DZ : espace, ar-DZ : point) | 2026-11-17 | usage algérien courant pour les prix et les factures. **À confirmer par l'utilisateur du projet** |
| D13 | Le chemin de base Vite dépend du `mode`, pas de la `command` | 2026-11-17 | sinon `vite preview` sert `/` alors que GitHub Pages sert `/WinBest/` — bug attrapé par les tests e2e |
| D14 | Manifeste PWA statique en français | 2026-11-17 | un manifeste ne porte qu'une langue ; nom localisé à étudier en phase 7 |
| D15 | Icônes PNG générées par Chromium (`npm run icons`) à partir du même dessin que `favicon.svg` | 2026-11-17 | aucune dépendance d'image native, rendu identique au navigateur |
| D16 | Cache de peinture `localStorage` (`agri28.theme`, `agri28.lang`) lu par un script en ligne dans `index.html` | 2026-11-17 | évite le clignotement de thème et de direction au démarrage ; IndexedDB reste la source de vérité |

### Questions ouvertes
- Chiffres occidentaux (`1 500 DA`) ou arabo-indiens (`١٥٠٠`) en arabe ? *(implémenté en occidentaux, décision D12 — à confirmer)*
- Vouvoiement en FR ? Arabe standard simple en AR ? *(recommandation : oui aux deux)*
- Nom public de l'application et de la PWA ? *(provisoire : « 28 jours — Mon projet agricole avec l'IA », abrégé « Agri28 »)*

### Questions tranchées
- ~~API `docx`~~ : **confirmée** en lisant les types du paquet — `bidirectional?: boolean` sur les options de paragraphe, `rightToLeft?: boolean` sur celles d'un run, `AlignmentType.START/END` logiques, `sizeComplexScript` pour la taille en script complexe.

---

## 6. Commandes (à partir de la Phase 1)

Depuis la **racine du dépôt** (les scripts sont relayés vers `apps/agri28`) :

```bash
npm install
npm run dev              # serveur de développement (base /)
npm run build            # build de production (base /WinBest/)
npm run preview          # sert le build sur http://127.0.0.1:4173/WinBest/
npm run typecheck        # tsc --noEmit
npm run lint             # ESLint (analyse typée)
npm run test             # Vitest
npm run test:e2e         # Playwright, build + preview automatiques
npm run validate:content # garde-fous ; schéma complet des leçons à la phase 3
npm run verify           # typecheck + lint + contenu + tests, en une commande
```

Dans `apps/agri28` uniquement : `npm run icons` (régénère les icônes PWA),
`npm run format` / `npm run format:check`.

---

## 7. Avancement des phases

| Phase | Objet | État |
|---|---|---|
| 0 | Cadrage : architecture, modèle de données, arborescence, schéma de leçon, stratégie RTL/i18n | terminée |
| 1 | Squelette : routage, i18n AR/FR + RTL, thème, PWA, écrans vides, tests de base | **terminée — en attente de GO** |
| 2 | Moteur de parcours : leçons, minuteur, validation, progression, série, verrouillage, profil projet | à faire |
| 3 | Contenu semaine 1 (jours 1-7), FR + AR | à faire |
| 4 | Contenu semaines 2, 3, 4 (un GO entre chaque) | à faire |
| 5 | Dossier de projet, exports `.docx`/`.xlsx`, carnet, badges, certificat, rappels | à faire |
| 6 | Qualité : accessibilité, performance, hors ligne, relecture du contenu et des chiffres | à faire |
| 7 | Déploiement et documentation | à faire |

### Méthode de travail imposée
Une phase à la fois. À la fin de chaque phase : résumé, tests, commit, puis **arrêt et attente d'un GO explicite**.
Ne jamais casser une fonctionnalité existante : tests avant et après chaque phase.
Toute décision qui appartient à l'utilisateur du projet est posée en question, jamais devinée.
