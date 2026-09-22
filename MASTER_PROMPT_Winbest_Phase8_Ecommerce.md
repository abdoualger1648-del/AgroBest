# MASTER PROMPT — WINBEST BACK-OFFICE / PHASE 8 (VITRINE & E-COMMERCE)

> Consigne unique de la Phase 8. Lire **d'abord** `.dev-memory/STATE.md`. Étend la Phase 7 (portail public) en une boutique en ligne. Se greffe sur les Phases 0, 3 (stock/catalogue), 5 (facturation). Développement piloté par la skill **`winbest-dev`**.

---

## 0. RÔLE, RÈGLE D'OR & PRÉREQUIS

Tu développes la **vitrine enrichie et la boutique en ligne (e-commerce)** de Win Best : catalogue public attractif, panier, commande, paiement (contexte algérien), livraison, **offres et packs**, le tout **synchronisé avec le stock interne** pour éviter la survente.

**Règle d'or :** conservation stricte de l'existant. **Prérequis :** Phases 0, 3, 5 « Done » ; Phase 7 recommandée (portail public) — la Phase 8 la prolonge, ne la remplace pas.

**Sécurité :** séparation stricte front public / back-office ; le public ne touche qu'aux données publiées, à son propre compte et à ses commandes. Aucune donnée de gestion (coûts, marges) exposée.

---

## 1. OBJECTIF FONCTIONNEL

Permettre à un client (particulier ou professionnel) de parcourir le catalogue, composer un panier, passer commande et payer **selon les usages algériens** : paiement à la livraison (dominant) et paiement en ligne par carte **CIB / Edahabia** via la passerelle **SATIM/e-paiement**. La disponibilité affichée et réservée s'appuie sur le stock réel (Phase 3), et la commande web s'intègre au circuit interne (facturation Phase 5, livraison, éventuellement Affaire).

> **Point de cadrage (à confirmer, §9) :** cible commerciale — grand public (B2C), professionnels (B2B), ou les deux ? L'activité principale reste les marchés publics ; l'e-commerce est un canal complémentaire.

---

## 2. SKILLS SPÉCIALISÉES À UTILISER

- **artifact-design** (+ **artifact-diagramming**) : concevoir les maquettes de la vitrine et du tunnel d'achat avant de coder (pages produit, panier, checkout), lisibles et responsives.
- **dataviz** : tableaux de bord ventes en ligne (CA, paniers, conversion, ruptures).
- **xlsx** : gabarits d'import/export catalogue et exports de commandes.
- **docx / pdf** (via Phase 5) : bons de commande, factures, bons de livraison.
Charger la skill **avant** d'écrire le code concerné, conformément à leur déclencheur.

---

## 3. MODÈLE DE DONNÉES — PHASE 8

Migrations Alembic additives ; `.dev-memory/SCHEMA.md` à jour ; index sur références et statuts.

### Comptes & catalogue e-commerce
- **compte_client_web** — id, type (particulier / professionnel), nom, raison_sociale (nullable), email (unique), téléphone, mot_de_passe_haché, client_id (FK interne, nullable), vérifié, date_création.
- **adresse_client** — id, compte_id (FK), libellé, wilaya, commune, adresse, téléphone, défaut (bool).
- **produit_ecommerce** — id, produit_id (FK catalogue Phase 3), publié (bool), prix_vente_ttc, prix_barré (promo), stock_affiché (dérivé), délai_dispo, images, description_fr, description_ar, mots_clés, note_moyenne. *(Le prix e-commerce est distinct du coût interne.)*

