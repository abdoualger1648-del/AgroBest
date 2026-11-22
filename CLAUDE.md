# CLAUDE.md — Agricole DZ 360

*28 jours pour gérer mon projet agricole avec l'IA.*

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
- **Avant le jour 1** : un **test de niveau** de 8 questions sur 3 axes (aisance IA, maturité du projet, gestion existante) situe l'utilisateur en débutant / intermédiaire / avancé. Le niveau change la **profondeur** de chaque journée, jamais le nombre de jours ni leur ordre.
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
| CI/Déploiement | GitHub Actions → GitHub Pages | `base = '/AgroBest/'` en production |

**Aucune télémétrie, jamais.** Édition `complete` (développement et tests) : aucun backend. Éditions `apk`
et `web` : Firebase sert **uniquement** au compte et à son activation — adresse email, état, dates. Le
projet, les réponses, les prompts et le Dossier restent sur l'appareil (D46, D48).

---

## 3. Structure

Dépôt en **monorepo npm workspaces** : l'application vit dans `apps/agri28/`,
`CLAUDE.md` et `docs/` restent à la racine (décision D1 révisée).
Voir [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) §3 pour l'arborescence complète.

Règle fondatrice : **le contenu pédagogique vit dans `apps/agri28/content/`, jamais dans `src/`.**
Corriger un prix ou ajouter un jour = éditer un JSON, sans toucher à React.

Chemins ci-dessous relatifs à `apps/agri28/` :

- `src/domain/` : logique pure, sans DOM, testée à 100 % (parcours, minuteur, série, quiz, prompts, dossier, droits de compte, niveau de parcours, **gestion des comptes**).
- `src/db/repositories/` : seul endroit qui connaît Dexie.
- `src/content/` : schémas Zod + chargeur `import()` par jour et par langue.
- `src/export/` : modèle neutre (pur, testé), `.docx`, `.xlsx`, certificat PDF, rappel `.ics` — chargés à la demande.
- `content/` : `days/day-NN.<lang>.json`, `templates/templates.json` (5 modèles bilingues), `tools.json`, `guardrails.json`, `wilayas.json`, `sources.json`, `test-niveau.json` (questions du test, **bilingues dans un seul fichier**).
- `src/lib/` : langue, apparence (thème/direction), formatage `Intl`.
- `src/hooks/` : minuteur de séance (la logique reste dans `src/domain/timer.ts`).
- `src/store/` : état d'interface Zustand, hydraté depuis IndexedDB. Le store du parcours porte la
  liste des dossiers et la bascule de l'un à l'autre.
- `src/compte/` : port vers le service de comptes, implémentation Firebase et implémentation en mémoire ;
  seul endroit qui parle à Firebase. `natif.ts` est le seul endroit qui parle au pont Capacitor
  (connexion Google dans l'APK, phase 16). Mise en service : [`firebase/README.md`](firebase/README.md).
- `src/config.ts` : édition du build (`complete`, `apk`, `web`) et adresse de l'administrateur.
- `capacitor.config.ts` + `android/` : empaquetage Android engendré par Capacitor. Le code natif n'est
  ni formaté ni analysé : c'est une sortie de gabarit. Mode d'emploi : [`docs/APK.md`](docs/APK.md).

Schéma d'une leçon : [`docs/lesson-schema.md`](docs/lesson-schema.md) · exemple : [`docs/examples/day-01.fr.sample.json`](docs/examples/day-01.fr.sample.json).
Mettre à jour le contenu sans toucher au code : [`docs/CONTENU.md`](docs/CONTENU.md).
Présentation du projet et déploiement : [`README.md`](README.md).

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

Chacune de ces règles a sa mesure automatique depuis la phase 6 (contraste calculé sur les jetons, audits axe-core
en FR, AR/RTL et thème sombre, clavier, cibles tactiles, hors ligne) : voir
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) §9.

### Contenu
- **Rien n'entre dans `content/` sans vérification.** `tools.json` porte `availabilityDZ` + `checkedOn` ; `sources.json` porte la date de consultation et un niveau de confiance ; `validate:content` avertit pour tout outil non confirmé et tout contenu marqué `draft`.
- Un jour = une idée. La pratique produit toujours quelque chose de concret.
- **Garde-fous obligatoires** dans chaque leçon concernée, au point du risque :
  *l'IA ne remplace ni l'agronome, ni le vétérinaire, ni le juriste, ni le comptable ; toute dose, tout
  traitement, tout texte réglementaire et tout prix se vérifie auprès d'une source locale fiable.*
- **Chiffres algériens** : prix précis quand une source fiable existe (avec `sources[]` daté), sinon fourchette ; toujours la date de relevé. La validation refuse une leçon qui cite un montant en DA sans source datée.
- **Outils IA** : aucun outil n'entre dans le contenu avant vérification web (nom exact, gratuité, accessibilité depuis l'Algérie), consignée dans `content/tools.json` avec `checkedOn` et `availabilityDZ`. Tout doute est signalé à l'utilisateur du projet (vous).
- Parité AR/FR imposée par les tests : mêmes identifiants, même nombre de questions, d'étapes, de captures.
- Pour **créer** un nouveau jour : `apps/agri28/scripts/authoring/` (les deux langues sont écrites côte à côte, la parité est garantie par construction). Pour **corriger** un jour existant : on édite directement son JSON, jamais le générateur.

---

## 5. Décisions (journal)

