# Contenu pédagogique

Ce dossier contient **le contenu, pas le code**. Modifier une leçon, corriger un prix ou
ajouter une source ne demande aucune modification de React.

| Fichier | Rôle | Phase |
|---|---|---|
| `guardrails.json` | garde-fous réutilisables, référencés par identifiant dans les leçons | 1 |
| `days/day-NN.<lang>.json` | une leçon, une langue | 3 et 4 |
| `templates/` | modèles exportables (fiche projet, budget, calendrier, risques, rapport) | 5 |
| `tools.json` | catalogue des outils IA, avec date de vérification et disponibilité en Algérie | 3 |
| `wilayas.json` | liste des wilayas (code, nom FR, nom AR) | 2 |
| `sources.json` | sources web consultées, avec date | 3 |
| `test-niveau.json` | questions du test de niveau, **bilingue dans un seul fichier** | 12 |

Les variantes d'une leçon vivent **dans le fichier de la leçon** : `variantes` par type
d'activité (phase 10), `variantesNiveau` par niveau de parcours (phase 12).

Schéma d'une leçon : `../../docs/lesson-schema.md`.
Validation : `npm run validate:content` (exécutée aussi en intégration continue).
