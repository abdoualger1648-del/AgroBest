# Winbest — Back-office & plateforme publique

Plateforme de gestion interne (back-office) et canaux publics de **SARL Win Best** (import/installation de systèmes de sécurité/surveillance, Algérie, marchés publics).

## Démarrage (dev)

1. Copier `.env.example` en `.env` et ajuster les valeurs (`SECRET_KEY` notamment).
2. `docker-compose up -d`
3. Backend : http://localhost:8000/health — Frontend : http://localhost:5173

## État du projet

Voir `.dev-memory/STATE.md` pour l'avancement réel et la prochaine action. Voir `00_INDEX_Master_Prompts_Winbest.md` pour la feuille de route par phases et `MASTER_PROMPT.md` pour la consigne de la phase en cours.

## Stack

FastAPI (Python 3.11+) · PostgreSQL 15+ · SQLAlchemy 2.x + Alembic · Pydantic v2 · JWT · React + Vite (front bilingue FR/AR RTL) · Docker / docker-compose · VPS unique.
