# MASTER PROMPT — WINBEST BACK-OFFICE / PHASE 6 (COMPTABILITÉ)

> Consigne unique de la Phase 6. Lire **d'abord** `.dev-memory/STATE.md`. Se greffe sur toutes les phases précédentes, en particulier la Phase 5 (documents et flux) et la Phase 2 (achats/import).

---

## 0. RÔLE, RÈGLE D'OR & PRÉREQUIS

Tu développes le module **Comptabilité** conforme au **SCF** (Système Comptable Financier algérien). **Prérequis :** Phases 0, 1, 2, 5 « Done » (les factures, encaissements et coûts d'import alimentent les écritures).

**Règle d'or :** conservation stricte de l'existant.

---

## 1. ⚠️ POINT DE DÉCISION PRÉALABLE (à trancher avant 6.1)

Décision d'Abdou : **comptabilité complète**. Deux mises en œuvre possibles — confirmer laquelle avant de coder, et l'inscrire dans `DECISIONS.md` :

- **Option A — SCF complet intégré** : la plateforme tient la comptabilité (journaux, grand livre, balance, bilan, compte de résultat, TVA/G50, immobilisations/amortissements). Périmètre lourd, autonomie totale.
- **Option B — Socle comptable + export** : la plateforme génère les écritures et un **export** vers un logiciel comptable dédié (format d'échange), sans tenir les états légaux elle-même. Plus léger, s'appuie sur l'outil du comptable.

> Tant que ce choix n'est pas confirmé, ne pas démarrer 6.1. Le reste de ce prompt décrit l'**Option A** (la plus complète) ; l'Option B en est un sous-ensemble (entités « écriture » + module d'export, sans états légaux).

---

## 2. MODÈLE DE DONNÉES — PHASE 6 (Option A)

Migrations additives ; `.dev-memory/SCHEMA.md` à jour.

- **compte** — id, numéro (plan SCF), libellé_fr, libellé_ar, classe (1–7), type, parent_id (arborescence). *(Seed du plan comptable SCF.)*
- **journal** — id, code (ACH / VTE / BQ / CA / OD…), libellé.
- **exercice** — id, année, date_début, date_fin, statut (ouvert / clôturé).
- **ecriture** — id, journal_id (FK), date, référence, libellé, exercice_id (FK), pièce_source (type + id : facture, encaissement, dédouanement…), validée (bool).
- **ligne_ecriture** — id, ecriture_id (FK), compte_id (FK), libellé, débit, crédit, tiers_id (FK, nullable). *(Contrainte : Σ débit = Σ crédit par écriture.)*
- **tiers** — id, type (client / fournisseur), référence, compte_collectif_id (FK). *(Relie clients Phase 5 et fournisseurs Phase 2.)*
- **immobilisation** — id, libellé, compte_id, date_acquisition, valeur, durée_amortissement, méthode (linéaire…), taux.
- **amortissement** — id, immobilisation_id (FK), exercice_id, dotation, cumul, vnc.
- **declaration_tva** *(G50)* — id, période, tva_collectée, tva_déductible, tva_à_payer, statut.

---

## 3. RÈGLES MÉTIER

1. **Écritures automatiques** depuis l'amont : facture émise (Phase 5) → écriture de vente (client / produit / TVA collectée) ; encaissement → banque/caisse ; achat import (Phase 2) → écritures d'achat, TVA import, droits ; sortie de stock/consommation → écritures de stock si comptabilité de stock activée.
2. **Partie double** : toute écriture équilibrée (Σ débit = Σ crédit), sinon rejet.
3. **Plan SCF** : respect de la codification par classes 1 à 7.
4. **TVA / G50** : agrégation TVA collectée (ventes) et déductible (achats) par période → déclaration.
5. **Immobilisations** : plan d'amortissement, dotations par exercice.
6. **États légaux** (Option A) : grand livre, balance, bilan, compte de résultat par exercice.
7. **Clôture d'exercice** : verrouillage des écritures, report des soldes.
8. **Traçabilité** : lien écriture ↔ pièce source, écritures validées non modifiables (extourne uniquement).

---

## 4. API & RBAC

Permissions : `compta:read`, `ecriture:manage`, `ecriture:valider`, `tva:manage`, `immo:manage`, `exercice:cloturer`, `etats:read`, `export_compta`.
Rôles : **Comptabilité** (tout le module), **Direction** (états, lecture). Accès strict — le module comptable est sensible.
Routes : `/comptes`, `/journaux`, `/exercices`, `/ecritures`, `/tiers`, `/immobilisations`, `/tva`, `/etats` (grand livre, balance, bilan, résultat), `/export`.

---

## 5. UI (bilingue FR/AR RTL)

- Saisie et consultation des écritures par journal.
- Grand livre, balance, consultation par compte/tiers.
- Bilan et compte de résultat par exercice *(présentation d'états : appliquer dataviz pour les synthèses, xlsx pour l'export)*.
- Déclaration TVA/G50 par période.
- Immobilisations et amortissements.
- (Option B) Écran d'export vers le logiciel comptable.

---

## 6. SÉQUENCEMENT PAR SOUS-ÉTAPES (avec GO)

> Confirmer d'abord Option A ou B (§1).

- **6.0** Décision A/B consignée dans `DECISIONS.md`.
- **6.1** Plan comptable SCF + journaux + exercice (seed du plan).
- **6.2** Écritures + lignes + contrôle partie double + tiers.
- **6.3** Écritures automatiques depuis factures/encaissements (Phase 5).
- **6.4** Écritures automatiques depuis achats/import (Phase 2) + TVA.
- **6.5** (A) États légaux : grand livre, balance, bilan, compte de résultat.
- **6.6** (A) TVA/G50 + immobilisations/amortissements.
- **6.7** (B) ou complément : module d'export vers logiciel comptable.
- **6.8** UI comptabilité + états ; clôture d'exercice.
- **6.9** Revue Phase 6, tests, mémoire.

---

## 7. DEFINITION OF DONE — PHASE 6

**Commun :** une facture (Phase 5) et un achat import (Phase 2) génèrent des écritures équilibrées, rattachées à leur pièce source ; RBAC strict ; `audit_log` alimenté ; mémoire à jour.

**Option A :** grand livre, balance, bilan et compte de résultat cohérents sur un exercice de test ; déclaration TVA/G50 calculée ; un amortissement doté ; clôture d'exercice verrouille les écritures.

**Option B :** l'export produit un fichier conforme au format attendu par le logiciel comptable cible, réimportable sans erreur.

---

## 8. POINTS À CONFIRMER (STATE.md)

- **Option A ou B** (bloquant).
- Si B : logiciel comptable cible et format d'export exact.
- Plan comptable SCF à charger (standard ou adapté Win Best).
- Comptabilité de stock permanente ou inventaire intermittent.
- Règles d'amortissement usuelles.

---

## 9. RAPPELS PERMANENTS

Conservation stricte · GO par sous-étape (et décision A/B avant 6.1) · mémoire `.dev-memory/` · règles tokens · module sensible : accès restreint, écritures validées non modifiables · décisions → `STATE.md`.
