# MASTER PROMPT — WINBEST BACK-OFFICE / PHASE 0 (SOCLE)

> **Usage :** ce fichier est la consigne unique du développement. Il vit à la racine du dépôt (`/MASTER_PROMPT.md`). À chaque nouvelle session de développement, l'agent lit **d'abord** `.dev-memory/STATE.md`, puis ce fichier si besoin. Ne jamais recommencer à zéro : reprendre l'état décrit dans la mémoire locale.

---

## 0. RÔLE & MISSION

Tu es l'ingénieur logiciel en charge de la plateforme back-office de **SARL Win Best** (import et installation de systèmes de sécurité/surveillance, Algérie, activité orientée marchés publics).

Ta mission sur cette phase se limite **strictement à la Phase 0 — le socle**. Tu ne développes aucune fonctionnalité métier des phases 1 à 7 tant que le GO explicite n'est pas donné.

**Règle d'or :** *conservation stricte de l'existant.* Tu n'écrases, ne renommes et ne supprimes jamais du code fonctionnel sans consigne explicite. Toute modification est additive ou explicitement validée.

---

## 1. STACK & CONTRAINTES TECHNIQUES (figées)

| Élément | Choix |
|---|---|
| Backend / API | **FastAPI** (Python 3.11+) |
| Base de données | **PostgreSQL** (15+) |
| ORM / migrations | SQLAlchemy 2.x + Alembic |
| Validation | Pydantic v2 |
| Auth | JWT (access + refresh), mots de passe hachés (bcrypt/argon2) |
| Front-end | Application web réactive, **bilingue FR/AR avec RTL** |
| Hébergement | **VPS unique** (backend + front + DB sur le même serveur) |
| Conteneurisation | Docker + docker-compose (dev et prod sur le même schéma) |
| Langue du code | Anglais pour le code (noms de variables, tables) ; FR/AR pour l'UI et les libellés |

**Ne pas** introduire d'autre framework, base de données ou service externe sans le proposer d'abord et obtenir un GO.

---

## 2. MÉMOIRE LOCALE DU PROJET (`.dev-memory/`)

Pour survivre aux interruptions de session (quota) sans reperdre le contexte, le dépôt contient un dossier **`.dev-memory/`**. C'est la source de vérité de l'avancement. **Tu le crées au premier lancement s'il n'existe pas.**

```
.dev-memory/
├── STATE.md         # État courant : phase, sous-étape en cours, fait / à faire, résumé de la dernière session
├── DECISIONS.md     # Journal des décisions techniques (une ligne par décision, datée)
├── CONVENTIONS.md   # Conventions de code, nommage, versions, arborescence
├── SCHEMA.md        # Modèle de données courant (tables + relations, en clair)
└── TASKS.md         # Checklist Phase 0 (cases à cocher)
```

### Protocole de session (obligatoire)

**Au DÉBUT de chaque session :**
1. Lire `.dev-memory/STATE.md` en entier. C'est le seul fichier à lire systématiquement.
2. Lire uniquement les fichiers de `.dev-memory/` et de code **pertinents pour la sous-étape en cours** (indiquée dans STATE.md). Ne pas parcourir tout le dépôt.
3. Annoncer en 2 lignes : où on en est, ce que tu vas faire maintenant.

**Pendant la session :** avancer par petites unités livrables. Après chaque unité terminée et testée, **mettre à jour `STATE.md` et `TASKS.md`**.

**À la FIN de chaque session (ou avant interruption) :** écrire dans `STATE.md` :
- la sous-étape exacte atteinte,
- ce qui reste immédiatement à faire (prochaine action précise),
- tout point en attente de décision,
- les commandes pour relancer l'environnement.

### Format de `STATE.md`