| # | Décision | Date | Motif |
|---|---|---|---|
| D1 | **Révisée** : code dans `apps/agri28/`, monorepo npm workspaces ; `CLAUDE.md` et `docs/` à la racine | 2026-11-17 | choix utilisateur ; laisse la racine libre pour la plateforme Winbest |
| D2 | Déploiement GitHub Pages, `base = '/AgroBest/'`, `404.html` = copie de `index.html` | 2026-11-17 | choix utilisateur ; liens profonds SPA |
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
| D13 | Le chemin de base Vite dépend du `mode`, pas de la `command` | 2026-11-17 | sinon `vite preview` sert `/` alors que GitHub Pages sert `/AgroBest/` — bug attrapé par les tests e2e |
| D14 | Manifeste PWA statique en français | 2026-11-17 | un manifeste ne porte qu'une langue ; nom localisé à étudier en phase 7 |
| D15 | Icônes PNG générées par Chromium (`npm run icons`) à partir du même dessin que `favicon.svg` | 2026-11-17 | aucune dépendance d'image native, rendu identique au navigateur |
| D16 | Cache de peinture `localStorage` (`agri28.theme`, `agri28.lang`) lu par un script en ligne dans `index.html` | 2026-11-17 | évite le clignotement de thème et de direction au démarrage ; IndexedDB reste la source de vérité |
| D17 | **69 wilayas**, pas 58 | 2026-11-17 | loi 26-06, *Journal officiel* n° 25 du 5 avril 2026 (vérifié : texte du JO + jeu de données MIT concordants). Les wilayas 59 à 69 sont marquées `new2026` et l'application signale que les services agricoles peuvent encore dépendre de la wilaya mère |
| D18 | Écrans chargés à la demande (`React.lazy`), seul l'accueil est dans le paquet initial | 2026-11-17 | le paquet initial passait à 184 Ko gzip ; il est redescendu à **69 Ko** |
| D19 | La série est calculée **dans le store, à l'écriture**, jamais pendant le rendu | 2026-11-17 | `Date.now()` n'est pas pur : React 19 l'interdit en rendu, et un sélecteur Zustand qui recrée un objet fait boucler `useSyncExternalStore` |
| D20 | `validate:content` est en TypeScript, exécuté par `node --experimental-strip-types`, et importe les **mêmes schémas Zod** que l'application | 2026-11-17 | un contenu validé en CI se charge forcément dans l'app : une seule source de vérité |
| D21 | ~~Jour 1 en brouillon~~ — **levé** en phase 3 : les 7 jours sont finalisés, plus aucun `draft` | 2026-11-17 | |
| D22 | **Ton** : français au **vouvoiement**, phrases courtes, vocabulaire de terrain, aucun anglicisme non expliqué. Arabe **standard simple**, avec les mots réellement employés en Algérie (مستثمرة, الغرفة الفلاحية, رزنامة), sans dialecte écrit | 2026-11-17 | l'utilisateur est débutant en IA, pas en agriculture : on ne lui explique jamais son métier, et on ne promet aucun miracle |
| D23 | Nom public **Agricole DZ 360**. Les identifiants internes restent `agri28` (base IndexedDB, clés `localStorage`, nom du paquet) | 2026-11-17 | renommer la base effacerait les données des utilisateurs existants ; le nom public n'a pas à fuiter dans le stockage |
| D25 | **Aucun prix n'est écrit dans le contenu.** L'IA dresse la liste des postes, l'utilisateur relève ses propres prix et les date | 2026-11-18 | aucune source publique fiable et à jour de prix agricoles algériens n'a pu être trouvée ; un prix écrit aujourd'hui serait faux dans six mois. Les circuits (CCLS pour l'orge subventionnée, ONAB pour le son) sont cités sans montant, avec source et avertissement |
| D27 | La règle « texte réglementaire ⇒ source datée » ignore les **phrases négatives** (« ne cite aucun décret ») | 2026-11-18 | faux positif sur le jour 21, dont le prompt interdit justement de citer un texte. La contre-épreuve confirme qu'une affirmation (« le décret n° 23-15 fixe… ») est toujours refusée |
| D31 | Export .docx : **alignement logique** `AlignmentType.START`, jamais `RIGHT` | 2026-11-18 | vérifié sur le XML produit : la bibliothèque `docx` **inverse** un alignement absolu quand `bidirectional` est vrai (`RIGHT` sort en `w:jc=left`), soit l'inverse du résultat voulu en arabe. Un test compare les marqueurs `w:bidi`, `w:rtl`, `bidiVisual` et `w:jc` entre les deux langues |
| D32 | Le service worker ne pré-cache que la **coque + la semaine 1** ; bibliothèques d'export (chunks `export-*`) et jours 8 à 28 sont mis en cache au premier usage | 2026-11-18 | le pré-cache atteignait 2,7 Mo, imposé à la première visite y compris à qui n'exporte jamais ; il est redescendu à 820 Ko |
| D33 | Restaurer une sauvegarde **remplace** les données, après un aperçu (projet, date, jours, briques, prompts) | 2026-11-18 | la fusion de deux historiques de progression produit des états incohérents ; le remplacement est prévisible et l'aperçu évite l'écrasement accidentel |
| D34 | Les écrans vides ont disparu : chaque route a son écran réel, et l'espace de noms `screens` ne garde que la page introuvable | 2026-11-18 | fin de la phase 5 |
| D29 | NotebookLM est consigné sous « NotebookLM (Gemini Notebook) » | 2026-11-18 | plusieurs sources secondaires concordantes annoncent un renommage à l'été 2026 et des quotas modifiés ; aucune page officielle n'a pu être consultée. Le jour 25 est écrit **sans dépendre du nom ni des quotas** de l'outil |
| D30 | L'écran « contenu indisponible » est testé par **simulation** (mock du chargeur), plus par un numéro de jour | 2026-11-18 | les 28 jours existent désormais dans les deux langues : l'état n'est plus atteignable par une adresse, mais la branche doit rester couverte au cas où un fichier viendrait à manquer |
| D28 | **Comptabilité simplifiée déplacée en semaine 4.** La semaine 3 compte 7 jours : veille, photo, météo/irrigation, énergie, achats, stocks, courriers | 2026-11-18 | le programme initial plaçait 8 sujets en semaine 3 ; la comptabilité précède naturellement les indicateurs et les rapports de la semaine 4 |
| D26 | Champ **mois de démarrage** ajouté à la fiche projet | 2026-11-18 | le calendrier du jour 11 en dépend : sans lui, le prompt partait avec une variable vide |
| D24 | Au démarrage, le **cache de peinture fait foi** s'il diffère du profil en base : il est appliqué puis réécrit dans IndexedDB | 2026-11-17 | corrige une perte réelle : le cache est écrit au clic, l'écriture IndexedDB arrive juste après ; fermer l'application entre les deux faisait perdre le choix de thème ou de langue |
| D35 | Le **budget de poids** est une commande (`npm run check:bundle`) exécutée en CI après le build, pas une consigne écrite | 2026-11-18 | mesure en gzip sur `dist/` : chargement initial ≤ 180 Ko (155 mesurés), pré-cache ≤ 400 Ko (322 mesurés), et contre-épreuve que la semaine 1 est bien pré-cachée — sinon le test « aucun export au pré-cache » passerait aussi avec un pré-cache vide de toute leçon |
| D36 | Le **contraste** est calculé sur les jetons du vrai `index.css`, jamais jugé à l'œil | 2026-11-18 | `src/styles/tokens.test.ts` extrait les variables des deux thèmes et applique la formule WCAG à 14 paires ; le rapport le plus faible mesuré est 5,27. Un jeton modifié casse le test au lieu de passer inaperçu |
| D37 | Pas d'`aria-label` sur un élément de rôle *paragraph* : le temps restant du minuteur passe par un texte `sr-only`, le chiffre visible devient `aria-hidden` | 2026-11-18 | ARIA interdit de nommer un rôle générique ; l'étiquette pouvait être ignorée, donc le minuteur annoncé comme un nombre nu |
| D38 | Les helpers e2e **attendent la persistance** (progression visible à l'accueil) avant de rendre la main | 2026-11-18 | un rechargement enchaîné trop vite après « Valider ma journée » interrompait l'écriture IndexedDB et le Dossier arrivait vide — le test hors ligne échouait sur un faux défaut de l'application |
| D39 | Le composant `ComingSoon` et les clés i18n `status.comingSoon` / `inPreparation` / `offlineReady` sont **supprimés** | 2026-11-18 | code mort depuis D34 ; la parité AR/FR reste assurée, les clés partent des deux langues |
| D40 | Déploiement par `deploy.yml` sur poussée vers **`master`**, avec `npm run verify` **avant** le build | 2026-11-18 | la CI de branche peut être verte et `master` cassé après une fusion ; le déploiement refait la vérification au lieu de la supposer |
| D41 | Les captures du README sont **produites par script** (`npm run screenshots`) sur le build de production, pas prises à la main | 2026-11-18 | elles montrent le vrai rendu, sur un projet de démonstration identique à celui des tests, et se régénèrent après un changement d'interface au lieu de vieillir en silence |
| D42 | Le guide de mise à jour du contenu est **orienté tâches** (`docs/CONTENU.md`), distinct du schéma de référence (`docs/lesson-schema.md`) | 2026-11-18 | qui corrige une faute n'a pas à lire un schéma Zod ; chaque règle de validation y est donnée avec sa raison, pas seulement son libellé |
| D43 | **ChatGPT, Gemini et NotebookLM passent à `availabilityDZ: 'oui'`**, confirmés par l'utilisateur du projet à partir de son usage réel en Algérie, `source` restant `null` | 2026-11-18 | les listes officielles d'OpenAI et de Google restent inconsultables depuis cette session ; la confirmation et sa nature sont consignées dans la `note` de chaque outil et dans l'en-tête de `tools.json`, pour qu'on sache plus tard d'où vient l'information |
| D44 | **Chiffres occidentaux confirmés** en arabe (`1 500 DA`, pas `١٥٠٠`) — D12 validée | 2026-11-18 | choix de l'utilisateur du projet |
| D45 | L'encart « disponibilité non confirmée » est désormais couvert par **simulation** du catalogue | 2026-11-18 | plus aucun outil réel n'est `a_verifier` : sans ce test la branche pourrissait en silence, alors qu'un outil ajouté demain repartira de ce statut. Même raisonnement que D30 |
| D46 | **Distribution par APK partagé de la main à la main**, activation des comptes via Firebase. Le modèle « aucun backend » de la v1 prend fin | 2026-11-18 | choix de l'utilisateur du projet. Conséquence assumée : l'adresse email quitte l'appareil, et le texte de confidentialité de l'application doit le dire |
| D47 | L'essai gratuit porte sur les **3 premières leçons**, pas sur 3 jours de calendrier | 2026-11-18 | choix de l'utilisateur du projet ; cohérent avec le rythme libre (D3) — qui enchaîne les leçons le premier soir demande son activation tout de suite au lieu d'attendre 72 heures |
| D48 | **Seul le compte** (email, état d'activation, dates) va sur Firebase. Projet, réponses, prompts et Dossier restent à 100 % sur le téléphone | 2026-11-18 | choix de l'utilisateur du projet ; garde une promesse de confidentialité courte et vérifiable, et évite d'héberger les données d'exploitation d'autrui |
| D49 | Notification des demandes d'activation **sans plan payant** : demande écrite dans Firestore, écran d'administration réservé au compte administrateur, plus un email prérempli côté utilisateur | 2026-11-18 | choix de l'utilisateur du projet. Un envoi d'email vraiment automatique exigerait Cloud Functions, donc le plan Blaze et une carte bancaire internationale |
| D50 | Le **contrôle d'accès passe avant le verrou pédagogique** dans `DayPage` | 2026-11-18 | le verrou pédagogique offre un bouton « ouvrir quand même » (D3) : placé après, il aurait ouvert la leçon 28 sans activation. Un test vérifie que ce bouton est hors d'atteinte quand l'accès est fermé |
| D51 | Trois **éditions** choisies au build par `VITE_EDITION` : `complete` (développement et tests), `apk`, `web` (`vitrine` jusqu'à D71). Hors `apk`, l'état de compte vaut « actif » | 2026-11-18 | un seul chemin de code dans l'interface, au lieu d'un « si le compte est requis » dans chaque écran ; et les 548 tests existants ne subissent aucun verrou. La valeur par défaut, et toute valeur inconnue, retombent sur `complete` : une faute de frappe n'enferme personne |
| D52 | Le **cache local du compte fait foi au démarrage**, et un échec réseau ne retire jamais un accès | 2026-11-18 | un agriculteur activé qui perd le réseau garde ses 28 leçons. Deux tests le vérifient, dont un qui rouvre l'application hors ligne |
| D53 | Le service de comptes est derrière un **port** (`src/compte/port.ts`) ; la 8a n'embarque qu'une implémentation **en mémoire** | 2026-11-18 | écrans et logique d'accès entièrement éprouvés avant que Firebase existe, et aucune donnée ne sort de l'appareil tant que la 8b n'est pas faite. La 8b ne remplace qu'une ligne |
| D54 | **Pas de pluriels i18next** dans le nouvel espace de noms : « {{n}} leçon(s) » plutôt que `restantes_one` / `restantes_other` | 2026-11-18 | l'arabe a six formes plurielles et le français deux : les jeux de clés diffèreraient et le test de parité AR/FR échouerait |
| D55 | Projet Firebase **agricole360-4a470**, identifiant d'application Android **dz.agricole360.app** | 2026-11-18 | fournis par l'utilisateur du projet. L'adresse de l'administrateur n'est **pas** dans le dépôt : elle arrive au build par `VITE_EMAIL_ADMIN`, pour ne pas exposer une adresse personnelle dans un dépôt public |
| D56 | L'**administrateur est désigné par un document `admins/{uid}`** dans Firestore, créé depuis la console, jamais par le code | 2026-11-18 | évite d'inscrire une adresse personnelle dans un dépôt public, et évite les *custom claims*, qui exigeraient un serveur. L'application ne fait que lire `admins/{uid}` pour afficher ou non l'écran |
| D57 | Le **SDK Firebase est chargé à la demande** et exclu du pré-cache | 2026-11-18 | il pèse 220 Ko gzip, soit plus que toute l'application. Le cache local suffit à connaître l'accès au lancement (D52), donc le SDK n'arrive qu'à la première action réseau. Le chargement initial reste à 163,3 Ko, le SDK absent d'`index.html` même en édition APK |
| D58 | La **clé d'API Firebase est dans le dépôt**, les règles de sécurité aussi | 2026-11-18 | Google publie ces clés dans toutes les applications web : elles identifient le projet et n'autorisent rien. La protection est dans `firebase/firestore.rules`, qui interdit à un utilisateur d'écrire son propre champ `actif`. Chaque valeur reste remplaçable au build pour viser un autre projet |
| D59 | Le service choisi (**Firebase ou en mémoire**) l'est au chargement du module, d'après l'édition | 2026-11-18 | en test l'édition est `complete` : aucun test ne peut donc atteindre le vrai projet Firebase, et aucune donnée ne sort hors APK |
| D60 | **Capacitor**, pas TWA : l'application web est embarquée dans l'APK | 2026-11-18 | elle fonctionne dès le premier lancement, sans réseau et sans hébergement — ce qu'exige un APK partagé de la main à la main. Un TWA ouvrirait un site distant et imposerait Digital Asset Links |
| D61 | L'édition APK **n'embarque ni service worker, ni cartes de source, et son chemin de base est `/`** | 2026-11-18 | les fichiers sont déjà locaux : une seconde couche de cache n'apporterait rien et son invite de mise à jour ne pourrait rien faire. Les cartes de source pesaient plus que le code (15 Mo → **3,7 Mo**), ce qui compte pour un fichier partagé par messagerie |
| D62 | **Version et signature viennent de l'environnement**, jamais du dépôt ; sans clé fournie, l'APK sort signé en *debug* | 2026-11-18 | aucune clé ni numéro de version à tenir à la main dans le dépôt, et un premier APK reste essayable sans aucune configuration. Le résumé du workflow dit lequel des deux cas s'applique, parce qu'un APK de debug ne peut pas être remplacé plus tard par un APK signé |
| D63 | `npm run apk:verifier` sert les fichiers **comme Capacitor** et contrôle le comportement | 2026-11-18 | l'assemblage Gradle exige le SDK Android, indisponible ici (`dl.google.com` bloqué), mais l'essentiel de ce qui casse dans un APK n'est pas Gradle : chemin de base, service worker resté actif, appel réseau au démarrage, verrou de compte inopérant. Ces quatre points sont vérifiés |
| D64 | En vitrine, les leçons 4 à 28 **ne sont pas construites**, pas seulement masquées | 2026-11-18 | les masquer dans l'interface laisserait leurs fichiers téléchargeables par quiconque regarde le trafic réseau. `import.meta.glob` est choisi selon l'édition, la branche non retenue disparaît au build, et `check:bundle` vérifie le résultat sur `dist/` — contre-épreuve comprise : un fichier `day-17` ajouté à la main fait échouer la commande |
| D65 | L'accès en vitrine est une fonction **distincte** (`accesVitrine`), pas un paramètre de plus sur `accesAuJour` | 2026-11-18 | un plafond d'édition et un droit de compte sont deux règles sans rapport ; les mêler rendrait les deux plus difficiles à lire et à éprouver |
| D66 | L'adresse de l'APK vient du build (`VITE_URL_APK`) ; vide, la page le **dit** | 2026-11-18 | mieux vaut « aucune version n'est encore publiée » qu'un bouton qui mène à une erreur 404 |
| D67 | Le site publié est l'édition **vitrine**, pas l'édition complète | 2026-11-18 | publier les 28 leçons librement dans un navigateur viderait de son sens l'activation construite en 8a et 8b |
| D68 | Dépôt renommé **AgroBest** ; le chemin de base devient `/AgroBest/` | 2026-11-18 | choix de l'utilisateur du projet, pour l'adresse publique `https://abdoualger1648-del.github.io/AgroBest/`. Le nom public de l'application (Agricole DZ 360) et les identifiants internes (`agri28`, `dz.agricole360.app`) ne changent pas |
| D69 | Le serveur d'aperçu est lié explicitement à **`127.0.0.1`**, et sa sortie est capturée en CI | 2026-11-18 | la CI échouait depuis sa toute première exécution, et je ne l'avais jamais regardée : je vérifiais en local et je supposais la CI identique. Cause réelle : `vite preview` écoutait sur « localhost », que le runner GitHub résout en **IPv6 `::1`**, alors que Playwright interroge `127.0.0.1` — ici `localhost` résout en IPv4, d'où un échec invisible en local. C'est la sortie du serveur, que Playwright ignore par défaut, qui l'a montré ; elle reste capturée pour que la prochaine panne soit lisible du premier coup. En CI le serveur ne reconstruit plus non plus : l'étape précédente vient de le faire |
| D70 | La liste des demandes d'activation **trie sur un seul champ** et filtre l'état côté application | 2026-11-18 | combiner `where('actif','==',false)` et `orderBy('demandeLe')` exige de Firestore un **index composite**, à créer à la main dans la console : sans lui la requête échoue et l'écran n'affiche qu'un « quelque chose n'a pas fonctionné » sans dire quoi. Un tri sur un seul champ utilise l'index automatique. Trouvé en relisant le code, avant que l'écran soit utilisé pour la première fois |
| D71 | **L'édition `vitrine` est remplacée par l'édition `web`** : même produit que l'APK, compte et activation compris, servi depuis un navigateur | 2026-11-18 | choix de l'utilisateur du projet. Quelqu'un sans téléphone Android peut suivre les 28 jours, et l'activation protège le contenu de la même façon. D64, D65, D66 et D67 tombent avec elle : le plafond d'édition, la fonction `accesVitrine`, le motif `application_requise` et le glob conditionnel du chargeur sont supprimés — il ne reste qu'une seule règle d'accès, celle du compte. Contrepartie assumée : un visiteur doit créer un compte avant de voir la première leçon |
| D72 | L'APK reste proposé **partout sauf dans l'APK** (`proposeApk()`) | 2026-11-18 | une application installée fonctionne sans réseau, ce que le web ne garantit pas ; mais se proposer à soi-même n'aurait aucun sens |
| D73 | L'écran « Mon compte » affiche l'**identifiant du compte**, avec un bouton pour le copier | 2026-11-18 | c'est lui qui désigne un administrateur (D56), et il fallait jusqu'ici aller le chercher dans la console Firebase. On le lit maintenant depuis le téléphone, ce qui réduit la désignation d'un administrateur à un copier-coller |
| D74 | L'écran d'administration offre un bouton **« Activer mon compte »** à l'administrateur inactif | 2026-11-18 | l'administrateur est un compte comme les autres : il démarre en essai. Les règles l'autorisent déjà à écrire le champ `actif` de n'importe quel compte, le sien compris — lui imposer de s'adresser une demande pour ensuite y répondre n'aurait servi à rien. Un compte ordinaire ne voit jamais ce bouton, et les règles le refuseraient de toute façon |
| D75 | **Mot de passe oublié** ajouté, et le message affiché est le **même** que l'adresse ait un compte ou non | 2026-11-18 | sans lui, un utilisateur qui oublie son mot de passe était bloqué définitivement : l'application n'offrait aucune issue. Répondre « adresse inconnue » aurait en revanche permis à n'importe qui de savoir qui est inscrit, d'où la réponse unique, côté interface comme côté service — une adresse sans compte n'y produit aucune erreur |
| D76 | **Plusieurs dossiers** derrière un niveau de compte : 1 au niveau `standard`, **5** au niveau `multi`, demandé par l'utilisateur et accordé par l'administrateur | 2026-11-18 | choix de l'utilisateur du projet. Le modèle de données portait déjà le multi-dossier — tout est cloisonné par `projectId` depuis la phase 2 — il ne manquait que l'interface et le contrôle. Le niveau est **orthogonal** à l'activation : il ne donne jamais accès aux leçons, il n'ouvre que des dossiers |
| D77 | Un second dossier **refait les 28 jours dans l'ordre**, verrou pédagogique compris | 2026-11-18 | choix de l'utilisateur du projet ; c'est le comportement existant appliqué tel quel, chaque dossier ayant sa propre progression |
| D78 | Le plafond est vérifié **aussi sur l'écran de création**, pas seulement sur le bouton qui y mène | 2026-11-18 | l'adresse `/dossiers/nouveau` est atteignable directement ; un verrou qui ne tient que dans le bouton n'est pas un verrou. Un test y va droit |
| D79 | `deleteProject` efface aussi les **prompts et les badges** | 2026-11-18 | ils sont arrivés en phase 5, après l'écriture de la cascade, et personne ne l'avait vu parce qu'aucun écran ne supprimait de dossier. Ils laissaient des orphelins rattachés à un projet disparu. La suppression bascule en outre sur un dossier restant, au lieu de renvoyer sur l'écran de création |
| D80 | Le parcours s'adapte au type d'activité par des **variantes ciblées** dans les mêmes 28 jours : exemple de terrain, libellés de capture, indices de prompt | 2026-11-18 | choix de l'utilisateur du projet. Forker les 28 jours pour les 9 types dans deux langues ferait 504 fichiers, qu'aucun humain ne relirait. Les concepts et les quiz ne dépendent pas du métier, et les gabarits interpolent déjà `{{project.type}}` : seul le texte de l'application devait suivre |
| D81 | Une variante **ne peut jamais réécrire le gabarit d'un prompt** — le schéma est `strict` et ne l'expose pas | 2026-11-18 | le gabarit porte les garde-fous (« ne donne aucune dose », « cite tes sources »). L'ouvrir aux variantes ouvrirait le seul endroit du contenu qui protège l'utilisateur. Un test vérifie qu'aucun gabarit ne bouge après application |
| D82 | Une variante marquée `brouillon` **n'est pas affichée** ; l'application l'ignore | 2026-11-18 | la relecture humaine devient un verrou, pas un pense-bête : le contenu écrit par une IA ne peut pas atteindre un agriculteur avant qu'un humain ait retiré le drapeau. `validate:content` le signale en plus |
| D83 | L'écriture assistée est un **script hors application** (`npm run variantes`), pas une fonction de l'application | 2026-11-18 | choix de l'utilisateur du projet. Aucune clé d'API dans l'APK — elle y serait extractible — aucun coût par utilisateur, et tous les garde-fous tiennent. Les deux langues sont demandées dans le même appel, ce qui garantit la parité AR/FR par construction, comme `emit.py`. Le cœur (instructions, analyse, cohérence) est éprouvé par 11 tests sans dépenser un centime |
| D84 | Notifications des demandes **dans l'application seulement** : compteur dans le menu, notification à l'ouverture, liste relue à chaque visite | 2026-11-18 | choix de l'utilisateur du projet. Prévenir une application fermée exige un serveur — Cloud Functions pour un email, ou pour un envoi FCM — donc le plan Blaze et une carte bancaire. Mettre la clé d'envoi dans l'APK la rendrait extractible, et n'importe qui pourrait inonder l'administrateur |
| D85 | Deux repères distincts : **« vu »** et **« déjà notifié »** | 2026-11-18 | la notification ne doit pas se répéter à chaque ouverture pour le même lot, mais le compteur doit rester tant que les demandes ne sont pas traitées. Un seul repère aurait forcé à choisir entre harceler et oublier |
| D86 | Le repère « vu » retient la **date de la demande la plus récente**, jamais l'horloge | 2026-11-18 | prendre l'instant présent marquerait comme lues des demandes écrites pendant que l'écran chargeait |
| D87 | `VITE_EMAIL_ADMIN` est câblé **aussi dans le déploiement web** | 2026-11-18 | il ne l'était que dans le workflow APK : sur le site, le bouton « Écrire à l'administrateur » ne pouvait donc jamais apparaître. C'est pourtant le seul chemin qui atteint une boîte mail sans plan payant |
| D88 | **L'aisance avec l'IA fixe le niveau de base.** La maturité du projet et la gestion existante peuvent le relever d'**un seul cran**, jamais le faire monter depuis zéro | 2026-11-19 | le niveau décide si l'utilisateur reçoit le prompt tout écrit ou un prompt à compléter. Un éleveur chevronné qui tient ses comptes sur tableur mais n'a jamais ouvert un assistant a besoin du pas-à-pas : une simple moyenne pondérée des trois axes l'aurait envoyé en « avancé ». Deux tests figent le cas, sur le barème inventé et sur le vrai contenu |
| D89 | La migration vers le schéma 5 donne **« intermediaire »** à une installation qui a déjà au moins un dossier, et `null` aux autres | 2026-11-19 | sans cela, quelqu'un entre son jour 14 et son jour 15 aurait trouvé un test obligatoire au lancement suivant — une fonctionnalité existante cassée. « Déjà en route » se mesure au nombre de dossiers, seul signe fiable : `onboardingDone` n'est jamais repassé à vrai dans le code. Un test ouvre une vraie base en version 4 et la fait migrer |
| D90 | Le niveau est porté par le **profil**, pas par le dossier | 2026-11-19 | le test mesure la personne, pas l'exploitation. Qui ouvre un second dossier (D76) ne repasse donc pas le test, et son niveau s'applique aux deux parcours |
| D91 | **Aucune variante `intermediaire`** ; et si les deux axes visent le même indice de prompt, c'est le **niveau** qui gagne | 2026-11-19 | « intermediaire » *est* le parcours standard : une variante pour lui ne ferait que dupliquer le contenu de base, et la validation la refuse. Pour l'arbitrage : le métier décide de quoi on parle, le niveau décide combien on accompagne — c'est l'accompagnement qui doit coller à la personne |
| D92 | Les questions vivent dans **un seul fichier bilingue** (`content/test-niveau.json`) ; le **barème** est dans le contenu, les **seuils** dans `src/domain/niveau.ts` | 2026-11-19 | même parti que `templates.json` : deux langues côte à côte, donc parité AR/FR garantie par construction, sans fichier à synchroniser. Et rendre un axe plus ou moins sévère reste une édition de JSON, conformément à la règle fondatrice du projet |
| D93 | La garde de niveau laisse **les réglages et le compte** atteignables ; un **effacement complet des données** refait passer le test | 2026-11-19 | changer de langue ou se déconnecter ne doit jamais exiger de répondre à huit questions d'abord. À l'inverse, « effacer toutes mes données » est un vrai recommencement : repartir par le test est cohérent, et un test de bout en bout fige ce comportement |
| D94 | Les variantes de niveau de la **semaine 1** sont écrites à la main et relues ; les jours 8 à 28 passeront par `npm run variantes -- --niveau` | 2026-11-19 | 28 jours × 2 niveaux × 2 langues font 112 textes : les écrire tous à la main maintenant produirait de la matière que personne ne relirait vraiment. La semaine 1 rend la fonctionnalité réelle dès le premier jour ; le reste suit la règle D82 — écrit par l'IA, en brouillon, invisible jusqu'à relecture humaine |
| D95 | Le test de niveau s'applique dans **toutes les éditions**, y compris `complete` | 2026-11-19 | un seul chemin de code, comme D51 pour le compte. Conséquence assumée : les tests de bout en bout le passent vraiment, par l'écran, au lieu d'écrire un niveau en base — ce chemin est maintenant la première chose que vit un utilisateur, un raccourci l'aurait laissé sans épreuve |
| D96 | Le motif « texte réglementaire » est corrigé sur **deux** défauts : « loi » doit être suivie d'un **numéro**, et le `\b` ne couvre plus que les variantes **latines** | 2026-11-19 | deux vraies pannes, trouvées en écrivant le contenu de la phase 12. (1) `loi\s*n` attrapait le mot **« loin »**, les deux lettres étant collées : n'importe quel auteur serait tombé dessus. (2) En JavaScript, `\b` se fonde sur l'alphabet ASCII : placé devant le groupe entier, il empêchait **toute** correspondance arabe — la règle ne s'appliquait donc qu'au français depuis la phase 3. Rien n'était passé au travers, parce que les leçons arabes citant un texte ont une jumelle française qui, elle, était contrôlée ; l'écriture en paire masquait le trou. Onze contre-épreuves fixent désormais les deux alphabets |
| D97 | Lever un drapeau `brouillon` se fait par une **commande** (`npm run variantes:valider`), qui exige des jours **nommés explicitement** ; sa décision vit dans une fonction **pure** et testée | 2026-11-19 | retirer 84 drapeaux à la main serait une source d'erreurs à lui seul, et D82 n'y gagnerait rien. Mais il n'y a volontairement **pas** de « tout valider » : ce serait exactement le tampon que D82 cherche à éviter. La commande ne touche jamais l'autre axe — valider les niveaux ne doit pas publier au passage une variante de métier que personne n'a lue |
| D98 | ~~Les variantes de niveau des jours **8 à 28** sont livrées en brouillon~~ — **levé le 2026-11-22** sur demande de l'utilisateur du projet : les 84 drapeaux sont retirés, les variantes sont affichées | 2026-11-19 | application directe de D82 et D94 : ces 84 textes sont écrits par une IA, et aucun n'atteindra un agriculteur avant que l'utilisateur du projet les ait lus et ait levé leur drapeau, semaine par semaine. La semaine 1, relue, reste la seule affichée |
| D99 | L'administrateur **ne peut pas se retirer ses propres droits** depuis l'écran — mais il peut toujours se les donner | 2026-11-19 | un clic malheureux sur sa propre ligne lui fermerait les 28 leçons, et rien dans l'application ne lui permettrait de revenir en arrière sans passer par la console Firebase. Dans l'autre sens, rien à protéger : D74 l'autorisait déjà à s'activer. La règle vit dans `actionsPossibles`, fonction pure, et deux tests la figent |
| D100 | `listerComptes` trie sur **`email`**, jamais sur `demandeLe` | 2026-11-19 | Firestore **écarte les documents dépourvus du champ trié**. `listerDemandes` trie sur `demandeLe` (D70), ce qui convient à son objet, mais la même requête pour les comptes ferait disparaître quiconque n'a jamais rien demandé — exactement les personnes que la liste complète existe pour montrer. `email` est présent sur tout document depuis sa création, et reste un tri à un seul champ, donc sans index composite à créer |
| D101 | `desactiveLe` n'existe que dans la vue de l'administrateur, **pas dans le cache local** du compte | 2026-11-19 | choix de l'utilisateur du projet d'ajouter une date de retrait. Mais l'application d'un utilisateur n'a besoin que de savoir si son accès est ouvert : porter ce champ jusqu'à `CompteRecord` aurait imposé une migration IndexedDB de plus sans rien apporter à personne. Conséquence : les **règles Firestore doivent être republiées**, la liste des champs qu'un administrateur peut écrire ayant changé |
| D102 | Rouvrir un accès **efface** `desactiveLe` ; une fermeture **conserve** `activeLe` | 2026-11-19 | le champ décrit l'état COURANT, pas l'historique : une date de retrait affichée sur un compte ouvert serait trompeuse. À l'inverse, garder `activeLe` après une fermeture est ce qui distingue « accès jamais ouvert » de « accès ouvert puis retiré ». Un vrai journal des décisions est une autre affaire, et l'utilisateur du projet l'a écartée |
| D103 | Les deux listes de l'écran d'administration sont des **sections nommées** (`region`) | 2026-11-19 | une personne qui a une demande en attente figure dans les deux : sans nom, ni un lecteur d'écran ni un test ne pouvait dire de laquelle on parle. Trois tests existants échouaient d'ailleurs sur un « Found multiple elements » après l'ajout de la liste complète — le défaut était d'abord d'accessibilité |
| D104 | L'adaptation forte au métier n'est possible que sur **10 jours sur 28** | 2026-11-21 | une variante remplace le bloc `example` du concept, et seuls les jours 1, 2, 4, 6, 7, 9, 14, 15, 17 et 19 en portent un. Ailleurs, une variante de métier ne peut changer que les libellés de capture et les indices de prompt. Ce n'est pas un défaut à corriger en ajoutant des exemples partout — un jour sans exemple n'en a pas besoin — mais une limite à connaître avant de promettre « un parcours par métier » |
| D105 | **Révisée** : sur chaque jour, le type que l'exemple générique sert déjà ne reçoit **pas** de variante — et ce type **change d'un jour à l'autre** | 2026-11-21 | d'abord écrite « l'ovin n'a jamais de variante », ce qui était faux : l'inventaire des dix exemples donne ovin aux jours 1, 7 et 15, **maraîchage** au jour 2 (la pomme de terre de Hamid), **céréales** aux jours 9 et 19, et rien du tout aux jours 4, 6, 14 et 17. Conséquence attrapée par cette vérification : au jour 17 l'exemple parle d'une culture à un stade sensible, donc un éleveur ovin n'y trouvait rien — et je l'avais justement écarté. Sa variante d'abreuvement a été ajoutée |
| D106 | Les variantes de métier sont livrées **par tranches**, en brouillon, en commençant par les jours 1, 15 et 17 | 2026-11-21 | 10 jours × 7 types × 2 langues font 140 textes de terrain : les écrire d'un trait produirait de la matière que personne ne relirait. Les trois premiers jours sont ceux où le métier change le plus l'exercice — la première impression, la liste de surveillance, et la règle d'irrigation, qui pour un éleveur devient une règle d'**abreuvement**. Même règle que D98 : rien n'est affiché avant relecture |
| D107 | Les jours **4, 6 et 19 ne reçoivent aucune variante de métier**, et c'est un choix | 2026-11-21 | reconnaître une vraie source (4), anonymiser une situation (6) et comparer trois offres qui ne se comparent pas (19) ne dépendent pas du métier : une variante n'y changerait qu'un prénom. D80 demande des variantes **ciblées**, pas de la décoration — en écrire ici gonflerait la matière à relire sans rien apporter à personne |
| D108 | Aux jours **9 et 14**, la variante ne touche **que les libellés de capture**, jamais l'exemple | 2026-11-21 | au jour 9 l'exemple cite des circuits d'approvisionnement avec une source datée (D25) : les transposer par métier demanderait de vérifier huit filières, et je ne les invente pas. Au jour 14 l'exemple — le cahier abandonné au bout de trois semaines — vaut pour tout le monde. Dans les deux cas, ce qui change réellement d'un métier à l'autre est la **liste des postes** et la **donnée technique suivie**, et c'est cela qu'on remplace |
| D109 | Restaurer une sauvegarde **normalise le profil** : les champs ajoutés depuis reprennent leur valeur par défaut, et la version de schéma est remise à jour | 2026-11-21 | défaut réel, trouvé en relisant `backup.ts` après la phase 12. `restoreBackup` écrivait le profil tel quel, et l'`upgrade` de Dexie ne rejoue pas sur une ligne écrite à la main — il ne se déclenche qu'au changement de version de la BASE. Un profil d'avant la phase 12 revenait donc sans `niveauParcours` : ni un niveau, ni le `null` que la garde attend (elle teste `=== null`), donc la personne n'était **jamais** envoyée au test, tout en lisant « test non encore passé » dans ses réglages. La correction vaut pour toutes les migrations à venir, et quatre des cinq tests ajoutés échouent si on la retire |
| D110 | La **déconnexion vide l'état d'administration** (`reinitialiserAdministration`) | 2026-11-22 | la liste de TOUS les comptes, avec leurs adresses, survivait au départ de l'administrateur : un téléphone passe de main en main, et rien ne justifie qu'elle reste en mémoire pour la personne suivante. Rien ne l'affichait — le compteur du menu est protégé par le droit d'administrer — mais la donnée était là. Les repères « vu » et « déjà notifié » restent dans `localStorage` : ils décrivent l'appareil, pas la session |
| D111 | `useAdministrateur` **repose la question à chaque changement de compte**, et la valeur rendue est **dérivée** de l'identifiant | 2026-11-22 | la dépendance de l'effet était vide. Or le hook est monté UNE FOIS pour toute la vie de l'application dans `App.tsx` : quelqu'un qui se connectait après le démarrage n'était jamais reconnu comme administrateur, et celui qui se déconnectait le restait. Dériver plutôt que réécrire l'état évite la cascade de rendus que la règle `setState` dans un effet interdit à juste titre. Quatre tests échouent si on retire l'une ou l'autre correction |
| D112 | **Google et Facebook** sont les seuls fournisseurs ajoutés. Ni WhatsApp, ni X, ni téléphone | 2026-11-22 | choix de l'utilisateur du projet après vérification. **WhatsApp n'est pas un fournisseur d'identité** : aucun OAuth de ce nom n'existe, l'entreprise authentifie ses propres utilisateurs (par passkeys depuis août 2026) sans rien déléguer ; ce que des prestataires vendent sous ce nom est un code à usage unique payant. **X** est encore proposé par Firebase mais son accès développeur est payant depuis 2023, pour un public qui ne l'utilise pas. **Le téléphone** exige le plan Blaze : Firebase n'envoie plus de SMS sans compte de facturation depuis septembre 2024, et D49 note l'absence de carte bancaire internationale. Il s'ajoutera le jour où un plan Blaze existera |
| D113 | Les boutons de fournisseur **n'apparaissent pas dans l'APK** (`fournisseursDisponibles()`) | 2026-11-22 | Google refuse l'OAuth depuis une WebView embarquée — c'est exactement ce qu'est un APK Capacitor — et la tentative échoue sur un « disallowed_useragent » qu'un agriculteur ne peut pas comprendre. Mieux vaut aucun bouton qu'un bouton qui échoue. Le chemin natif (plugin Capacitor) est une phase à part, que je ne peux de toute façon pas compiler ici faute de SDK Android |
| D114 | **D48 est révisée** : avec Google ou Facebook, le fournisseur apprend que la personne utilise l'application | 2026-11-22 | choix de l'utilisateur du projet, qui accepte le changement. Le reste de la promesse tient mot pour mot : projet, réponses, prompts et Dossier restent sur l'appareil. L'application ne demande que `email`, jamais les contacts, les amis ni le profil étendu. Le texte de l'écran de compte le dit dans les deux langues, et deux tests vérifient qu'il le dit vraiment |
| D115 | La règle Firestore de création **tolère un jeton sans adresse email** | 2026-11-22 | Facebook ne renvoie aucune adresse si la personne s'est inscrite chez lui avec un numéro de téléphone, ou si elle refuse la permission. La règle comparait l'adresse stockée à celle du jeton : la création aurait été refusée sans que rien ne dise pourquoi. La protection tient toujours — avec une adresse dans le jeton elle doit correspondre exactement, sans adresse on n'en écrit aucune. **Les règles doivent être republiées** |
| D116 | L'écran de compte **répartit l'erreur** entre le formulaire et les boutons (`estErreurFournisseur`) | 2026-11-22 | le store ne porte qu'une `derniereErreur`, et l'écran a deux chemins de connexion. Sans cette distinction, fermer la fenêtre de Google affichait un message rouge sous le champ email — au mauvais endroit, et pour un geste délibéré. Une annulation ne produit désormais aucun message du tout : c'est un choix de l'utilisateur, pas une panne. Trois tests figent la règle |
| D117 | **D80 était fausse sur un point** : les quiz dépendaient bien du métier. Une variante peut désormais habiller une question | 2026-11-22 | signalé par l'utilisateur du projet, qui a créé un dossier « culture sous serre » et a lu de l'élevage. L'audit a trouvé **cinq questions** nommant l'élevage, aux jours 1, 5, 7 et 20 — dont « Vendre 40 agneaux » donné comme modèle d'objectif vérifiable, et au jour 20 une question entière sur les traitements vétérinaires qui ne veut rien dire pour une culture. Les variantes ne pouvaient pas les atteindre, puisque D80 posait que le quiz n'en avait pas besoin |
| D118 | Une variante de quiz ne peut remplacer que l'**énoncé, les textes de choix et l'explication** — jamais `answer`, jamais les identifiants de choix | 2026-11-22 | même raisonnement que D81 pour les gabarits de prompt : on habille, on ne réécrit pas. Les choix sont remplacés **par clé**, donc leur nombre et leurs identifiants ne bougent pas, et la bonne réponse reste ancrée où elle était. Un test parcourt chaque question après application et vérifie que `answer` désigne toujours un choix existant |
| D119 | Au jour 20, **les types d'élevage gardent le texte générique** ; seuls les végétaux et l'apiculture reçoivent une variante | 2026-11-22 | la question porte sur les délais d'attente avant de vendre le lait ou la viande : elle est juste telle quelle pour l'ovin, le bovin et l'avicole. Pour une culture elle devient une question sur les délais avant récolte, et pour l'apiculture sur les résidus dans le miel. Appliquer D105 par jour, plutôt que par réflexe, évite d'écrire quatre variantes qui ne diraient rien de neuf |
| D120 | Le jour 5 **ne reçoit aucune variante de quiz**, bien qu'il nomme le troupeau | 2026-11-22 | son choix dit « une dose de traitement pour mon troupeau **ou ma culture** » : il couvre déjà les deux, et son explication parle de « tue des animaux, détruit une récolte ». Il n'est faux pour personne. D107 s'applique — une variante n'y changerait qu'un mot, et gonflerait la matière à relire |
| D121 | **Plus aucune variante en brouillon** : les 226 sont affichées | 2026-11-22 | l'utilisateur du projet a levé les drapeaux des deux axes, 142 de métier puis 84 de niveau. Le mécanisme de D82 reste entier et reprendra pour toute variante écrite ensuite : `validate:content` avertit, et `variantes:valider` exige des jours nommés. Ce qui change, c'est l'état du contenu, pas la règle. Chaque jour reste révocable en remettant `"brouillon": true` dans les deux langues |
| D122 | Le workflow APK **refuse** de produire un APK de debug, sauf case « autoriser_debug » cochée ; et le résumé d'un build signé affiche l'**empreinte du certificat** | 2026-11-22 | signalé par l'utilisateur du projet : installer une nouvelle version avait exigé de désinstaller, donc de tout perdre. La cause n'est pas le `versionCode` — il vient de `github.run_number`, qui ne redescend jamais — mais la **signature** : les versions 1.2.0 à 1.6.0 sont signées en debug, et le premier APK signé pour de bon ne peut pas s'installer par-dessus. Un garde-fou écrit dans un commentaire n'avait rien empêché ; un build qui échoue, si. L'empreinte rend la condition lisible depuis la page du build, au lieu d'être une affirmation à croire — et c'est la même valeur que Firebase réclame pour la connexion Google native |
| D123 | La chaîne de migrations est éprouvée **depuis le schéma 1**, pas seulement du cran 4 au cran 5 | 2026-11-22 | `migration5.test.ts` ne couvrait que le dernier saut, alors que quelqu'un peut installer la nouvelle version par-dessus n'importe quelle ancienne. Le nouveau test ouvre de vraies bases en version 1 et en version 3, y écrit dossier, progression, briques, prompts et badges, puis vérifie qu'aucun n'a disparu. Contre-épreuve faite : un `clear()` glissé dans l'`upgrade` fait échouer le test. Conclusion vérifiée, et non supposée : la base survit à une mise à jour ; ce qui ne survit pas à une désinstallation, c'est Android qui le décide |
| D124 | Là où aucun bouton de fournisseur n'existe — donc dans l'APK (D113) — une phrase **nomme la sortie** pour un compte créé avec Google ou Facebook | 2026-11-22 | impasse réelle et atteignable : un compte créé sur le web avec Google n'a aucun mot de passe, et l'APK ne propose que le formulaire. La connexion répondait « adresse ou mot de passe incorrect » et l'inscription « adresse déjà utilisée » — deux messages contradictoires, aucune issue indiquée. L'issue existait pourtant depuis D75. La règle vit dans `impasseFournisseur`, fonction pure : la phrase ne s'affiche jamais sur le web, où le bouton est juste là |
| D125 | L'**origine de la vue web** (`https://localhost`) et l'identifiant de paquet sont **verrouillés par un test** | 2026-11-22 | IndexedDB est rattachée à l'origine de la vue web, pas au paquet. Changer `androidScheme` ou `hostname` dans `capacitor.config.ts` ne casse rien de visible : l'application se lance, mais sur une base vide, et l'utilisateur y lit la perte de son Dossier sans aucun message d'erreur. Une mise à jour parfaitement signée suffirait à le provoquer. Rien n'empêchait ce changement ; le test, si — contre-épreuve faite |
| D126 | **Connexion Google native dans l'APK**, par `@capacitor-firebase/authentication`, avec `skipNativeAuth` — le natif ne fournit que le **jeton**, et c'est le SDK JavaScript qui ouvre l'unique session | 2026-11-22 | choix de l'utilisateur du projet (GO phase 16). Le plugin sait ouvrir la session lui-même, côté natif, mais toute l'application vit dans la vue web et s'appuie sur la session du SDK JS : règles Firestore, `onAuthStateChanged`, écran d'administration. Deux sessions parallèles donneraient une application connectée d'un côté et anonyme de l'autre — une « connexion réussie » suivie d'un écran de compte vide. Les deux chemins (fenêtre du navigateur sur le web, compte du téléphone dans l'APK) finissent donc au même endroit, et tout ce qui suit ignore lequel a été pris. Un test fige `skipNativeAuth` et la liste `providers`, parce que les retirer ne casse ni type ni écran |
| D127 | **Facebook reste sur le web** : `rgcfaIncludeFacebook = false` | 2026-11-22 | son SDK natif exige, en plus de `google-services.json`, un App ID et un jeton client inscrits dans les ressources Android et deux activités déclarées au manifeste. Je n'ai pas ces valeurs, et les embarquer à moitié donnerait une application qui compile et échoue à l'appui sur le bouton — exactement ce que D113 voulait éviter. Conséquence assumée, et couverte : qui a créé son compte avec Facebook sur le web n'a pas de mot de passe, et l'APK le lui dit (D124) |
| D128 | **`firebase` rétrogradé de 13.4 à 12.19** | 2026-11-22 | choix de l'utilisateur du projet entre trois options. Le plugin déclare `firebase: ^12.6.0` en dépendance de pair ; garder la 13 imposait d'affaiblir la résolution des dépendances du dépôt. Le typecheck passe contre la 12 — donc aucune API utilisée n'a disparu — et les 795 tests aussi. Mais les tests n'atteignent jamais le vrai service Firebase (D59) : le chemin réseau réel ne sera éprouvé que sur un téléphone |
| D129 | Le pont natif est **déclaré par `registerPlugin`**, au lieu d'importer le point d'entrée JS du plugin | 2026-11-22 | défaut réel, attrapé par le build : importer `@capacitor-firebase/authentication` fait entrer son implémentation **web**, qui importe `firebase/auth` en dépendance de pair *optionnelle*. npm garde `firebase` dans `apps/agri28/node_modules` alors que le plugin est à la racine du monorepo, donc Vite ne le résout pas depuis le plugin et le remplace par un bouchon vide : **44 exports manquants**, build cassé. Régénérer le verrou n'a rien changé, npm maintenant l'imbrication. Or cette implémentation web ne sert à rien — le web garde la fenêtre du navigateur. `registerPlugin` sans implémentation web déclare exactement ce dont l'APK a besoin, le paquet npm restant installé pour que `cap sync` embarque le code Android. Les types viennent du paquet et sont effacés à la compilation |
| D130 | `GOOGLE_SERVICES_JSON` est un secret **obligatoire** du workflow APK ; sans lui le build **échoue** | 2026-11-22 | vérifié dans le source du plugin : `load()` appelle `FirebaseAuth.getInstance()` au démarrage du pont Capacitor, donc avant toute action de l'utilisateur. Sans `google-services.json`, cet appel lève une exception et l'application plante **au lancement**. Un APK livré ainsi serait inutilisable : mieux vaut un build qui échoue avec un message qui nomme le secret et renvoie à `docs/APK.md`. Le workflow contrôle en outre que le fichier est du JSON valide, parce qu'un collage tronqué casserait Gradle plus loin, avec un message qui ne désignerait pas la cause |

### Questions ouvertes
*Aucune pour l'instant.*

### Questions tranchées
- **Connexion native dans l'APK** (choix de l'utilisateur du projet) : **oui pour Google**, par plugin Capacitor (D126) ; **Facebook reste sur le web** (D127) ; et **`firebase` rétrogradé en 12.19** pour s'aligner sur le plugin (D128). L'APK exige désormais le secret `GOOGLE_SERVICES_JSON` (D130). La **clé de signature est créée par l'utilisateur du projet lui-même**, jamais par moi : elle ne doit pas transiter par une conversation.
- **Connexion par fournisseur** (choix de l'utilisateur du projet) : **Google et Facebook**, sur le web seulement. WhatsApp n'existe pas comme fournisseur d'identité, X est payant, le téléphone exige le plan Blaze. Le fournisseur apprend l'usage de l'application, et le texte de confidentialité le dit (D114).
- **Gestion des comptes** (choix de l'utilisateur du projet) : l'administrateur **liste tous les comptes**, ouvre et **ferme** un accès, accorde et **retire** le niveau multi-dossiers ; une **date de retrait** (`desactiveLe`) est conservée — ce qui impose de **republier les règles Firestore**. La suppression d'un compte reste impossible, par les règles (`allow delete: if false`) comme par Firebase Auth.
- **Test de niveau** (choix de l'utilisateur du projet) : mesure **3 axes** — aisance IA, maturité du projet, gestion existante ; **3 niveaux** (débutant / intermédiaire / avancé) ; **mêmes 28 jours à profondeur adaptée**, pas de parcours raccourci ni réordonné ; **obligatoire au départ, refaisable à tout moment**.
- **Nom public** : Agricole DZ 360 (D23). **Ton** : vouvoiement FR, arabe standard simple (D22).
- **Chiffres en arabe** : occidentaux (D12, confirmé D44).
- **Outils cités** : ChatGPT, Gemini et NotebookLM utilisables en Algérie, confirmé par l'utilisateur du projet (D43).
- ~~API `docx`~~ : **confirmée** en lisant les types du paquet — `bidirectional?: boolean` sur les options de paragraphe, `rightToLeft?: boolean` sur celles d'un run, `AlignmentType.START/END` logiques, `sizeComplexScript` pour la taille en script complexe.

---

## 6. Commandes (à partir de la Phase 1)

Depuis la **racine du dépôt** (les scripts sont relayés vers `apps/agri28`) :

```bash
npm install
npm run dev              # serveur de développement (base /)
npm run build            # build de production (base /AgroBest/)
npm run preview          # sert le build sur http://127.0.0.1:4173/AgroBest/
npm run typecheck        # tsc --noEmit
npm run lint             # ESLint (analyse typée)
npm run test             # Vitest
npm run test:e2e         # Playwright, build + preview automatiques
npm run validate:content # garde-fous ; schéma complet des leçons à la phase 3
npm run check:bundle     # budget de poids et 56 fichiers de leçon, après `npm run build`
npm run apk:web          # build en édition APK, puis copie dans le projet Android
npm run verify           # typecheck + lint + format + contenu + tests, en une commande
```

Écriture assistée des variantes, **depuis `apps/agri28`**, un seul axe par appel
(`ANTHROPIC_API_KEY` requise) :

```bash
npm run variantes -- --jour 7 --type apiculture    # axe métier (phase 10)
```

Après relecture, lever le drapeau `brouillon` sur les jours nommés (jamais « tous les jours »).
**Depuis `apps/agri28`** : ces deux commandes ne sont pas relayées à la racine.

```bash
npm run variantes -- --jour 7 --niveau debutant     # écrire
npm run variantes:valider -- --jours 8-14 --niveau tous   # publier après relecture
npm run variantes:valider -- --jours 21 --type apiculture
```

Dans `apps/agri28` uniquement : `npm run icons` (régénère les icônes PWA),
`npm run screenshots` (régénère les captures du README, `preview` devant tourner),
`npm run icons:android` (icônes et écran de démarrage Android),
`npm run apk:verifier` (sert les fichiers comme Capacitor et contrôle le comportement),
`npm run format` / `npm run format:check`.

L'APK lui-même est assemblé par le workflow **APK** de GitHub Actions : voir
[`docs/APK.md`](docs/APK.md).

---

## 7. Avancement des phases

| Phase | Objet | État |
|---|---|---|
| 0 | Cadrage : architecture, modèle de données, arborescence, schéma de leçon, stratégie RTL/i18n | terminée |
| 1 | Squelette : routage, i18n AR/FR + RTL, thème, PWA, écrans vides, tests de base | terminée |
| 2 | Moteur de parcours : leçons, minuteur, validation, progression, série, verrouillage, profil projet | terminée |
| 3 | Contenu semaine 1 (jours 1-7), FR + AR | terminée |
| 4 | Contenu semaines 2, 3, 4 (un GO entre chaque) | terminée |
| 5 | Dossier de projet, exports `.docx`/`.xlsx`, carnet, badges, certificat, rappels | terminée |
| 6 | Qualité : accessibilité, performance, hors ligne, relecture du contenu et des chiffres | terminée |
| 7 | Déploiement et documentation | terminée |
| 8a | Compte, essai de 3 leçons, verrouillage, écrans, service en mémoire | terminée |
| 8b | Branchement de Firebase, règles de sécurité, écran d'administration | terminée |
| 8c | Capacitor, APK signé construit par GitHub Actions | terminée |
| 8d | ~~Vitrine limitée aux 3 leçons~~ — **remplacée** par l'édition web complète (D71) | terminée |
| 8e | Édition web complète ; identifiant de compte lisible ; auto-activation de l'administrateur ; mot de passe oublié | terminée |
| 9 | Plusieurs dossiers : niveau de compte, écran des dossiers, demande et octroi | terminée |
| 10 | Parcours adapté au type d'activité ; écriture assistée des variantes | terminée |
| 11 | Notifications des demandes pour l'administrateur | terminée |
| 12 | Test de niveau avant le parcours ; profondeur des journées adaptée au niveau | terminée |
| 13 | Gestion des comptes par l'administrateur : liste complète, ouverture et fermeture d'accès, niveau accordé ou retiré | terminée |
| 14 | Connexion par Google et Facebook (édition web) ; texte de confidentialité révisé | terminée |
| 15 | Le quiz s'adapte aussi au métier ; D80 corrigée sur sa prémisse | terminée |
| 16 | Connexion Google **native** dans l'APK ; mise à jour sans désinstallation garantie et prouvée | code terminé — **non compilé** : en attente des secrets `APK_KEYSTORE_*` et `GOOGLE_SERVICES_JSON` |

### Méthode de travail imposée
Une phase à la fois. À la fin de chaque phase : résumé, tests, commit, puis **arrêt et attente d'un GO explicite**.
Ne jamais casser une fonctionnalité existante : tests avant et après chaque phase.
Toute décision qui appartient à l'utilisateur du projet est posée en question, jamais devinée.
