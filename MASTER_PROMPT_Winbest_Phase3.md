# MASTER PROMPT — WINBEST BACK-OFFICE / PHASE 3 (STOCK & CATALOGUE)

> Consigne unique de la Phase 3. Lire **d'abord** `.dev-memory/STATE.md`. Se greffe sur les Phases 0, 1 et 2 (les entrées de stock proviennent des commandes import et portent le coût de revient débarqué).

---

## 0. RÔLE, RÈGLE D'OR & PRÉREQUIS

Tu développes le module **Stock & Catalogue** : catalogue produits par familles, suivi par **numéro de série et garantie**, gestion **multi-dépôts** (Oran, Alger, véhicules de chantier) et mouvements valorisés au coût de revient.

**Règle d'or :** conservation stricte de l'existant. **Prérequis :** Phases 0, 1, 2 « Done ». Le coût de revient (Phase 2) alimente la valorisation.

---

## 1. OBJECTIF FONCTIONNEL

Catalogue pouvant atteindre plusieurs milliers de références (familles : caméras IP, NVR/DVR, contrôle d'accès, réseau & câblage, accessoires ; marques principales Hikvision, Dahua, etc.). Chaque équipement sérialisé est traçable de l'entrée en stock jusqu'à l'installation et le SAV, avec sa garantie. Le stock est valorisé au coût de revient débarqué.

---

## 2. MODÈLE DE DONNÉES — PHASE 3

Migrations additives ; `.dev-memory/SCHEMA.md` à jour. Prévoir des **index** (référence, numéro de série) vu le volume.

- **famille_produit** — id, code, libellé_fr, libellé_ar, parent_id (nullable, arborescence).
- **marque** — id, nom.
- **produit** *(article de catalogue)* — id, référence (unique), désignation_fr, désignation_ar, famille_id (FK), marque_id (FK), modèle, caractéristiques (JSON), unité, sérialisé (bool), prix_vente_indicatif, seuil_réappro, actif. *(Lié rétroactivement à `ligne_commande` de la Phase 2.)*
- **depot** — id, code (ORAN / ALGER / VEH-xx), libellé, type (magasin / véhicule chantier), site_id (FK).
- **stock** — id, produit_id (FK), depot_id (FK), quantité, cout_moyen_pondere_dzd. *(Un enregistrement par couple produit×dépôt.)*
- **article_serie** — id, produit_id (FK), numéro_série (unique), depot_id (FK, nullable), statut (en_stock / réservé / installé / en_sav / retourné / hs), commande_id (FK origine import), cout_revient_dzd, garantie_fournisseur_début, garantie_fournisseur_durée_mois, garantie_client_début, garantie_client_durée_mois, affaire_id (FK, nullable). *(Pour les produits sérialisés.)*
- **mouvement_stock** — id, type (entrée_import / sortie_chantier / sortie_vente / transfert / retour / ajustement_inventaire), produit_id (FK), depot_source_id (FK, nullable), depot_dest_id (FK, nullable), quantité, article_serie_id (FK, nullable), affaire_id (FK, nullable), cout_unitaire_dzd, date, user_id, référence_document, commentaire.
- **inventaire** — id, depot_id (FK), date, statut ; **ligne_inventaire** — inventaire_id, produit_id, quantité_théorique, quantité_comptée, écart.

---

## 3. RÈGLES MÉTIER

1. **Entrée en stock** depuis une réception de commande import (Phase 2) : crée les `mouvement_stock` type entrée + les `article_serie` pour les produits sérialisés, avec leur coût de revient.
2. **Valorisation** : coût moyen pondéré par produit×dépôt, recalculé à chaque entrée.
3. **Sortie chantier** (Phase 4) : décrémente le stock, change le statut des séries en `installé`, rattache à l'Affaire.
4. **Transfert** entre dépôts : sortie d'un dépôt + entrée dans l'autre, coût conservé.
5. **Unicité du numéro de série** ; un article sérialisé ne peut être à deux endroits.
6. **Alertes** de seuil de réapprovisionnement par produit.
7. **Inventaire** : écart théorique vs compté → mouvement d'ajustement tracé.
8. **Garanties** : à l'installation, démarrer la garantie client (durée paramétrable) ; consultable en SAV (Phase 4).

---

## 4. API & RBAC

Permissions : `catalogue:read/manage`, `stock:read`, `stock:move`, `serie:read/manage`, `depot:manage`, `inventaire:manage`.
Rôles : **Magasinier/stock** (tout), **Bureau d'études** (lecture catalogue), **Chef de chantier** (sorties chantier), **Import/achats** (entrées), **Direction** (lecture valorisation).
Routes : `/familles`, `/produits`, `/depots`, `/stocks`, `/series`, `/mouvements`, `/inventaires`. Recherche paginée et filtrée (indispensable vu le volume).

---

## 5. UI (bilingue FR/AR RTL)

- Catalogue arborescent par famille, recherche rapide par référence/désignation/marque.
- Fiche produit (caractéristiques, stock par dépôt, historique).
- Vue stock multi-dépôts, alertes de seuil.
- Suivi des articles sérialisés (recherche par numéro de série, statut, garantie).
- Écran mouvements (entrée / sortie / transfert) et inventaire.
- Import initial du catalogue via fichier tableur *(appliquer la skill xlsx pour le gabarit d'import)*.

---

## 6. SÉQUENCEMENT PAR SOUS-ÉTAPES (avec GO)

- **3.1** Modèles + migration : famille, marque, produit, depot (+ index).
- **3.2** API catalogue + import tableur de masse.
- **3.3** Stock (produit×dépôt) + valorisation coût moyen pondéré.
- **3.4** article_serie + garanties.
- **3.5** mouvement_stock (tous types) + rattachement Affaire + lien réception import (Phase 2).
- **3.6** Alertes de seuil + inventaire + ajustements.
- **3.7** UI catalogue / stock / séries / mouvements.
- **3.8** Seed (permissions, familles types) + démonstration ; revue et mémoire.

---

## 7. DEFINITION OF DONE — PHASE 3

1. Importer un lot de références par tableur ; le catalogue est navigable et filtrable.
2. Réceptionner une commande import → stock incrémenté, séries créées avec coût de revient et garanties.
3. Effectuer un transfert Oran→véhicule chantier et une sortie chantier ; les statuts de série suivent.
4. Une alerte de seuil se déclenche ; un inventaire génère un ajustement tracé.
5. Recherche par numéro de série retourne l'historique et la garantie.
6. RBAC respecté ; mouvements dans `audit_log` ; mémoire à jour.

---

## 8. POINTS À CONFIRMER (STATE.md)

- Familles et sous-familles standard à pré-remplir.
- Durées de garantie par défaut (fournisseur / client).
- Codes des dépôts et véhicules réels.
- Format du fichier d'import catalogue existant (colonnes).

---

## 9. RAPPELS PERMANENTS

Conservation stricte · GO par sous-étape · mémoire `.dev-memory/` · règles tokens · décisions → `STATE.md`.