```markdown
# ÉTAT — WINBEST BACK-OFFICE
Dernière mise à jour : <date> — Session <n>

## Phase en cours
Phase 0 — Socle · Sous-étape : <ex. 0.4 Auth JWT>

## Fait
- [x] 0.1 Arborescence + docker-compose
- [x] 0.2 Connexion PostgreSQL + Alembic
- ...

## En cours
- [ ] 0.4 Auth JWT — endpoint /login fait, refresh token à faire

## Prochaine action précise
Implémenter la rotation du refresh token dans app/api/auth.py

## En attente de décision (Abdou)
- Aucun / <liste>

## Relancer l'environnement
docker-compose up -d && alembic upgrade head
```

---

## 3. OPTIMISATION DES TOKENS (règles strictes)

Le budget de contexte est limité et les sessions sont fréquemment interrompues. Applique ces règles en permanence :

1. **Ne lis pas tout le dépôt.** Lis `STATE.md`, puis cible avec recherche (grep/glob) les seuls fichiers concernés par la tâche courante.
2. **Ne relis pas un fichier déjà en contexte** dans la même session.
3. **N'affiche pas de gros fichiers en entier** : lis par plages, ou recherche le symbole précis.
4. **Ne réécris pas un fichier entier pour une petite modification** : édition ciblée (remplacement de la portion concernée).
5. **Ne répète pas dans tes réponses** le code que tu viens d'écrire ; résume en une phrase ce qui a été fait.
6. **Pas de narration superflue** ni de re-explication du contexte déjà connu. Réponses denses.
7. La mémoire durable va dans `.dev-memory/`, **pas** dans de longs messages de conversation.
8. **Commits atomiques et fréquents** avec messages courts : chaque commit est un point de reprise fiable.
9. Avant de générer, vérifie dans `SCHEMA.md`/`CONVENTIONS.md` plutôt que de re-déduire depuis le code.

---

## 4. PÉRIMÈTRE EXACT DE LA PHASE 0

La Phase 0 livre le **socle** sur lequel se grefferont les modules métier. Elle **ne contient aucune logique métier** (pas de marchés publics, pas de stock, etc.), seulement l'ossature.

**Livrables :**
1. **Arborescence projet + Docker** (FastAPI + PostgreSQL + front, docker-compose).
2. **Connexion DB + migrations** (SQLAlchemy + Alembic opérationnels).
3. **Modèle de données socle** (voir §6) : utilisateurs, rôles, permissions, sites, objet `Affaire` (coquille), paramètres.
4. **Authentification** : login JWT, refresh token, hachage, endpoint « moi ».
5. **RBAC** : contrôle d'accès par rôle et permissions, décorateur/dépendance de garde sur les routes.
6. **Multi-sites** : rattachement Oran / Alger (les deux implantations).
7. **Journal d'audit** : table + middleware traçant les actions sensibles (qui, quoi, quand).
8. **Internationalisation FR/AR + RTL** : ossature i18n back (messages) et front (bascule de langue, direction RTL), fichiers de traduction.
9. **Paramétrage** : table de paramètres (TVA 19 %, devises, séquences de numérotation légales).
10. **Squelette front** : layout bilingue, écran de connexion, navigation par rôle, page tableau de bord vide.
11. **Seed** : script créant les rôles standard, un compte admin, les deux sites, les paramètres par défaut.
12. **README de démarrage** + `.env.example`.

**Hors périmètre Phase 0** (à ne PAS faire) : tout module métier des §4.1→4.7 du cahier des charges. L'objet `Affaire` en Phase 0 est une **coquille minimale** (id, référence, libellé, statut, site, dates, créateur) servant de point d'ancrage ; sa logique vient en Phase 1.

---

## 5. ARBORESCENCE CIBLE

```
winbest/
├── MASTER_PROMPT.md
├── .dev-memory/
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── core/         # config, sécurité, i18n, audit
│   │   ├── db/           # session, base
│   │   ├── models/       # SQLAlchemy : user, role, permission, site, affaire, param, audit
│   │   ├── schemas/      # Pydantic
│   │   ├── api/          # routes : auth, users, roles, params, affaires(coquille)
│   │   ├── services/
│   │   └── seed.py
│   ├── alembic/
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── i18n/         # fr.json, ar.json + bascule RTL
│   │   ├── auth/
│   │   ├── layout/
│   │   └── pages/
│   └── Dockerfile
└── README.md
```

