# MASTER PROMPT — WINBEST BACK-OFFICE / PHASE 5 (FACTURATION & DOCUMENTS)

> Consigne unique de la Phase 5. Lire **d'abord** `.dev-memory/STATE.md`. Se greffe sur les Phases 0, 1, 3, 4 (les documents s'appuient sur les Affaires, marchés, situations, livraisons et le catalogue).

---

## 0. RÔLE, RÈGLE D'OR & PRÉREQUIS

Tu développes le module **Facturation & génération documentaire** : production des pièces commerciales et réglementaires conformes au droit algérien, en français, arabe ou bilingue, avec numérotation légale et suivi des encaissements.

**Règle d'or :** conservation stricte de l'existant. **Prérequis :** Phases 0, 1, 3, 4 « Done ». La comptabilité (Phase 6) consommera ces écritures — la Phase 5 ne fait pas la compta, elle produit les documents et les flux.

---

## 1. OBJECTIF FONCTIONNEL

Générer devis, facture proforma, facture conforme (mentions légales NIF/NIS/RC/AI, TVA 19 %), avoir, bon de livraison et PV, à partir des données déjà saisies (Affaire, DQE/BPU, marché, situations, sorties de stock). Assurer une numérotation légale continue et le suivi des paiements.

---

## 2. MODÈLE DE DONNÉES — PHASE 5

Migrations additives ; `.dev-memory/SCHEMA.md` à jour.

- **client** — id, raison_sociale, type (public / privé), nif, nis, rc, ai, adresse, wilaya, contacts. *(Fusionne/relie `organisme` de la Phase 1 pour les donneurs d'ordre publics.)*
- **document_commercial** — id, type (devis / proforma / facture / avoir / bon_livraison / pv), numéro (séquence légale), date, client_id (FK), affaire_id (FK, nullable), marche_id (FK, nullable), situation_id (FK, nullable), statut (brouillon / émis / envoyé / payé / annulé), montant_ht, tva_taux, montant_tva, montant_ttc, remise, timbre_fiscal, devise, langue (fr / ar / bilingue), notes.
- **ligne_document** — id, document_id (FK), produit_id (FK, nullable), désignation, quantité, unité, prix_unitaire_ht, remise_ligne, montant_ht.
- **sequence_numerotation** — id, type_document, année, préfixe, dernier_numéro. *(Numérotation légale continue et paramétrable.)*
- **encaissement** — id, document_id (FK, facture), date, montant, mode (virement / chèque / espèces / effet), référence, banque.
- **echeance** — id, document_id (FK), date_échéance, montant, statut (à_échoir / échue / réglée). *(Suivi clients ; miroir fournisseurs relié à la Phase 2.)*
- **modele_document** — id, type, langue, gabarit (référence template). *(Templates FR/AR RTL pour le rendu.)*

---

## 3. RÈGLES MÉTIER

1. **Génération depuis l'amont** : un devis peut naître du DQE (Phase 1) ; une facture d'un marché/situation (Phase 1) ou d'un bon de livraison (Phase 3/4) — reprise automatique des lignes.
2. **Mentions légales obligatoires** sur les factures : NIF, NIS, RC, AI de Win Best et du client, TVA 19 %, timbre fiscal si paiement espèces.
3. **Numérotation légale** continue par type et par année, sans trou ni doublon (séquence verrouillée).
4. **TVA** : calcul au taux paramétré (19 % par défaut), ventilable par ligne si taux multiples.
5. **Avoir** : rattaché à une facture d'origine, montants négatifs.
6. **Encaissements & échéances** : une facture passe `payé` quand la somme des encaissements couvre le TTC ; échéances en retard signalées.
7. **Rendu documentaire** FR/AR RTL, exportable ; documents officiels en arabe standard (فصحى).

---

## 4. GÉNÉRATION DES DOCUMENTS

- Rendu **Word (.docx) et/ou PDF**, gabarits bilingues RTL — appliquer les skills **docx** et **pdf** ; export de bordereaux/états via **xlsx**.
- Templates paramétrables (en-tête Win Best, mentions légales, pied de page, cachet/signature).
- Cohérence stricte entre les données de la plateforme et le document produit (pas de ressaisie).

---

## 5. API & RBAC

Permissions : `document:read/manage`, `facture:emettre`, `encaissement:manage`, `sequence:manage`.
Rôles : **Comptabilité** (factures, encaissements, séquences), **Commercial** (devis, proforma), **Direction** (validation, lecture), **Magasinier** (bons de livraison).
Routes : `/clients`, `/documents`, `/lignes-document`, `/sequences`, `/encaissements`, `/echeances`, `/modeles`. Endpoint de génération de fichier (docx/pdf) par document.

---

## 6. UI (bilingue FR/AR RTL)

- Liste des documents par type et statut ; création depuis une Affaire/marché/situation.
- Éditeur de document (lignes, remises, TVA, langue) avec aperçu.
- Bouton « générer » (Word/PDF) et envoi.
- Tableau des encaissements et échéancier clients (retards en évidence).
- Paramétrage des séquences et des modèles.

---

## 7. SÉQUENCEMENT PAR SOUS-ÉTAPES (avec GO)

- **5.1** Modèles + migration : client, document_commercial, ligne_document, sequence_numerotation.
- **5.2** API documents + reprise automatique des lignes depuis l'amont (DQE, marché, BL).
- **5.3** Numérotation légale verrouillée + règles de mentions et TVA.
- **5.4** Génération docx/pdf bilingue RTL (templates).
- **5.5** Encaissements + échéances + statut payé.
- **5.6** UI documents / encaissements / paramétrage.
- **5.7** Seed (permissions, séquences, modèles) + démonstration.
- **5.8** Revue Phase 5, tests, mémoire.

---

## 8. DEFINITION OF DONE — PHASE 5

1. Générer un devis depuis un DQE, puis une facture conforme depuis un marché/situation, avec toutes les mentions légales et TVA 19 %.
2. La numérotation est continue, sans trou ni doublon.
3. Produire les fichiers Word et PDF bilingues, RTL correct en arabe.
4. Enregistrer des encaissements → la facture passe `payé` ; une échéance en retard est signalée.
5. Émettre un avoir rattaché à une facture.
6. RBAC respecté ; émissions dans `audit_log` ; mémoire à jour.

---

## 9. POINTS À CONFIRMER (STATE.md)

- Mentions légales exactes et gabarit visuel (logo, cachet) de Win Best.
- Règle du timbre fiscal (paiements espèces) à appliquer.
- Langue par défaut par type de document (devis, facture…).
- Numérotation : préfixes et format souhaités.

---

## 10. RAPPELS PERMANENTS

Conservation stricte · GO par sous-étape · mémoire `.dev-memory/` · règles tokens · décisions → `STATE.md`.