### Panier & commande
- **panier** — id, compte_id (FK, nullable pour invité), session, statut (actif / converti / abandonné), date.
- **ligne_panier** — id, panier_id (FK), produit_ecommerce_id (FK) ou pack_id (FK), quantité, prix_unitaire, remise.
- **commande_client_web** — id, numéro, compte_id (FK), statut (en_attente_paiement / payée / en_préparation / expédiée / livrée / annulée / retournée), montant_ht, tva, montant_ttc, frais_livraison, mode_paiement (cod / cib / edahabia), mode_livraison, adresse_id (FK), affaire_id (FK, nullable), facture_id (FK Phase 5, nullable), date.
- **ligne_commande_web** — id, commande_id (FK), produit_ecommerce_id / pack_id, désignation, quantité, prix_unitaire, remise, montant.
- **reservation_stock** — id, commande_id (FK), produit_id (FK), article_serie_id (FK, nullable), quantité, depot_id (FK), statut (réservée / servie / libérée). *(Verrou anti-survente ; lien mouvement_stock Phase 3 à l'expédition.)*

### Paiement & livraison (contexte Algérie)
- **paiement_en_ligne** — id, commande_id (FK), passerelle (satim), moyen (cib / edahabia), montant, statut (initié / réussi / échoué / remboursé), référence_transaction, date. *(COD ne crée pas de paiement en ligne : encaissement à la livraison.)*
- **livraison** — id, commande_id (FK), transporteur (paramétrable : Yalidine, ZR Express, E-Comexpress, retrait Oran/Alger…), numéro_suivi, frais, wilaya, statut (préparée / remise_transporteur / en_cours / livrée / retour), date.
- **frais_livraison_wilaya** — id, wilaya, transporteur, frais_domicile, frais_stopdesk, délai. *(Grille tarifaire par wilaya.)*

### Offres & packs
- **offre_promo** — id, libellé, type (remise_pourcent / remise_montant / livraison_offerte / pack), valeur, date_début, date_fin, conditions (JSON : montant mini, familles, quantités), active, cumulable (bool).
- **pack** — id, libellé_fr, libellé_ar, description, prix_pack_ttc, actif, image. **composition_pack** — pack_id (FK), produit_id (FK), quantité. *(Bundle « kit vidéosurveillance 4 caméras + NVR + disque » par ex.)*
- **code_promo** — id, code (unique), offre_id (FK), usage_max, usage_actuel, date_expiration, actif.
- **avis_produit** — id, produit_ecommerce_id (FK), compte_id (FK), note (1–5), commentaire, statut_modération (en_attente / publié / rejeté), date. *(Modéré avant publication.)*

---

## 4. RÈGLES MÉTIER

1. **Disponibilité stock-aware** : `stock_affiché` dérivé du stock réel (Phase 3) moins les réservations actives ; un produit en rupture n'est pas commandable (ou en précommande selon paramètre).
2. **Réservation** : la validation du panier réserve le stock ; le paiement réussi (ou la confirmation COD) confirme ; l'abandon/échec libère la réservation après délai.
3. **Anti-survente** : la somme des réservations ne dépasse jamais le stock disponible (contrôle transactionnel).
4. **Expédition** : passage à « expédiée » → sortie de stock réelle (mouvement Phase 3) et génération de la facture/bon de livraison (Phase 5).
5. **Paiement Algérie** : deux canaux — **paiement à la livraison (COD)** et **paiement en ligne CIB/Edahabia** via SATIM ; le mode COD dominant doit rester simple et fiable.
6. **Frais de livraison** calculés par wilaya et transporteur (domicile vs stop-desk), avec option livraison offerte selon offre.
7. **Packs** : prix groupé < somme des composants ; la commande d'un pack réserve chaque composant ; l'économie est affichée.
8. **Promotions** : appliquées selon période et conditions ; règles de cumul explicites ; codes promo à usage limité.
9. **Avis** modérés avant publication (anti-abus).
10. **Rattachement interne** : une commande web peut devenir une Affaire si le volume le justifie (B2B), sinon reste une vente au détail ; facturation conforme dans tous les cas (Phase 5).

---

## 5. API & RBAC

- **Public / client** (compte web) : catalogue, panier, checkout, ses commandes, ses avis. Sessions sécurisées, distinctes des comptes internes.
- **Interne** : `ecommerce:manage` (publication produits, prix), `commande_web:read/traiter`, `offre:manage`, `pack:manage`, `livraison:manage`, `avis:moderer`.
Rôles internes : **Commercial** (commandes web, offres), **Magasinier** (préparation, expédition, réservations), **Direction/Admin** (prix, packs, modération), **Comptabilité** (paiements, factures).
Routes publiques : `/api/shop/produits`, `/panier`, `/checkout`, `/paiement`, `/mes-commandes`. Routes internes : `/ecommerce/*`, `/commandes-web`, `/offres`, `/packs`, `/livraisons`, `/avis`.

---

## 6. FRONT BOUTIQUE (bilingue FR/AR RTL, responsive, mobile-first)

- Accueil marchand : mises en avant, packs, promotions.
- Catalogue filtrable (famille, marque, prix, disponibilité) + fiche produit (images, specs, avis, dispo).
- Panier, tunnel de commande en étapes (adresse → livraison → paiement → confirmation).
- Paiement : choix COD ou CIB/Edahabia ; page de statut post-paiement.
- Espace client : commandes, suivi de livraison, adresses, avis.
- Pages packs et offres dédiées.
Maquettes conçues avec **artifact-design** avant intégration. Mobile-first (l'essentiel du trafic e-commerce algérien est mobile).

---

## 7. SÉQUENCEMENT PAR SOUS-ÉTAPES (avec GO)

- **8.1** Maquettes (artifact-design) : vitrine, fiche produit, panier, checkout. Validation avant code.
- **8.2** Modèles + migration : compte_client_web, adresse, produit_ecommerce.
- **8.3** Catalogue e-commerce (publication, prix, dispo stock-aware) + API publique.
- **8.4** Panier + réservation de stock + anti-survente.
- **8.5** Commande + tunnel de checkout.
- **8.6** Paiement : COD + intégration SATIM (CIB/Edahabia) — abstraction passerelle.
- **8.7** Livraison : grille par wilaya, transporteurs, suivi ; expédition → sortie stock + facture (Phase 5).
- **8.8** Offres, packs, codes promo.
- **8.9** Avis modérés ; espace client.
- **8.10** Back-office e-commerce (commandes, préparation) + tableau de bord ventes (dataviz).
- **8.11** Seed + démonstration ; revue et mémoire.

---

## 8. DEFINITION OF DONE — PHASE 8

1. Un visiteur parcourt le catalogue, la disponibilité reflète le stock réel, un produit en rupture n'est pas commandable.
2. Commande en COD : le stock est réservé, la commande suit son cycle, l'expédition génère la sortie de stock et la facture.
3. Commande en ligne CIB/Edahabia : le paiement passe par SATIM, le statut se met à jour, l'échec libère la réservation.
4. Un pack applique son prix groupé et réserve ses composants ; une promo et un code promo s'appliquent selon leurs conditions.
5. Les frais de livraison varient par wilaya ; le suivi est visible côté client.
6. Aucune donnée interne exposée ; RBAC et anti-survente prouvés ; tableau de bord ventes fonctionnel.
7. Front bilingue FR/AR responsive mobile-first ; mémoire à jour.

---

## 9. POINTS À CONFIRMER (STATE.md)

- **Cible : B2C, B2B, ou les deux** (structure des prix et comptes).
- Contrat/accès **SATIM** (CIB/Edahabia) : disponible ? sinon COD d'abord, e-paiement ensuite.
- Transporteurs réels et grille de frais par wilaya.
- Politique de précommande sur rupture (autorisée ou non).
- Gestion des retours et remboursements.
- Prix e-commerce : affichage TTC, marges par rapport au coût de revient (interne, non exposé).

---

## 10. RAPPELS PERMANENTS

Conservation stricte · GO par sous-étape (maquettes validées avant code) · **séparation stricte public/interne** · **stock-aware anti-survente** · mémoire `.dev-memory/` · règles tokens · décisions → `STATE.md`.