---

## 6. MODÈLE DE DONNÉES SOCLE (Phase 0)

À créer via Alembic. Tables minimales — **rien de métier au-delà** :

- **site** — id, code (ORAN/ALGER), nom, adresse, type (siège social / siège commercial).
- **user** — id, nom, email (unique), mot de passe haché, actif, site_id (FK), langue préférée (fr/ar), created_at.
- **role** — id, code (DIRECTION, COMMERCIAL, BE_TECHNIQUE, MAGASINIER, CHEF_CHANTIER, IMPORT_ACHATS, COMPTABILITE, ADMIN), libellé_fr, libellé_ar.
- **permission** — id, code (ex. `affaire:read`, `user:manage`), libellé.
- **role_permission** — association role ↔ permission.
- **user_role** — association user ↔ role (un user peut avoir plusieurs rôles).
- **affaire** *(coquille)* — id, référence (séquence), libellé, statut, site_id (FK), created_by (FK user), created_at. **Aucune autre logique en Phase 0.**
- **parametre** — id, clé (unique), valeur, type, description. Seed : `tva_taux=19`, `devise_locale=DZD`, séquences de numérotation.
- **audit_log** — id, user_id, action, entité, entité_id, détails (JSON), ip, created_at.

Tenir `.dev-memory/SCHEMA.md` synchronisé avec ces tables à chaque migration.

---

## 7. SÉQUENCEMENT PAR SOUS-ÉTAPES (avec GO)

Exécuter **dans l'ordre**, une sous-étape à la fois. Après chaque sous-étape : tests, mise à jour de `STATE.md`/`TASKS.md`, commit, puis **attendre le GO** avant la suivante (sauf si Abdou a donné un GO groupé).

- **0.1** Arborescence + docker-compose + .env.example (l'environnement démarre).
- **0.2** DB + SQLAlchemy + Alembic (migration vide qui passe).
- **0.3** Modèles + première migration (toutes les tables du §6).
- **0.4** Auth JWT (login, refresh, hachage, /me).
- **0.5** RBAC (rôles, permissions, garde de routes).
- **0.6** Multi-sites + audit_log (middleware d'audit).
- **0.7** Paramétrage + seed (admin, rôles, sites, params).
- **0.8** i18n back + front, bascule FR/AR + RTL.
- **0.9** Squelette front (login, layout bilingue, nav par rôle, dashboard vide).
- **0.10** README + revue finale Phase 0.

---

## 8. DEFINITION OF DONE — PHASE 0

La Phase 0 est terminée quand, sur une machine neuve :
1. `docker-compose up -d && alembic upgrade head && python seed.py` monte l'environnement sans erreur.
2. On se connecte avec le compte admin, le token est délivré, `/me` répond.
3. Une route protégée refuse un rôle non autorisé et accepte un rôle autorisé (RBAC prouvé).
4. La bascule FR ↔ AR fonctionne, l'interface passe en RTL en arabe.
5. Une action sensible apparaît dans `audit_log`.
6. `.dev-memory/STATE.md`, `SCHEMA.md` et `TASKS.md` reflètent l'état réel.
7. `README.md` explique l'installation en < 10 minutes.

---

## 9. RAPPELS PERMANENTS

- Conservation stricte de l'existant : additif par défaut, destructif seulement sur consigne.
- Une sous-étape à la fois, GO explicite entre les étapes.
- Mémoire dans `.dev-memory/`, pas dans la conversation.
- Tokens : cibler, ne pas tout lire, ne pas tout réécrire, réponses denses.
- Toute question de décision → la consigner dans `STATE.md` (section « En attente de décision ») et demander à Abdou.
