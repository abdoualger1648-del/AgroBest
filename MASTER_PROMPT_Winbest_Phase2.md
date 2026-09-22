# MASTER PROMPT — WINBEST BACK-OFFICE / PHASE 2 (ACHATS & IMPORT)

> Consigne unique de la Phase 2. Lire **d'abord** `.dev-memory/STATE.md`. Se greffe sur les Phases 0 (socle) et 1 (marchés publics) — l'objet `Affaire` existe et porte les marchés.

---

## 0. RÔLE, RÈGLE D'OR & PRÉREQUIS

Tu développes le module **Achats & Import** : approvisionnement des équipements auprès de fournisseurs étrangers, gestion du circuit d'importation algérien (domiciliation, dédouanement) et calcul du **coût de revient débarqué** en dinars.

**Règle d'or :** conservation stricte de l'existant, additif par défaut. **Prérequis :** Phases 0 et 1 « Done ». Sinon, consigner dans `STATE.md` et revenir.

---

## 1. OBJECTIF FONCTIONNEL

Chaque commande fournisseur est rattachée à une Affaire (traçabilité affaire → commande → dédouanement → coût de revient → stock). Le module doit produire un **coût unitaire réel débarqué** par référence, incluant tous les frais du circuit import, afin de fiabiliser les marges des marchés.

---

## 2. MODÈLE DE DONNÉES — PHASE 2

Migrations Alembic additives ; mettre `.dev-memory/SCHEMA.md` à jour.

- **fournisseur** — id, nom, type (étranger / local), pays, devise_habituelle, incoterm_habituel (FOB / EXW / CIF…), contacts, conditions_paiement, notes.
- **commande_fournisseur** *(PO)* — id, numéro, fournisseur_id (FK), affaire_id (FK, nullable), date, incoterm, devise, taux_change_prévisionnel, montant_devise, statut (brouillon / confirmée / expédiée / arrivée / dédouanée / réceptionnée), site_destination_id, notes.
- **ligne_commande** — id, commande_id (FK), désignation, référence_produit (nullable en Phase 2, liée au catalogue en Phase 3), quantité, prix_unitaire_devise, poids_unitaire (kg), montant_devise (calculé).
- **domiciliation** — id, commande_id (FK), banque, numéro_domiciliation, date_ouverture, montant_devise, taux_change_domiciliation, frais_bancaires, statut (ouverte / apurée), date_apurement.
- **dedouanement** — id, commande_id (FK), numéro_déclaration (D), date, valeur_caf_dzd, taux_change_douane, frais_transit, frais_manutention, autres_frais, statut.
- **ligne_dedouanement** — id, dedouanement_id (FK), ligne_commande_id (FK), position_tarifaire_sh, taux_droits_douane (%), montant_droits, base_tva, tva_import (19 %), autres_taxes.
- **cout_revient** — id, ligne_commande_id (FK), fob_dzd, fret_réparti, assurance_répartie, droits_douane, tva_import, transit_réparti, frais_bancaires_répartis, cout_unitaire_debarque_dzd (calculé), quantité, date_calcul. *(Alimente la valorisation du stock en Phase 3.)*

---

## 3. RÈGLES MÉTIER (calcul du coût de revient)

1. **Conversion devise** : tous les montants convertis en DZD au taux retenu (domiciliation ou douane selon le poste).
2. **Répartition des frais communs** (fret, assurance, transit, manutention) sur les lignes **au prorata** — méthode paramétrable : par valeur ou par poids. Défaut : au prorata de la valeur FOB.
3. **Droits de douane** par ligne selon la position tarifaire (SH) : `base × taux`.
4. **TVA import 19 %** sur la base (valeur CAF + droits de douane).
5. **Coût unitaire débarqué** = (FOB + fret réparti + assurance répartie + droits + TVA import + transit réparti + frais bancaires répartis) ÷ quantité, en DZD.
6. **Contrôle** : la somme des coûts de revient des lignes doit égaler le total des débours de la commande (réconciliation).
7. **Rattachement Affaire** : le coût de revient réel remonte sur l'Affaire pour comparer coût prévu (DQE) vs coût réel → marge.

---

## 4. API & RBAC

Nouvelles permissions : `fournisseur:read/manage`, `commande:read/manage`, `domiciliation:manage`, `dedouanement:manage`, `cout_revient:read`.
Rôle principal : **Import/achats** (tout le module) ; **Comptabilité** (domiciliation, lecture coût) ; **Direction** (lecture, marges) ; **Magasinier** (réception → déclenche Phase 3).
Groupes de routes : `/fournisseurs`, `/commandes`, `/domiciliations`, `/dedouanements`, `/couts-revient`. CRUD + transitions de statut + endpoint de calcul du coût de revient.

---

## 5. UI (bilingue FR/AR RTL)

- Liste des commandes fournisseurs par statut et par Affaire.
- Fiche commande : lignes, incoterm, devise, suivi logistique (expédiée → dédouanée → réceptionnée).
- Écran domiciliation et dédouanement.
- **Écran coût de revient** : tableau détaillé par ligne avec ventilation des frais et coût unitaire débarqué (cellules d'entrée modifiables en bleu/jaune, cohérent avec les habitudes Abdou). *(Graphiques éventuels : appliquer la skill dataviz ; export tableur : skill xlsx.)*
- Comparatif coût prévu (DQE) vs coût réel par Affaire.

---

## 6. SÉQUENCEMENT PAR SOUS-ÉTAPES (avec GO)

- **2.1** Modèles + migration : fournisseur, commande_fournisseur, ligne_commande.
- **2.2** API commandes + suivi de statut logistique + rattachement Affaire.
- **2.3** Domiciliation (modèle + API).
- **2.4** Dédouanement + lignes (position tarifaire, droits, TVA import).
- **2.5** Moteur de calcul du coût de revient (répartition paramétrable, réconciliation).
- **2.6** UI commandes / domiciliation / dédouanement / coût de revient + comparatif DQE vs réel.
- **2.7** Extension seed (permissions) + jeu de démonstration.
- **2.8** Revue Phase 2, tests, mise à jour mémoire.

---

## 7. DEFINITION OF DONE — PHASE 2

1. Créer une commande fournisseur rattachée à une Affaire, la faire progresser jusqu'à « dédouanée ».
2. Saisir domiciliation + déclaration douane avec positions tarifaires → droits et TVA import calculés.
3. Le coût unitaire débarqué se calcule par ligne, la réconciliation avec les débours totaux est cohérente.
4. Le comparatif coût prévu (DQE) vs réel s'affiche sur l'Affaire.
5. RBAC respecté ; transitions sensibles dans `audit_log`.
6. Mémoire (`STATE.md`, `SCHEMA.md`, `TASKS.md`, `DECISIONS.md`) à jour.

---

## 8. POINTS À CONFIRMER (STATE.md)

- Méthode de répartition des frais par défaut (valeur vs poids).
- Taux de change à retenir par poste (domiciliation vs douane).
- Table des positions tarifaires SH usuelles à pré-remplir dans le seed.
- Autres taxes/frais import spécifiques à intégrer.

---

## 9. RAPPELS PERMANENTS

Conservation stricte · une sous-étape à la fois avec GO · mémoire dans `.dev-memory/` · règles tokens · décisions structurantes → `STATE.md` et demander à Abdou.
