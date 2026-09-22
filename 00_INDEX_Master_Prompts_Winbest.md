# WINBEST BACK-OFFICE — SUITE DE MASTER PROMPTS (INDEX)

Projet : plateforme de gestion interne (back-office) + canaux publics de **SARL Win Best** — import et installation de systèmes de sécurité/surveillance, Algérie, activité orientée **marchés publics**, avec une extension **vitrine / e-commerce / marketing**.

Ce dossier réunit la préparation complète du développement. **Aucun code n'est encore écrit** : ce sont les consignes de pilotage, phase par phase. Le lancement du développement vient ensuite.

---

## Documents de référence

- **Cahier_des_Charges_Winbest.docx** — le périmètre validé (contexte, modules, rôles, architecture, feuille de route, points de décision).
- **Skill `winbest-dev`** (compte Claude) — méthode de travail auto-déclenchée : conservation de l'existant, protocole de mémoire locale `.dev-memory/`, règles d'optimisation des tokens, discipline de phase.

## Les master prompts (ordre d'exécution)

| Ordre | Fichier | Objet | Dépend de |
|---|---|---|---|
| 0 | MASTER_PROMPT_Winbest_Phase0.md | Socle : archi, auth JWT, RBAC, multi-sites, audit, i18n FR/AR RTL, objet Affaire (coquille), paramétrage | — |
| 1 | MASTER_PROMPT_Winbest_Phase1.md | Marchés publics : pipeline AO, dossiers (BPU/DQE), exécution (OS, situations, réceptions), cautions | 0 |
| 2 | MASTER_PROMPT_Winbest_Phase2.md | Achats & import : commandes fournisseurs, domiciliation, dédouanement, coût de revient débarqué | 0, 1 |
| 3 | MASTER_PROMPT_Winbest_Phase3.md | Stock & catalogue : catalogue, numéros de série & garanties, multi-dépôts, mouvements valorisés | 0, 1, 2 |
| 4 | MASTER_PROMPT_Winbest_Phase4.md | Chantiers & SAV : planning, équipes, consommation matériel, PV, contrats & tickets d'intervention | 0, 1, 3 |
| 5 | MASTER_PROMPT_Winbest_Phase5.md | Facturation & documents : devis, proforma, factures conformes, BL, PV, encaissements (FR/AR) | 0, 1, 3, 4 |
| 6 | MASTER_PROMPT_Winbest_Phase6.md | Comptabilité SCF (⚠️ décision A complet / B socle + export, avant 6.1) | 0, 1, 2, 5 |
| 7 | MASTER_PROMPT_Winbest_Phase7.md | Portail client public : vitrine + demande de devis alimentant le pipeline | 0, 1, 3 |
| 8 | MASTER_PROMPT_Winbest_Phase8_Ecommerce.md | Vitrine enrichie & e-commerce : boutique stock-aware, paiement Algérie (COD, CIB/Edahabia), offres & packs | 0, 3, 5, (7) |
| 9 | MASTER_PROMPT_Winbest_Phase9_Marketing.md | Marketing & communication : campagnes, promotions, réseaux sociaux, fidélité, analytics | 7, 8 |
| 10 | MASTER_PROMPT_Winbest_Phase10_Offre_ServiceClient.md | Offre élargie (produits, services, logiciels, prestations sur devis) + communication service client (chat, WhatsApp, demandes, abonnements/licences) | 3, 5, 7, 8, (9) |

> Les Phases 7 → 10 forment le **volet public/commercial** ; elles peuvent être menées en parallèle du volet gestion (2 → 6) une fois le socle (0) et le catalogue/stock (3) en place, selon la priorité d'Abdou. La Phase 10 affine la nature de l'offre de la vitrine : au-delà du matériel, elle couvre les services, les logiciels et les prestations sur mesure nécessitant un échange avec le service client.

## Skills spécialisées par phase (rappel)

- **artifact-design / artifact-diagramming** : maquettes vitrine, tunnel d'achat, landing pages, bannières (Phases 7, 8, 9).
- **dataviz** : tableaux de bord (marchés, stock, ventes, marketing) — Phases 2, 6, 8, 9.
- **docx / pdf** : documents réglementaires et supports (Phases 5, 8, 9).
- **xlsx** : imports/exports catalogue, coût de revient, segments, rapports (Phases 2, 3, 8, 9).
- Toutes chargées **avant** le code concerné.

## Principes communs à tous les prompts

- **Une phase, puis une sous-étape à la fois**, avec un **GO explicite** entre chaque (sauf GO groupé).
- **Conservation stricte de l'existant** : additif par défaut, destructif seulement sur consigne.
- **Mémoire locale `.dev-memory/`** (STATE, DECISIONS, CONVENTIONS, SCHEMA, TASKS) = source de vérité entre sessions.
- **Optimisation des tokens** : cibler les fichiers, ne pas tout lire, éditer par portion, réponses denses, commits atomiques.
- **Stack figée** : FastAPI + PostgreSQL + front bilingue FR/AR RTL, VPS unique, Docker.
- **Séparation stricte public/interne** pour tout le volet exposé (Phases 7–9).
- Toute décision structurante ou irréversible → consignée dans `STATE.md` et remontée à Abdou.

## Décisions globales encore ouvertes (rappel)

1. Comptabilité : **Option A (SCF complet)** ou **B (socle + export)** — bloquant pour la Phase 6.
2. Saisie terrain **hors-ligne** (PWA) pour les chantiers — impacte la Phase 4.
3. E-commerce : cible **B2C / B2B / mixte** ; accès **SATIM** (CIB/Edahabia) disponible ou COD d'abord — impacte la Phase 8.
4. Marketing : canaux prioritaires (email/SMS/WhatsApp), programme de fidélité activé ou non — Phase 9.
5. Reprise des données existantes (catalogue, clients) — format des fichiers.
6. Spécifications **VPS** (CPU/RAM), domaine, sauvegarde externalisée.

## Prochaine étape

Préparation terminée (0 → 10). Le développement démarre par la **Phase 0, sous-étape 0.1**, après GO : créer le dépôt, initialiser `.dev-memory/`, déposer les master prompts à la racine, suivre le séquencement.
