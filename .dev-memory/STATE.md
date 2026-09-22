# ÉTAT — WINBEST BACK-OFFICE
Dernière mise à jour : 2026-09-22 — Session 1

## Phase en cours
Phase 0 — Socle · Sous-étape : 0.1 Arborescence + docker-compose (terminée, en attente de GO pour 0.2)

## Fait
- [x] 0.1 Arborescence + docker-compose + .env.example + README + squelette backend/frontend minimal (dépôt git initialisé)

## En cours
- Aucun (en attente de GO pour 0.2)

## Prochaine action précise
0.2 — Connexion DB : configurer SQLAlchemy (engine/session dans backend/app/db/), initialiser Alembic (backend/alembic/), migration vide qui passe (`alembic upgrade head`).

## En attente de décision (Abdou)
- Frontend : React + Vite + TypeScript retenu par défaut (non fixé par le cahier des charges) — à confirmer ou changer.
- Spécifications VPS (CPU/RAM), domaine, sauvegarde externalisée — pas bloquant pour la Phase 0 (dev local avec docker-compose), mais nécessaire avant mise en prod.
- 6 décisions globales encore ouvertes listées dans `00_INDEX_Master_Prompts_Winbest.md` (comptabilité SCF, PWA offline, cible e-commerce, canaux marketing, reprise de données, specs VPS) — aucune ne bloque la Phase 0.

## Relancer l'environnement
cp .env.example .env   # puis éditer SECRET_KEY
docker-compose up -d
(à partir de 0.2 : + alembic upgrade head ; à partir de 0.7 : + python seed.py)
