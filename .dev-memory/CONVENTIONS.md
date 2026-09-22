# CONVENTIONS

## Code
- Code (variables, tables, modules) en anglais. Libellés UI en FR/AR (fichiers i18n).
- Backend : Python 3.11+, FastAPI, SQLAlchemy 2.x (style déclaratif `Mapped`/`mapped_column`), Alembic pour toute migration, Pydantic v2 pour les schémas.
- Frontend : React 18 + TypeScript + Vite. Composants fonctionnels, hooks. i18next pour FR/AR, bascule de direction RTL sur `<html dir>`.

## Arborescence
```
winbest/ (racine = D:\WinBest)
├── MASTER_PROMPT.md              # phase active
├── 00_INDEX_Master_Prompts_Winbest.md
├── MASTER_PROMPT_Winbest_PhaseN*.md
├── .dev-memory/
├── docker-compose.yml
├── .env.example
├── backend/app/{core,db,models,schemas,api,services}
├── backend/alembic/
└── frontend/src/{i18n,auth,layout,pages}
```

## Nommage DB
- Tables au singulier, snake_case (`user`, `role`, `permission`, `role_permission`, `user_role`, `affaire`, `parametre`, `audit_log`).
- Clés étrangères : `<table>_id`.

## Versions
- Python 3.11+, PostgreSQL 15+, Node 20+, FastAPI 0.115.x, SQLAlchemy 2.0.x, Alembic 1.14.x, React 18.3.x, Vite 5.4.x.

## Git
- Commits atomiques, messages courts et descriptifs, un commit par sous-étape (ou unité livrable) validée et testée.
